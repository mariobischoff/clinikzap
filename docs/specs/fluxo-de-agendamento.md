# Especificação do Fluxo de Agendamento

**Produto:** ClinikZap  
**Versão:** 1.0  
**Data:** 21 de maio de 2026  
**Autor:** John, Product Manager

---

## 1. Visão Geral

O fluxo de agendamento é a funcionalidade central do ClinikZap. Ele começa quando um paciente envia uma mensagem para o WhatsApp da clínica e termina quando a consulta é confirmada com envio de notificação. O fluxo é projetado para ser concluído em menos de 3 minutos, com o mínimo de atrito possível.

### 1.1 Diagrama de Alto Nível

```
 WhatsApp           ClinikZap                        ClinikZap          Evolution API
┌────────┐     ┌──────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│Paciente│────▶│  POST /webhook/  │────▶│ Cria Customer +     │────▶│ Envia link   │
│envia   │     │  whatsapp/       │     │ Appointment PENDING │     │ WhatsApp     │
│msg     │     │  [[...event]]    │     │                    │     │              │
└────────┘     └──────────────────┘     └──────────────────────┘     └──────────────┘
                                                                           │
                                                                           ▼
┌────────┐     ┌──────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│Paciente│     │ Navegador abre   │     │ 4-step Wizard        │     │ Confirmação  │
│clica   │────▶│ /schedule/[token]│────▶│ Data → Hora → Nome   │────▶│ CONFIRMED    │
│link    │     │                  │     │ → Sucesso            │     │              │
└────────┘     └──────────────────┘     └──────────────────────┘     └──────┬───────┘
                                                                            │
                                                                            ▼
                                                                     ┌──────────────┐
                                                                     │ WhatsApp     │
                                                                     │ confirmação  │
                                                                     │ enviada      │
                                                                     └──────────────┘
```

---

## 2. Fluxo Detalhado — Passo a Passo

### 2.1 Webhook — Recebimento da Mensagem

**Trigger:** Paciente envia qualquer mensagem para o número de WhatsApp da clínica.

**Arquivo:** `src/app/api/webhook/whatsapp/[[...event]]/route.ts`

**Processamento:**
1. Evolution API envia `POST` com payload `MESSAGES_UPSERT`
2. Validar estrutura mínima (`data.key` presente)
3. Extrair `remoteJid` e verificar se é chat privado (`@s.whatsapp.net`)
4. Ignorar grupos (`@g.us`), broadcasts (`@newsletter`, `@broadcast`)
5. Extrair telefone: `5511999999999@s.whatsapp.net` → `5511999999999`
6. Verificar `fromMe` (mensagem enviada pela clínica) → ativar human-takeover
7. Verificar silence mode (human-takeover ativo)
8. Verificar anti-flood lock (15 min TTL no Redis)
9. Aplicar lock anti-flood
10. Buscar ou criar Customer no banco
11. Verificar se paciente já tem agendamento ativo (PENDING ou CONFIRMED)
12. Se **tem agendamento ativo**: enviar mensagem contextual
13. Se **não tem**: criar Appointment PENDING + enviar link de agendamento

**Versão em Português (BR):**

| Condição | Mensagem enviada ao paciente |
|---|---|
| Já tem CONFIRMED | "Olá, [nome]! Identificamos que você já possui uma consulta confirmada para o dia [data]. Caso precise remarcar ou tirar dúvidas, por favor fale diretamente com o nosso atendente por aqui." |
| Já tem PENDING | "Olá, [nome]! Você já tem um agendamento em andamento. Para escolher o seu horário ou alterar seus dados, clique no link abaixo:\n\n[link]" |
| Novo paciente | "Olá, [nome]! Para realizar o agendamento da sua consulta na clínica [nome_clínica], escolha o seu horário clicando no link abaixo:\n\n[link]" |

### 2.2 Página de Agendamento — 4-Step Wizard

**Rota:** `GET /schedule/[token]`

**Arquivos:**
- `src/app/schedule/[token]/page.tsx` — Server Component (valida token)
- `src/app/schedule/[token]/scheduling-form.tsx` — Client Component (wizard)
- `src/app/schedule/actions.ts` — Server Actions

#### 2.2.1 Validação Inicial (Server Component)

| Cenário | Comportamento |
|---|---|
| Token inválido/não encontrado | Tela: "Link Inválido" — mensagem para contatar a clínica |
| Status CONFIRMED | Tela: "Consulta Já Agendada" — exibe data/hora, paciente, clínica |
| Status CANCELED | Tela: "Agendamento Cancelado" |
| Status PENDING | Renderiza `SchedulingForm` |

#### 2.2.2 Passo 1 — Seleção de Data

**Componente:** `scheduling-form.tsx` (step 1)

**Comportamento:**
- Exibe lista horizontal com os próximos 10 dias úteis (excluindo domingos)
- Cada card: nome do dia abreviado (seg, ter, qua...) + número do dia
- Primeiro dia disponível é pré-selecionado
- Ao selecionar uma data, avança para o próximo passo

**Regras:**
- Domingos são sempre bloqueados
- Dias sem horários configurados não aparecem (exceções que bloqueiam o dia inteiro)
- Feriados são configurados via `AvailabilityException` com `slots: []` (array vazio = dia bloqueado)

**UX:**
- Cards com efeito de escala e gradiente no selecionado
- Scroll horizontal com rolagem suave
- Botão "Escolher Horário" desabilitado se nenhuma data selecionada

#### 2.2.3 Passo 2 — Seleção de Horário

**Componente:** `scheduling-form.tsx` (step 2)

**Comportamento:**
- Exibe grid 3-colunas com os horários disponíveis para a data selecionada
- Slots são carregados via Server Action `getAvailableSlots(dateStr, userId)`
- Indicador de loading (skeleton) enquanto busca slots
- Botão para voltar e alterar data
- Botão "Confirmar Seus Dados" desabilitado se nenhum horário selecionado

**Estados:**
- **Carregando:** 6 skeletons animados no grid
- **Com horários:** grid de botões com horários disponíveis
- **Sem horários:** mensagem "Não há horários disponíveis para este dia. Por favor, selecione outra data."
- **Erro:** mensagem de erro "Erro ao carregar horários disponíveis."

#### 2.2.4 Passo 3 — Confirmação de Dados

**Componente:** `scheduling-form.tsx` (step 3)

**Comportamento:**
- Exibe resumo da consulta: clínica, data, horário
- Campo de nome do paciente (pré-preenchido com o nome do WhatsApp, editável)
- Botões: "Voltar" e "Confirmar Agendamento"
- Validação: nome não pode estar vazio

**Validações:**
- Nome com pelo menos 2 caracteres
- Nome não pode conter apenas espaços

#### 2.2.5 Passo 4 — Sucesso

**Componente:** `scheduling-form.tsx` (step 4)

**Comportamento:**
- Ícone de check animado (bounce)
- Mensagem: "Agendamento Confirmado! Tudo certo, [nome]!"
- Resumo completo: data, horário, paciente
- Nota: "Enviamos um comprovante com os detalhes para seu WhatsApp."
- Barra de progresso some (não faz sentido no passo de sucesso)

### 2.3 Confirmação — Server Action

**Função:** `confirmAppointment(token, dateStr, timeStr, customerName)`

**Arquivo:** `src/app/schedule/actions.ts`

**Transação:**
1. Buscar Appointment pelo token (inclui customer + user)
2. Validar que status é `PENDING`
   - Se não for: retornar erro "Este agendamento já foi finalizado ou cancelado."
3. Montar `finalDate` combinando `dateStr` (YYYY-MM-DD) e `timeStr` (HH:MM)
4. Executar transação Prisma:
   - `appointment.update`: setar `appointmentDate` e `status = CONFIRMED`
   - `customer.update`: atualizar nome do paciente (se editado)
5. Enviar WhatsApp de confirmação usando template
6. Retornar `{ success: true }`

**Tratamento de Erros:**
- Se WhatsApp falhar: log do erro, mas a transação não é revertida (confirmação persiste)
- Qualquer exceção: rollback implícito (Prisma transaction), retorna erro amigável

### 2.4 Envio de Confirmação WhatsApp

**Template padrão (se a clínica não customizou):**
```
Olá, *{nome_paciente}*!

Confirmamos seu agendamento na clínica *{nome_clinica}*:

📅 Data: *{data_consulta}*
⏰ Horário: *{hora_consulta}*

Seu agendamento foi salvo com sucesso!
```

**Variáveis disponíveis nos templates:**
| Variável | Descrição |
|---|---|
| `{nome_paciente}` | Nome do paciente (conforme editado no passo 3) |
| `{nome_clinica}` | Nome da clínica (do User) |
| `{data_consulta}` | Data formatada (ex: 25/05/2026) |
| `{hora_consulta}` | Horário formatado (ex: 14:30) |
| `{link_consulta}` | Link de agendamento (apenas para templates de PENDING) |

---

## 3. Algoritmo de Disponibilidade de Slots

**Função:** `getAvailableSlots(dateStr: string, userId: string): Promise<string[]>`

**Arquivo:** `src/app/schedule/actions.ts` (linhas 63-151)

### 3.1 Hierarquia de Resolução de Horários

```
                     ┌─────────────────────┐
                     │ Data específica tem  │
                     │ AvailabilityException│
                     └──────────┬──────────┘
                                │
                    ┌───────────┴───────────┐
                    │ SIM                   │ NÃO
                    ▼                       ▼
            ┌──────────────────┐   ┌────────────────────┐
            │ exception.slots  │   │ weeklyHours tem    │
            │ está definido?   │   │ horários para este │
            └──────┬───────────┘   │ dia da semana?     │
                   │               └────────┬───────────┘
         ┌─────────┴─────────┐      ┌───────┴────────┐
         │ [] vazio = dia    │      │ SIM            │ NÃO
         │ bloqueado         │      ▼                ▼
         │ outros = slots    │  ┌────────────┐ ┌──────────────┐
         │ customizados      │  │ Usar       │ │ Gerar a      │
         └───────────────────┘  │ weeklyHours│ │ partir de    │
                                │ [dia]      │ │ workingHours │
                                └────────────┘ │ + duration   │
                                               └──────────────┘
                                                    │
                                                    ▼
                              ┌──────────────────────────────────┐
                              │ Remover horários já agendados    │
                              │ (CONFIRMED no mesmo dia)          │
                              └──────────────────────────────────┘
```

### 3.2 Geração de Slots Padrão

Quando não há configuração semanal (`weeklyHours` vazio), os slots são gerados dinamicamente:

- **Manhã:** 08:00 às 12:00 (intervalos de `duration` minutos)
- **Tarde:** 13:00 às 18:00 (intervalos de `duration` minutos)
- **Duração padrão:** 30 minutos
- **Durações suportadas:** 30, 45, 60 minutos

### 3.3 Exemplo de Funcionamento

**Cenário:** Clínica configurou segunda-feira com `["08:00", "08:30", "09:00"]` e duração de 30 min.

- Data selecionada: 25/05/2026 (segunda-feira)
- Já existe CONFIRMED para 08:30
- Slots disponíveis retornados: `["08:00", "09:00"]`

### 3.4 Exceções de Disponibilidade

| Tipo | `slots` | Efeito |
|---|---|---|
| Bloqueio total (feriado) | `[]` | Dia inteiro bloqueado |
| Horário reduzido | `["08:00", "08:30", "09:00"]` | Apenas esses horários |
| Horário estendido | `["08:00", "09:00", ..., "20:00"]` | Horário customizado |

---

## 4. Máquina de Estados do Appointment

### 4.1 Diagrama de Estados

```
                  ┌──────────┐
                  │ PENDING  │
                  └────┬─────┘
                       │
            ┌──────────┼──────────┐
            │          │          │
            ▼          ▼          ▼
       ┌────────┐ ┌────────┐ ┌──────────┐
       │CONFIRM.│ │CANCELED│ │ PENDING  │
       │        │ │        │ │(reminder)│
       └───┬────┘ └────────┘ └──────────┘
           │
           ▼
      ┌────────┐
      │CANCELED│
      │(no-show│
      │ ou pós │
      │consulta│
      └────────┘
```

### 4.2 Transições Permitidas

| Estado Atual | Ação | Novo Estado | Gatilho |
|---|---|---|---|
| `PENDING` | Criar via webhook | `PENDING` | Paciente envia WhatsApp |
| `PENDING` | Confirmar agendamento | `CONFIRMED` | Paciente conclui wizard |
| `PENDING` | Cancelar (clínica) | `CANCELED` | API `/api/appointments/cancel` |
| `PENDING` | Reagendar | `CANCELED` + novo `PENDING` | API `/api/appointments/reschedule` |
| `CONFIRMED` | Cancelar (clínica) | `CANCELED` | API `/api/appointments/cancel` |

**Regras:**
- Uma vez `CANCELED`, não é possível reativar (apenas criar novo agendamento)
- `CONFIRMED` não pode voltar a `PENDING`
- Reagendamento cria um novo PENDING e cancela o anterior

### 4.3 Ciclo de Vida Completo

```
Envio WhatsApp → PENDING (link gerado)
                     │
                     ├─ (1h sem ação) → PENDING (ainda válido)
                     │
                     ├─ (24h sem ação) → PENDING (ainda válido, sem timeout)
                     │
                     ├─ Cliente clica link → PENDING → wizard
                     │                              │
                     │                              └─ Confirma → CONFIRMED
                     │                                           │
                     │                                           ├─ 24h antes → lembrete WhatsApp
                     │                                           │
                     │                                           ├─ Paciente comparece → consulta
                     │                                           │
                     │                                           └─ Clínica cancela → CANCELED
                     │
                     └─ Clínica cancela → CANCELED
```

**Nota:** Atualmente não há timeout para PENDING. Um link de agendamento permanece válido até ser usado ou cancelado. Isso pode ser revisto em versões futuras.

---

## 5. Cancelamento e Reagendamento

### 5.1 Cancelamento via Dashboard

**Endpoint:** `POST /api/appointments/cancel`

**Body:**
```json
{
  "token": "uuid-do-appointment"
}
```

**Fluxo:**
1. Buscar Appointment pelo token (inclui customer + user)
2. Validar que status é `PENDING` ou `CONFIRMED`
3. Atualizar status para `CANCELED`
4. Enviar WhatsApp de cancelamento

**Template padrão de cancelamento:**
```
Olá, *{nome_paciente}*.

Sua consulta na clínica *{nome_clinica}* agendada para *{data_consulta}* às *{hora_consulta}* foi cancelada.
```

### 5.2 Reagendamento via Dashboard

**Endpoint:** `POST /api/appointments/reschedule`

**Body:**
```json
{
  "appointmentId": "uuid-do-appointment"
}
```

**Fluxo:**
1. Buscar Appointment original
2. Validar que não está `CANCELED`
3. **Transação:** cancelar original + criar novo PENDING com placeholder de 7 dias
4. Enviar WhatsApp com novo link de agendamento

**Template de reagendamento:**
```
Olá, *{nome_paciente}*! Devido a um imprevisto na clínica, precisamos reagendar sua consulta com a clínica *{nome_clinica}*. Pedimos desculpas pelo transtorno. Por favor, acesse o link abaixo para escolher um novo horário conveniente para você:

{link_consulta}
```

---

## 6. Lembretes Automáticos (Cron)

**Endpoint:** `GET /api/cron/send-reminders`

**Execução:** Deve ser configurada no cron do servidor para rodar a cada 1 hora.

**Arquivo:** `src/app/api/cron/send-reminders/route.ts`

### 6.1 Algoritmo

1. Buscar todos `CONFIRMED` com `reminderSent = false` e `appointmentDate >= now`
2. Para cada appointment, calcular `hoursUntilAppointment`
3. Buscar `reminderHours` configurado na clínica (default: 24)
4. Verificar janela de disparo: `[reminderHours - 1.0, reminderHours + 1.5]`
   - Ex: se 24h, janela é [23h, 25.5h] antes da consulta
   - Janela larga garante que o cron horário não perca o disparo
5. Se estiver na janela: enviar WhatsApp e marcar `reminderSent = true`

### 6.2 Configuração do Cron

No crontab do servidor (ou gerenciador de tarefas):
```
0 * * * * curl -s https://app.clinikzap.com.br/api/cron/send-reminders
```

Para proteção, opcionalmente usar CRON_SECRET:
```
0 * * * * curl -s -H "Authorization: Bearer ${CRON_SECRET}" https://app.clinikzap.com.br/api/cron/send-reminders
```

### 6.3 Template Padrão de Lembrete
```
Olá, *{nome_paciente}*!

Este é um lembrete da sua consulta marcada na clínica *{nome_clinica}* para o dia *{data_consulta}* às *{hora_consulta}*.

Contamos com a sua presença! Se precisar reagendar ou cancelar, entre em contato.
```

---

## 7. Cenários de Erro e Edge Cases

### 7.1 Webhook

| Cenário | Comportamento | Código HTTP |
|---|---|---|
| Payload mal formatado | Log + ignorar | 200 |
| Mensagem de grupo | Log + ignorar | 200 |
| Mensagem de broadcast | Log + ignorar | 200 |
| Telefone inválido | Log + ignorar | 200 |
| Anti-flood ativo (15 min) | Log + ignorar | 200 |
| Human-takeover (1h) | Log + ignorar | 200 |
| Nenhuma clínica cadastrada | Log + responder | 200 |
| Erro interno no processamento | Log + responder | 500 |
| Falha ao enviar WhatsApp | Log (falha silenciosa) | 200 |

**Por que sempre retornar 200 para a Evolution API?** A Evolution API espera 200 para considerar o evento processado. Retornar 4xx/5xx pode fazer a Evolution reenviar o evento, causando duplicidade.

### 7.2 Página de Agendamento

| Cenário | Comportamento |
|---|---|
| Token inválido | Tela: "Link Inválido — entre em contato com a clínica" |
| Token expirado (não implementado) | — |
| Agendamento já confirmado | Tela: "Consulta Já Agendada" com detalhes |
| Agendamento cancelado | Tela: "Agendamento Cancelado" |
| Data sem horários disponíveis | Mensagem informativa + botão para voltar |
| Falha ao carregar slots | Mensagem de erro "Erro ao carregar horários disponíveis." |
| Concorrência (2 pacientes, mesmo horário) | Slot é removido após confirmação; segundo paciente recebe erro e pode escolher outro |
| Nome do paciente vazio | Validação client-side bloqueia confirmação |
| Falha no envio do WhatsApp | Confirmação é salva, log de erro (sem rollback) |

### 7.3 Cancelamento/Reagendamento

| Cenário | Comportamento | Código HTTP |
|---|---|---|
| Token não informado | Erro: "Token é obrigatório" | 400 |
| Appointment não encontrado | Erro: "Agendamento não encontrado" | 404 |
| Status já CANCELED | Erro: "Não é possível cancelar agendamento com status 'CANCELED'" | 400 |
| Falha no WhatsApp | Cancelamento é salvo, log de erro | 200 |
| Reagendamento de já cancelado | Erro: "Agendamento já está cancelado" | 400 |
| Session inválida (reschedule) | Erro: "Unauthorized" | 401 |

### 7.4 Cron de Lembretes

| Cenário | Comportamento |
|---|---|
| Sem CRON_SECRET configurado | Endpoint público (não recomendado em produção) |
| Appointment já com reminderSent = true | Ignorado (filtro na query) |
| Appointment no passado | Ignorado (filtro `appointmentDate >= now`) |
| Falha no envio do WhatsApp | Log de erro, `reminderSent` NÃO é atualizado |
| Appointments de múltiplas clínicas | Processado individualmente com template de cada clínica |

---

## 8. Mensagens e Templates

### 8.1 Variáveis Suportadas

| Chave | Descrição | Onde é usada |
|---|---|---|
| `{nome_paciente}` | Nome do paciente | Confirmação, cancelamento, lembrete |
| `{nome_clinica}` | Nome da clínica | Confirmação, cancelamento, lembrete, boas-vindas |
| `{data_consulta}` | Data formatada (pt-BR) | Confirmação, cancelamento, lembrete |
| `{hora_consulta}` | Horário formatado | Confirmação, cancelamento, lembrete |
| `{link_consulta}` | URL de agendamento | Boas-vindas, reagendamento |

### 8.2 Templates Customizáveis

A clínica pode personalizar os templates salvando no banco (`User` model):

```
user.confirmationTemplate   → String | null
user.cancellationTemplate   → String | null
user.reminderTemplate       → String | null
```

Se `null`, o template padrão é utilizado.

### 8.3 Parse de Template

**Função:** `parseTemplate(template: string, variables: Record<string, string>): string`

**Arquivo:** `src/utils/template-parser.ts`

Substitui todas as ocorrências de `{chave}` pelo valor correspondente. Se a variável não for encontrada, substitui por string vazia.

---

## 9. Considerações de UX

### 9.1 Mobile-First

A página de agendamento é projetada para dispositivos móveis (o paciente clica no link pelo WhatsApp no celular). Pontos de atenção:

- Layout responsivo, max-width de 500px
- Botões grandes e espaçados (alvo de toque mínimo 44px)
- Scroll horizontal para seleção de data (gesto natural em mobile)
- Grid 3 colunas para horários (cabe em qualquer tela)
- Sem popups ou modais que quebrem em mobile
- Animações sutis (não atrapalham performance)

### 9.2 Estados de Loading

- **Slots:** skeleton de 6 placeholders
- **Confirmação:** botão desabilitado com texto "Confirmando..."
- **Transição de passos:** animação suave via estado React (sem lib externa)

### 9.3 Tratamento de Erros para o Paciente

- Mensagens em português claro, sem jargão técnico
- Sugestão de ação: "Por favor, selecione outra data" ou "Entre em contato com a clínica"
- Cores: vermelho para erros, teal/verde para sucesso

---

## 10. Dependências e Integrações

| Componente | Depende de | Para quê |
|---|---|---|
| Webhook | Evolution API | Receber mensagens WhatsApp |
| Webhook | Redis | Anti-flood + human-takeover |
| Webhook | Prisma + PostgreSQL | CRUD Customer + Appointment |
| Scheduling Form | Server Actions | getAvailableSlots, confirmAppointment |
| Confirmação | Evolution API | Enviar WhatsApp |
| Cron | PostgreSQL | Buscar appointments |
| Cron | Evolution API | Enviar lembretes |
| Dashboard | Auth.js (session) | Autenticação do admin |
| Dashboard | Prisma + PostgreSQL | Listar/gerenciar dados |

---

## 11. Fluxo Alternativo — Agendamento Manual (Dashboard)

A clínica pode criar agendamentos manualmente para pacientes que ligam ou aparecem presencialmente.

**Função:** `createManualAppointment(data)`

**Arquivo:** `src/app/dashboard/actions.ts`

**Fluxo:**
1. Profissional preenche: data, horário, nome do paciente, telefone
2. Sistema busca ou cria Customer
3. Cria Appointment com status CONFIRMED (direto, sem PENDING)
4. Envia WhatsApp de confirmação
5. Se WhatsApp falhar: agendamento é salvo com warning (não bloqueia)

**Normalização de telefone:**
- Remove todos os caracteres não-dígito
- Se não começa com "55" e tem 10 ou 11 dígitos, prefixa com "55"

---

## 12. Aderência à LGPD

- O nome e telefone do paciente são armazenados apenas para fins de agendamento
- Não há armazenamento de conteúdo de mensagens WhatsApp
- O paciente pode solicitar exclusão de seus dados entrando em contato com a clínica
- A clínica é a controladora dos dados; o ClinikZap é o operador
