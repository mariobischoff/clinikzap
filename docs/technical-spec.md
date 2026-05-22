# Especificação Técnica Consolidada — ClinikZap

Este documento consolida a arquitetura de alto nível, os fluxos de dados do webhook, o algoritmo de disponibilidade de horários e os requisitos de segurança e deployment do ClinikZap.

---

## 1. Arquitetura do Sistema e Deploy

### 1.1 Diagrama de Arquitetura (Alta Disponibilidade Local)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET / VPS (Hetzner)                       │
│                                                                             │
│  ┌────────────┐    ┌───────────────────┐    ┌──────────────────────────┐   │
│  │  Paciente   │───▶│  Nginx Proxy      │───▶│  Next.js App (Port 3000) │   │
│  │  (WhatsApp) │    │  Manager (80/443)  │    │                          │   │
│  └────────────┘    └───────────────────┘    │  ┌────────────────────┐   │   │
│         │                                    │  │  API Routes        │   │   │
│         │                                    │  │  - Webhook         │   │   │
│         ▼                                    │  │  - Auth            │   │   │
│  ┌──────────────────────┐                    │  │  - Appointments    │   │   │
│  │  Evolution API v2.3  │                    │  │  - Cron            │   │   │
│  │  (Baileys Gateway)   │◀───────────────────│  │                    │   │   │
│  │                      │                    │  ├────────────────────┤   │   │
│  │  • Gerencia sessão   │                    │  │  Server Actions     │   │   │
│  │  • Envio/recepção    │                    │  │  - Schedule         │   │   │
│  │  • Webhook events    │                    │  │  - Dashboard        │   │   │
│  └──────────┬───────────┘                    │  └────────────────────┘   │   │
│             │                                │                          │   │
│             ▼                                │  ┌────────────────────┐   │   │
│  ┌──────────────────────┐                    │  │  Páginas            │   │   │
│  │  PostgreSQL 15        │◀───────────────────│  │  - /schedule/[token]│   │   │
│  │  (2 schemas)          │                    │  │  - /dashboard/*     │   │   │
│  │                      │                    │  │  - /login           │   │   │
│  │  • Schema: public    │                    │  └────────────────────┘   │   │
│  │  • Schema: evolution  │                    └──────────────────────────┘   │
│  └──────────┬───────────┘                                                    │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────┐                                                    │
│  │  Redis 7              │                                                    │
│  │                      │                                                    │
│  │  • Anti-flood lock   │                                                    │
│  │  • Human-takeover    │                                                    │
│  └──────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Infraestrutura Docker (Hetzner VPS)
Todos os serviços internos se comunicam dentro de uma rede Docker interna (`clinikzap-net-prod`), nunca expostos publicamente, exceto as portas 80/443 e SSH no host.

| Serviço | Imagem | Porta Interna | Função |
|---|---|---|---|
| `postgres` | `postgres:15-alpine` | 5432 | Banco de dados relacional (`public` e `evolution` schemas) |
| `redis` | `redis:7-alpine` | 6379 | Locks em memória para webhook e controle de tarefas |
| `evolution-api` | `evoapicloud/evolution-api:v2.3.1` | 8080 | Gateway WhatsApp |
| `app` | Dockerfile (Multi-stage build) | 3000 | Aplicação Next.js 15 |
| `nginx-proxy-manager` | `jc21/nginx-proxy-manager` | 80 / 443 | Proxy Reverso + SSL Automático Let's Encrypt |

---

## 2. Ciclo de Webhook (WhatsApp)

O webhook é o canal síncrono que recebe interações do paciente. Ele escuta o evento `MESSAGES_UPSERT` da Evolution API.

### 2.1 Fluxograma do Webhook
```
POST /api/webhook/whatsapp/[[...event]]
│
├─ 1. Validar payload mínimo (data.key existe?) ── Não ──▶ Retornar 200 (Ignora)
│
├─ 2. Extrair remoteJid e filtrar:
│   ├─ Grupo (@g.us), broadcast, newsletter ───── Sim ───▶ Retornar 200 (Ignora)
│   └─ Privado (@s.whatsapp.net) ──────────────── Não ───▶ Retornar 200 (Ignora)
│
├─ 3. Detectar Origem da Mensagem:
│   └─ fromMe = true (Enviado pelo consultório)
│       └─ Ativar silence:chat:{phone} no Redis (TTL: 1h) ──▶ Retornar 200 (Ignora)
│
├─ 4. Validar Locks no Redis:
│   ├─ silence:chat:{phone} existe? ───────────── Sim ───▶ Retornar 200 (Bypass bot)
│   ├─ lock:welcome:{phone} existe? (Flood) ───── Sim ───▶ Retornar 200 (Bypass bot)
│   └─ Sem locks ────────────────────────────────────────▶ Criar lock:welcome:{phone} (TTL: 15m)
│
├─ 5. Processamento no Banco (Prisma):
│   ├─ Buscar primeira clínica (User)
│   ├─ Buscar ou criar Customer por telefone + userId
│   └─ Verificar agendamentos ativos (PENDING ou CONFIRMED)
│
└─ 6. Enviar Resposta via WhatsApp:
    ├─ Se CONFIRMED ──▶ Enviar mensagem informando data/hora agendada
    ├─ Se PENDING ────▶ Reenviar link de agendamento (/schedule/[token])
    └─ Se NENHUM ─────▶ Criar Appointment PENDING + Enviar link de agendamento
```

### 2.2 Tratamento de Falhas (Resiliência)
*   **Retorno Fixo 200**: O webhook sempre retorna código 200 para evitar que a Evolution API realize retentativas infinitas de um mesmo evento.
*   **Redis Offline**: Em caso de falha de conexão com o Redis, o webhook captura o erro em bloco try/catch e executa o fluxo sem locks (degradação suave), priorizando o funcionamento do agendamento.

---

## 3. Fluxo de Agendamento do Paciente

### 3.1 Wizard Público (4 passos)
Hospedado na rota `/schedule/[token]`. O token é um identificador único (UUID).
1.  **Validação de Token (Server Side)**: Valida se o status é `PENDING`. Se for `CONFIRMED` ou `CANCELED`, renderiza a tela de status correspondente imediatamente.
2.  **Passo 1: Seleção de Data**: Exibe os próximos 10 dias úteis (exclui domingos e dias bloqueados).
3.  **Passo 2: Seleção de Horário**: Exibe grid de slots carregados dinamicamente via Server Action.
4.  **Passo 3: Confirmação de Nome**: Pré-preenchido com o `pushName` vindo do WhatsApp, permitindo edição.
5.  **Passo 4: Sucesso**: Exibe resumo visual e aciona envio assíncrono de mensagem de confirmação.

### 3.2 Hierarquia do Algoritmo de Horários Disponíveis
Ao buscar horários disponíveis para uma data `YYYY-MM-DD`:
1.  **Exceção de Agenda (`AvailabilityException`)**:
    *   Se existir exceção cadastrada com array de slots vazio (`[]`) ──▶ **Dia Bloqueado**.
    *   Se existir exceção com slots específicos ──▶ **Usa os slots da exceção**.
2.  **Horários Semanais Customizados (`weeklyHours` - JSON)**:
    *   Se houver slots para o dia da semana no JSON ──▶ **Usa os slots do JSON**.
3.  **Horários de Funcionamento Padrão (`workingHours` + `duration`)**:
    *   Gera slots dinamicamente baseados na duração da consulta (padrão 30 min) entre 08:00–12:00 e 13:00–18:00.
4.  **Filtro de Concorrência**:
    *   Filtra e remove todos os horários que coincidam com agendamentos de status `CONFIRMED` no mesmo dia.

### 3.3 Mitigação de Double-Booking
Para evitar que dois clientes agendem o mesmo horário simultaneamente, a Server Action `confirmAppointment` realiza a operação utilizando atualização baseada no padrão CAS (Compare-And-Swap):
```typescript
// Atualização atômica garante que apenas um cliente consiga confirmar o PENDING naquele slot
const result = await prisma.appointment.updateMany({
  where: {
    id: appointmentId,
    status: 'PENDING', // Garante que não foi confirmado em paralelo
  },
  data: {
    appointmentDate: finalDateTime,
    status: 'CONFIRMED',
  }
});
```

---

## 4. Lembrete Automático (Cron Job)

O endpoint de disparo é `GET /api/cron/send-reminders`.

*   **Execução**: Deve ser chamado de hora em hora via Cron local (`curl -s`).
*   **Segurança**: Protegido opcionalmente por Bearer token no Header (`Authorization: Bearer CRON_SECRET`).
*   **Lógica de Janela Temporal**: 
    *   Busca consultas com `status: CONFIRMED` e `reminderSent: false`.
    *   Verifica se o tempo restante até a consulta está na janela de disparo: `[reminderHours - 1.0, reminderHours + 1.5]` horas antes. O valor padrão de `reminderHours` é 24.
    *   Se estiver na janela, envia a mensagem e atualiza atômicamente `reminderSent = true` para evitar duplicidade.

---

## 5. Requisitos de Segurança

1.  **Autenticação**: NextAuth v5 (autenticação via credenciais + JWT) com cookies `HttpOnly`, `Secure` e proteção SameSite `Lax`.
2.  **Server Actions**: Todas as Server Actions restritas ao painel administrativo verificam a sessão do usuário chamando `auth()` antes de processar qualquer instrução.
3.  **Prevenção contra SQL Injection**: Uso estrito do Prisma ORM que parametriza todas as consultas por padrão.
4.  **Chaves e Secrets**: Todas as chaves (API Keys, senhas de banco) residem em variáveis de ambiente, nunca codificadas no repositório.
5.  **Exposição de Porta**: O PostgreSQL e Redis não expõem portas externamente no host da VPS, limitando-se à comunicação interna na rede do Docker.
