# Arquitetura do Sistema — ClinikZap

**Versão:** 1.0
**Última atualização:** Maio/2026
**Stack:** Next.js 15 App Router · React 19 · TypeScript (strict) · PostgreSQL 15 · Redis 7 · Evolution API v2

---

## 1. Diagrama de Arquitetura (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET / VPS                                 │
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
│  │  • Evolution cache   │                                                    │
│  └──────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Componentes e Suas Responsabilidades

### 2.1 Next.js App (Node 20)

Camada principal da aplicação, dividida em:

| Camada | Descrição | Tecnologia |
|--------|-----------|------------|
| **Páginas** | Renderização server-side e cliente | React 19 Server Components |
| **API Routes** | Endpoints REST para webhook, auth, cron | Next.js Route Handlers |
| **Server Actions** | Ações de formulário e mutação segura | Next.js Server Actions (`'use server'`) |
| **Serviços** | Lógica de negócio isolada (Evolution, templates) | TypeScript classes estáticas |
| **Middleware** | Proteção de rotas do dashboard | NextAuth middleware |

### 2.2 PostgreSQL 15

Banco relacional principal. Contém dois schemas:

- **`public`**: Dados da aplicação (User, Customer, Appointment, AvailabilityException)
- **`evolution`**: Gerenciado automaticamente pela Evolution API (sessões WhatsApp, mensagens, etc.)

### 2.3 Redis 7

Usado exclusivamente para:

- **Anti-flood**: Lock de 15 minutos (`lock:welcome:{phone}`) para evitar múltiplas respostas a um mesmo paciente
- **Human-takeover**: Silenciamento de 1 hora (`silence:chat:{phone}`) quando a secretária responde manualmente
- **Cache Evolution**: A Evolution API usa Redis para cache interno

### 2.4 Evolution API v2.3.1

Gateway WhatsApp baseado em Baileys (WebSocket). Responsabilidades:

- Manter sessão ativa do WhatsApp (QR Code / pairing)
- Receber mensagens via webhook (`POST /api/webhook/whatsapp`)
- Enviar mensagens via REST (`/message/sendText`)
- Gerenciar instâncias e configurações

---

## 3. Fluxos de Requisição

### 3.1 Ciclo Completo de Agendamento

```
Paciente                        ClinikZap                       Evolution API           WhatsApp
   │                                │                              │                     │
   │  (1) Envia msg no WhatsApp     │                              │                     │
   ├───────────────────────────────────────────────────────────────┼─────────────────────▶
   │                                │                              │                     │
   │                                │  (2) Webhook POST            │                     │
   │                                │◀─────────────────────────────┤                     │
   │                                │                              │                     │
   │                                │  (3) Valida payload          │                     │
   │                                │  (4) Ignora grupos/broadcast │                     │
   │                                │  (5) Verifica anti-flood     │                     │
   │                                │  (6) Verifica human-takeover │                     │
   │                                │                              │                     │
   │                                │  (7) Cria/retorna Customer   │                     │
   │                                │  (8) Cria Appointment (PENDING)                   │
   │                                │                              │                     │
   │                                │  (9) Envia link de agenda    │                     │
   │                                ├─────────────────────────────▶│                     │
   │                                │                              ├────────────────────▶
   │                                │                              │                     │
   │  (10) Clica no link           │                              │                     │
   ├───────────────────────────────▶│                              │                     │
   │                                │                              │                     │
   │  (11) Acessa /schedule/[token] │                              │                     │
   │  (12) Escolhe data/horário     │                              │                     │
   │  (13) Confirma agendamento     │                              │                     │
   │                                │                              │                     │
   │                                │  (14) Server Action: confirm │                     │
   │                                │  (15) Transaction Prisma     │                     │
   │                                │  (16) Envia confirmação      │                     │
   │                                ├─────────────────────────────▶│                     │
   │                                │                              ├────────────────────▶
   │                                │                              │                     │
   │  (17) Lembrete 24h antes      │                              │                     │
   │                                │  (18) Cron GET (cron job)    │                     │
   │                                │  (19) Busca appointments     │                     │
   │                                │  (20) Envia lembrete         │                     │
   │                                ├─────────────────────────────▶│                     │
   │                                │                              ├────────────────────▶
```

### 3.2 Fluxo do Webhook (Detalhado)

```
POST /api/webhook/whatsapp/[[...event]]
│
├─ 1. Parse JSON body
│
├─ 2. Validar estrutura (data.key existe?)
│   └─ Inválido → 200 { message: "Invalid payload structure" }
│
├─ 3. Extrair remoteJid e phone
│
├─ 4. Ignorar chats não-privados?
│   ├─ @g.us (grupo)     → Ignora
│   ├─ @newsletter       → Ignora
│   ├─ @broadcast        → Ignora
│   └─ @s.whatsapp.net   → Continua
│
├─ 5. fromMe = true?
│   ├─ Sim → Ativa silence:chat:{phone} (1h TTL) → Retorna
│   └─ Não → Continua
│
├─ 6. silence:chat:{phone} existe?
│   ├─ Sim → Retorna (secretária está atendendo)
│   └─ Não → Continua
│
├─ 7. lock:welcome:{phone} existe?
│   ├─ Sim → Retorna (anti-flood ativo)
│   └─ Não → Cria lock (15min TTL)
│
├─ 8. Buscar primeira clínica (User)
│   └─ Não encontrada → 200 { error: "No clinic registered" }
│
├─ 9. Customer já existe?
│   ├─ Sim → Verificar appointment ativo
│   │   ├─ CONFIRMED → Envia msg contextual de lembrete
│   │   └─ PENDING   → Reenvia link de agendamento
│   └─ Não → Criar Customer + Appointment PENDING → Envia welcome + link
│
└─ 10. Retorna 200 { message: "Webhook processed successfully" }
```

### 3.3 Fluxo de Agendamento Público

```
/schedule/[token]
│
├─ 1. Server Component: getAppointmentByToken(token)
│   ├─ Token inválido → Tela "Link Inválido"
│   ├─ CONFIRMED      → Tela "Consulta Já Agendada"
│   ├─ CANCELED       → Tela "Agendamento Cancelado"
│   └─ PENDING        → Renderiza SchedulingForm (Client Component)
│
│   SchedulingForm (3 etapas):
│   ├─ Step 1: Selecionar data (próximos 10 dias úteis, sem domingos)
│   ├─ Step 2: Selecionar horário (slots disponíveis via server action)
│   ├─ Step 3: Confirmar dados do paciente
│   └─ Step 4: Tela de sucesso
│
└─ Server Action: confirmAppointment(token, date, time, name)
    ├─ Valida token e status PENDING
    ├─ Transaction: update appointment + update customer name
    ├─ Envia confirmação via WhatsApp (template customizável)
    └─ Retorna { success: true }
```

---

## 4. Estrutura de Diretórios

```
src/
├── app/                           # Next.js App Router
│   ├── api/
│   │   ├── appointments/
│   │   │   ├── cancel/route.ts    # Cancelar agendamento
│   │   │   └── reschedule/route.ts # Reagendar (clínica)
│   │   ├── auth/[...nextauth]/    # NextAuth handlers
│   │   ├── cron/send-reminders/   # Lembrete automático
│   │   ├── webhook/whatsapp/[[...event]]/  # Webhook Evolution
│   │   └── whatsapp/              # (vazio - não utilizado)
│   ├── dashboard/                 # Painel administrativo
│   │   ├── actions.ts             # Server actions do dashboard
│   │   ├── page.tsx               # Página principal
│   │   ├── layout.tsx             # Layout com sidebar
│   │   └── *.tsx                  # Componentes do dashboard
│   ├── login/                     # Página de login
│   ├── schedule/[token]/          # Página pública de agendamento
│   │   ├── page.tsx               # Server component
│   │   ├── scheduling-form.tsx    # Client component (formulário)
│   │   └── actions.ts            # Server actions de agendamento
│   └── layout.tsx                 # Root layout
├── auth.ts                        # Config NextAuth (Credentials + JWT)
├── auth.config.ts                 # Auth config (Edge-safe)
├── middleware.ts                  # Middleware de proteção de rotas
├── components/                    # Componentes compartilhados
├── lib/
│   ├── prisma.ts                  # Singleton PrismaClient
│   └── redis.ts                   # Singleton Redis (ioredis)
├── services/
│   ├── evolution.ts               # Wrapper Evolution API REST
│   └── whatsapp.service.ts        # Facade para EvolutionService
├── types/                         # Declarações TypeScript
└── utils/
    └── template-parser.ts         # Substituição de variáveis em templates
```

---

## 5. Fluxo de Dados

### 5.1 Criação de Agendamento (via WhatsApp)

```
WhatsApp → Evolution API → Webhook → Prisma → Evolution API → WhatsApp
   ├── msg paciente     ├── POST       ├── Cria Customer
   │                    │   /api/      ├── Cria Appointment
   │                    │   webhook/   │   (PENDING)
   │                    │   whatsapp   │
   │                    │              └── sendTextMessage()
   │                    │                  ├── Template: "Olá, {nome}..."
   │                    │                  └── Link: /schedule/{token}
```

### 5.2 Confirmação de Agendamento (via Link)

```
Paciente → Next.js → Server Action → Prisma → Evolution API → WhatsApp
   ├── Acessa link    ├── getAppt    ├── UPDATE status     ├── sendText
   │   /schedule/     │   ByToken    │   = CONFIRMED       │   "Confirmamos
   │   {token}        │              │   UPDATE name        │    seu agendamento"
   │                  ├── getSlots   │
   │                  ├── confirm    │
```

### 5.3 Lembrete Automático (Cron)

```
Cron Job (VPS/crontab) → Next.js API → Prisma → Evolution API → WhatsApp
   ├── GET /api/cron/    ├── Query:       ├── sendText
   │   send-reminders    │   CONFIRMED    │   "Lembrete: sua
   │                     │   + reminder   │    consulta é amanhã"
   │   Auth: Bearer      │   Sent=false   │
   │   CRON_SECRET       │   + window     │   UPDATE reminderSent
   │                     │   de horas     │   = true
```

---

## 6. Arquitetura de Deployment

```
┌──────────────────────────────────────────────────┐
│                  VPS (Hetzner)                    │
│                                                    │
│  ┌──────────────────────────────────────────┐     │
│  │  Docker Compose (docker-compose.prod.yml) │     │
│  │                                            │     │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  │     │
│  │  │  Nginx    │  │  Next.js │  │  Redis  │  │     │
│  │  │  Proxy    │  │  App     │  │  7      │  │     │
│  │  │  Manager  │──▶│  (Node   │  │        │  │     │
│  │  │  (80/443) │  │   20)    │  └────────┘  │     │
│  │  └──────────┘  │  :3000    │               │     │
│  │       │        └──────────┘               │     │
│  │       │         ┌──────────┐  ┌────────┐  │     │
│  │       └────────▶│  Postgres│  │Evol.   │  │     │
│  │                  │  15      │  │ API    │  │     │
│  │                  │          │  │ v2.3   │  │     │
│  │                  └──────────┘  └────────┘  │     │
│  └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### 6.1 Serviços Docker

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| `postgres` | postgres:15-alpine | 5432 | Banco de dados |
| `redis` | redis:7-alpine | 6379 | Cache e locks |
| `evolution-api` | evoapicloud/evolution-api:v2.3.1 | 8080 | Gateway WhatsApp |
| `app` | Dockerfile (multi-stage) | 3000 | Next.js app |
| `nginx-proxy-manager` | jc21/nginx-proxy-manager | 80/443 | Reverse proxy + SSL |

### 6.2 Pipeline CI/CD

```
GitHub (main branch)
  │
  ├─ workflow_dispatch (manual)
  │
  ├─ GitHub Actions
  │   ├─ npm install
  │   ├─ npx prisma generate
  │   ├─ npm run build
  │   ├─ SCP → VPS
  │   └─ docker compose up -d --build
  │
  └─ VPS (Hetzner)
      ├─ Extrai tarball
      ├─ docker compose build
      └─ docker compose up -d
```

---

## 7. Decisões Técnicas

### Por que Next.js 15 App Router?
- Server Components para páginas públicas (SEO, performance)
- Server Actions para mutações seguras sem expor endpoints REST
- Route Handlers para webhooks e integrações externas
- Middleware nativo para proteção de rotas

### Por que Evolution API?
- Gateway WhatsApp baseado em Baileys (WebSocket)
- Suporte a múltiplas instâncias por API key
- Webhook por eventos (MESSAGES_UPSERT)
- Controle de sessão via QR Code

### Por que Redis para anti-flood?
- Operações atômicas (SET NX + TTL)
- Baixa latência para verificação síncrona no webhook
- Expiração automática (TTL) sem necessidade de cleanup

---

## 8. Observabilidade

Atualmente o sistema utiliza **logs estruturados no console** com prefixos por módulo:

| Prefixo | Módulo |
|---------|--------|
| `[Webhook WhatsApp]` | Webhook handler |
| `[Actions]` | Server actions de agendamento |
| `[Dashboard Actions]` | Server actions do dashboard |
| `[EvolutionService]` | Wrapper Evolution API |
| `[Appointment Cancel]` | Cancelamento |
| `[Appointment Reschedule]` | Reagendamento |
| `[Cron Reminders]` | Cron de lembretes |

> **Nota:** Não há sistema de monitoramento formal (APM, tracing ou métricas). Recomenda-se a implementação futura de Sentry ou similar para erro tracking.

## Changelog — Sprint 4 (Maio/2026)

### Testes
- Framework: Vitest com 24 testes (4 arquivos)
- Mock: Prisma mock + ioredis-mock (Redis mockado)
- Cobertura: template-parser, webhook handler, schedule actions, cron reminders
- Seed script: `prisma/seed.ts` com clínica, customer, appointments CONFIRMED + PENDING

### Correções de segurança
- Cancel/reschedule: agora exigem sessão ativa (`auth()`)
- Anti-flood lock: atômico com `SET NX` (elimina race condition)
- `confirmAppointment`: CAS com `updateMany` + `status: PENDING` no WHERE — elimina double-booking

### Correções de integridade
- Webhook: customer + appointment criados em transação (`$transaction`)
- Cron reminders: lock Redis distribuído (`SET NX`) + CAS no `reminderSent`
- Redis: fallback se Redis estiver indisponível (webhook não quebra)

### Banco de Dados
- Novos índices: `[userId+status+appointmentDate]` e `[status+reminderSent+appointmentDate]`
