# Diagramas de Arquitetura — ClinikZap

> **Propsito**: Este documento fornece uma visão visual completa da arquitetura do ClinikZap.
> Ele foi criado para que novos desenvolvedores entendam o sistema em **5 minutos**.
>
> **Última atualização**: Maio de 2026

---

## Índice

1. [Arquitetura de Alto Nível](#1-arquitetura-de-alto-nvel)
2. [Fluxo do Webhook (Mensagem WhatsApp)](#2-fluxo-do-webhook-mensagem-whatsapp)
3. [Fluxo de Agendamento (Paciente)](#3-fluxo-de-agendamento-paciente)
4. [Arquitetura de Deploy](#4-arquitetura-de-deploy)
5. [Diagrama de Entidade e Relacionamento (DER)](#5-diagrama-de-entidade-e-relacionamento-der)

---

## 1. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ┌──────────────┐       ┌──────────────────┐      ┌───────────────┐   │
│   │  WhatsApp     │<─────>│  Evolution API   │<────>│               │   │
│   │  Client       │       │  v2.3.1          │      │  Next.js 15   │   │
│   │  (Paciente)   │       │  (Baileys)       │      │  App Router   │   │
│   └──────────────┘       └──────────────────┘      │  + React 19   │   │
│         ▲                                           │               │   │
│         │                                           │  ┌─────────┐  │   │
│         │        ┌──────────────────────┐           │  │ Auth.js  │  │   │
│         │        │                      │           │  │ v5 beta  │  │   │
│         └────────┼──────────────────────┼───────────┘  └─────────┘  │   │
│                  │     Internet         │              └──────┬──────┘   │
│                  └──────────────────────┘                     │          │
│                                                               │          │
│                  ┌────────────────────────────────────────────┘          │
│                  │                                                       │
│                  ▼                                                       │
│        ┌──────────────────┐       ┌──────────────────┐                  │
│        │   PostgreSQL 15  │       │   Redis 7        │                  │
│        │   (Prisma ORM)   │       │   (ioredis)      │                  │
│        │                  │       │                  │                  │
│        │  - Usurios       │       │  - Anti-flood    │                  │
│        │  - Clientes      │       │    lock (900s)   │                  │
│        │  - Agendamentos  │       │  - Silêncio      │                  │
│        │  - Excees       │       │    humano (3600s) │                  │
│        └──────────────────┘       └──────────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                            ▲
                            │
                    ┌───────┴────────┐
                    │   Docker       │
                    │  Containers    │
                    └────────────────┘
```

### Componentes

| Componente | Tecnologia | Função |
|---|---|---|
| **WhatsApp Client** | Dispositivo real ou WhatsApp Web | Onde o paciente envia/recebe mensagens |
| **Evolution API** | `evoapicloud/evolution-api:v2.3.1` | Bridge WhatsApp-Baileys. Gerencia conexão, QR Code, webhooks e envio de mensagens |
| **Next.js App** | Next.js 15 + React 19 + TypeScript | Servidor web principal: interface de agendamento, dashboard, API REST |
| **Auth.js** | `next-auth@5.0.0-beta.25` | Autenticação de clinicas (Credentials Provider + JWT) |
| **PostgreSQL** | `postgres:15-alpine` | Banco de dados relacional (via Prisma ORM) |
| **Redis** | `redis:7-alpine` | Cache em memória para controle de flood e silêncio humano |
| **Docker** | Docker Compose v3.8 | Orquestração de containers (dev e prod) |

### Fluxo de Dados (visão macro)

```
  WhatsApp                  Evolution API                  Next.js App                    PostgreSQL
 ──────────               ──────────────                  ────────────                  ────────────
    │                          │                              │                              │
    │── Mensagem ─────────────>│                              │                              │
    │                          │── Webhook POST ─────────────>│                              │
    │                          │    /api/webhook/whatsapp     │                              │
    │                          │                              │── find/create Customer ────>│
    │                          │                              │── create PENDING Appt ─────>│
    │                          │                              │                              │
    │                          │<── sendText ─────────────────│                              │
    │<── Mensagem ─────────────│   (link de agendamento)      │                              │
    │                          │                              │                              │
    │   Paciente clica no link                                │                              │
    │── HTTP GET ────────────────────────────────────────────>│                              │
    │   /schedule/[token]                                    │── get appointment ─────────>│
    │                          │                              │                              │
    │── Escolhe data/hora ───────────────────────────────────>│                              │
    │   Server Action: confirmAppointment()                   │── update CONFIRMED ────────>│
    │                          │<── sendText ─────────────────│                              │
    │<── Confirmação ──────────│   (template personalizado)   │                              │
```

---

## 2. Fluxo do Webhook (Mensagem WhatsApp)

```
Paciente                          Evolution API                    Next.js                          Redis
────────                          ─────────────                    ───────                          ─────
  │                                    │                              │                               │
  │ ❶ Mensagem de texto                │                              │                               │
  │ ──────────────────────────────────>│                              │                               │
  │                                    │                              │                               │
  │                                    │ ❷ Webhook POST               │                               │
  │                                    │    MESSAGES_UPSERT           │                               │
  │                                    │ ────────────────────────────>│                               │
  │                                    │                              │                               │
  │                                    │              ╔════════════════╗                              │
  │                                    │              ║   VALIDAÇÃO   ║                              │
  │                                    │              ╚════════════════╝                              │
  │                                    │                              │                               │
  │                                    │     ❸ Payload tem data.key?  │                               │
  │                                    │     Se não → 200 (ignora)     │                               │
  │                                    │                              │                               │
  │                                    │     ❹ remoteJid contém       │                               │
  │                                    │        '@g.us' (grupo)?      │                               │
  │                                    │        '@newsletter' (broad)?│                               │
  │                                    │     Sim → 200 (ignora)        │                               │
  │                                    │                              │                               │
  │                                    │     ❺ fromMe = true?        │                               │
  │                                    │     (secretária respondendo) │                               │
  │                                    │                              │                               │
  │                                    │                    ╔══════════════════════╗                  │
  │                                    │                    ║   CONTROLE REDIS    ║                  │
  │                                    │                    ╚══════════════════════╝                  │
  │                                    │                              │                               │
  │                                    │     ❺ fromMe = true          │                               │
  │                                    │     ─────────────────────────>│                               │
  │                                    │                              │── SET silence:chat:phone ───>│
  │                                    │                              │    TTL: 3600s (1 hora)       │
  │                                    │                              │                               │
  │                                    │     ❻ silence:chat existe?   │                               │
  │                                    │     ─────────────────────────>│                               │
  │                                    │                              │── EXISTS silence:chat:phone ─>│
  │                                    │                              │<── Sim/Não ──────────────────│
  │                                    │                              │                               │
  │                                    │     ❼ lock:welcome existe?  │                               │
  │                                    │     (anti-flood 15 min)      │                               │
  │                                    │     ─────────────────────────>│                               │
  │                                    │                              │── EXISTS lock:welcome:phone ─>│
  │                                    │                              │<── Sim/Não ──────────────────│
  │                                    │                              │                               │
  │                                    │     ❽ Se liberado,           │                               │
  │                                    │     cria lock:welcome:phone  │                               │
  │                                    │     ─────────────────────────>│                               │
  │                                    │                              │── SET lock:welcome:phone ───>│
  │                                    │                              │    TTL: 900s (15 min)        │
  │                                    │                              │                               │
  │                                    │              ╔════════════════╗                              │
  │                                    │              ║   BANCO DE    ║                              │
  │                                    │              ║    DADOS      ║                              │
  │                                    │              ╚════════════════╝                              │
  │                                    │                              │                               │
  │                                    │     ❾ Busca primeira         │                               │
  │                                    │     clínica (User)           │                               │
  │                                    │     ─────────────────────────>├── prisma.user.findFirst ────>│
  │                                    │                              │<── clinic ───────────────────│
  │                                    │                              │                               │
  │                                    │    ❿ Find/Create Customer   │                               │
  │                                    │      por phone + userId      │                               │
  │                                    │     ─────────────────────────>├── prisma.customer ─────────>│
  │                                    │                              │<── customer ─────────────────│
  │                                    │                              │                               │
  │                                    │    ⓫ Tem agendamento ativo? │                               │
  │                                    │       (PENDING OU CONFIRMED) │                               │
  │                                    │     ─────────────────────────>├── prisma.appointment ──────>│
  │                                    │                              │<── activeAppt ou null ──────│
  │                                    │                              │                               │
  │                                    │            ╔══════════════════╗                              │
  │                                    │            ║   RAMIFICAÇÃO   ║                              │
  │                                    │            ╚══════════════════╝                              │
  │                                    │                              │                               │
  │                                    │     ┌─── activeAppt existe? ──┐                            │
  │                                    │     │                        │                              │
  │                                    │    SIM                      NÃO                             │
  │                                    │     │                        │                              │
  │                                    │     ▼                        ▼                              │
  │                                    │  CONFIRMED?             Cria Customer                       │
  │                                    │   /          \          (se não existe)                     │
  │                                    │  Sim         Não                                           │
  │                                    │   │            │         Cria Appointment                   │
  │                                    │   ▼            ▼          PENDING                          │
  │                                    │ Msg c/      Reenvia                                        │
  │                                    │ data e      link de        Gera link:                       │
  │                                    │ horário     agendamento    /schedule/[token]               │
  │                                    │                              │                               │
  │                                    │    ⓬ Envia mensagem         │                               │
  │                                    │       WhatsApp              │                               │
  │                                    │<─────────────────────────────│                               │
  │                                    │                              │                               │
  │ ⓬ Mensagem WhatsApp                │                              │                               │
  │<────────────────────────────────────│                              │                               │
  │                                    │                              │                               │
  │                                    │    ⓭ Retorna 200            │                               │
  │                                    │<─────────────────────────────│                               │
```

### Resumo do Fluxo (passo a passo)

| Passo | Ação | Local | Detalhes |
|---|---|---|---|
| **❶** | Paciente envia mensagem | WhatsApp | Qualquer texto para o número da clínica |
| **❷** | Evolution API dispara webhook | Evolution → Next.js | `POST /api/webhook/whatsapp/[[...event]]` |
| **❸** | Valida payload | Next.js | Verifica se `data.key` existe |
| **❹** | Ignora grupo/broadcast | Next.js | Filtra `@g.us`, `@newsletter`, `@broadcast` |
| **❺** | Human-takeover detection | Next.js + Redis | Se `fromMe=true`, põe chat em silêncio por 1h |
| **❻** | Verifica silêncio | Redis | Se `silence:chat:phone` existe, ignora a mensagem |
| **❼** | Anti-flood check | Redis | Se `lock:welcome:phone` existe (15 min), ignora |
| **❽** | Cria lock anti-flood | Redis | `SET lock:welcome:phone EX 900` |
| **❾** | Busca clínica | PostgreSQL | `prisma.user.findFirst()` — pega o primeiro User |
| **❿** | Find/Create Customer | PostgreSQL | Busca por `phone + userId`, cria se não existir |
| **⓫** | Checa agendamento ativo | PostgreSQL | `Appointment` com status `PENDING` ou `CONFIRMED` |
| **⓬** | Envia resposta via WhatsApp | Next.js → Evolution | `EvolutionService.sendTextMessage()` |
| **⓭** | Retorna HTTP 200 | Next.js → Evolution | Confirma recebimento do webhook |

### Chaves Redis Utilizadas

| Chave | Formato | TTL | Finalidade |
|---|---|---|---|
| `lock:welcome:{phone}` | `lock:welcome:5511999999999` | 900s (15 min) | Anti-flood: impede múltiplos agendamentos para mesma pessoa |
| `silence:chat:{phone}` | `silence:chat:5511999999999` | 3600s (1 hora) | Modo silêncio: secretária assumiu o atendimento |

---

## 3. Fluxo de Agendamento (Paciente)

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                            │
│   PACIENTE                                       NEXT.JS APP                              │
│   ────────                                       ───────────                              │
│                                                                                            │
│       │                                               │                                    │
│       │  ❶ Recebe link no WhatsApp                    │                                    │
│       │     https://app/schedule/[token]              │                                    │
│       │──────────────────────────────────────────────>│                                    │
│       │                                               │                                    │
│       │                                               │  ❷ Server: getAppointmentByToken() │
│       │                                               │     prisma.appointment.findUnique  │
│       │                                               │     (valida token, status, dados)  │
│       │                                               │                                    │
│       │                                               ├── Token inválido?                  │
│       │                                               │   → Tela "Link Inválido"           │
│       │                                               │                                    │
│       │                                               ├── Já CONFIRMADO?                   │
│       │                                               │   → Tela "Já Agendado"             │
│       │                                               │                                    │
│       │                                               ├── CANCELADO?                      │
│       │                                               │   → Tela "Agendamento Cancelado"   │
│       │                                               │                                    │
│       │                                               └── PENDING → SchedulingForm        │
│       │                                                                                    │
│       │               ╔═══════════════════════════════════════════════╗                    │
│       │               ║       STEP 1: SELECIONAR DATA                ║                    │
│       │               ╚═══════════════════════════════════════════════╝                    │
│       │                                               │                                    │
│       │  ❸ Escolhe uma data                           │                                    │
│       │     (date picker calendário)                  │                                    │
│       │──────────────────────────────────────────────>│                                    │
│       │                                               │                                    │
│       │               ╔═══════════════════════════════════════════════╗                    │
│       │               ║       STEP 2: SELECIONAR HORÁRIO             ║                    │
│       │               ╚═══════════════════════════════════════════════╝                    │
│       │                                               │                                    │
│       │                                               │  ❹ Server: getAvailableSlots()    │
│       │                                               │     Busca weeklyHours do User      │
│       │                                               │     Verifica AvailabilityException │
│       │                                               │     Busca slots já agendados       │
│       │                                               │     Retorna slots disponíveis      │
│       │                                               │                                    │
│       │  ❺ Recebe lista de horários                   │                                    │
│       │     [08:00, 08:30, 09:00, ...]                │                                    │
│       │<──────────────────────────────────────────────│                                    │
│       │                                               │                                    │
│       │  ❻ Escolhe um horário                         │                                    │
│       │──────────────────────────────────────────────>│                                    │
│       │                                               │                                    │
│       │               ╔═══════════════════════════════════════════════╗                    │
│       │               ║       STEP 3: CONFIRMAR NOME                  ║                    │
│       │               ╚═══════════════════════════════════════════════╝                    │
│       │                                               │                                    │
│       │  ❼ Visualiza nome (vindo do pushName)         │                                    │
│       │     Pode editar se estiver errado             │                                    │
│       │──────────────────────────────────────────────>│                                    │
│       │                                               │                                    │
│       │               ╔═══════════════════════════════════════════════╗                    │
│       │               ║       STEP 4: CONFIRMAR E ENVIAR             ║                    │
│       │               ╚═══════════════════════════════════════════════╝                    │
│       │                                               │                                    │
│       │  ❽ Clica em "Confirmar Agendamento"           │                                    │
│       │──────────────────────────────────────────────>│                                    │
│       │                                               │                                    │
│       │                                               │  ❾ Server Action:                 │
│       │                                               │     confirmAppointment()           │
│       │                                               │                                    │
│       │                                               │     ├── Valida token               │
│       │                                               │     ├── Valida status PENDING      │
│       │                                               │     ├── Transaction:                │
│       │                                               │     │  ├── UPDATE appointment       │
│       │                                               │     │  │    SET status=CONFIRMED    │
│       │                                               │     │  │    SET appointmentDate     │
│       │                                               │     │  └── UPDATE customer          │
│       │                                               │     │       SET name=nomeEditado   │
│       │                                               │     │                              │
│       │                                               │     ├── Gera mensagem com template │
│       │                                               │     │    personalizado do User     │
│       │                                               │     │                              │
│       │                                               │     └── EvolutionService           │
│       │                                               │         .sendTextMessage(phone,    │
│       │                                               │          confirmationText)         │
│       │                                               │                                    │
│       │                                               │                                    │
│       │               ╔═══════════════════════════════════════════════╗                    │
│       │               ║            TELA DE SUCESSO                    ║                    │
│       │               ╚═══════════════════════════════════════════════╝                    │
│       │                                               │                                    │
│       │ ❿ Tela: "Agendamento Confirmado!"             │                                    │
│       │<──────────────────────────────────────────────│                                    │
│       │     Mostra data e horário                     │                                    │
│       │                                               │                                    │
│       │                                               │                                    │
│       │ ⓫ Mensagem WhatsApp de confirmação            │                                    │
│       │     "Olá, João! Confirmamos seu               │                                    │
│       │      agendamento na Clínica...                 │                                    │
│       │      Data: 20/05/2026                          │                                    │
│       │      Horário: 14:00"                           │                                    │
│       │<──────────────────────────────────────────────│                                    │
│       │                                               │                                    │
│       │                                               │        ┌──────────────────┐        │
│       │                                               │        │  STATUS AGORA:   │        │
│       │                                               │        │  CONFIRMED ✓     │        │
│       │                                               │        └──────────────────┘        │
│       │                                               │                                    │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Estados de um Agendamento

```
                  ┌──────────┐
                  │ PENDING  │ ◄──── Criado pelo webhook (paciente mandou msg)
                  └────┬─────┘
                       │
                       │ Paciente acessa link e confirma
                       ▼
                  ┌──────────┐
                  │CONFIRMED │ ◄──── Agendamento válido
                  └────┬─────┘
                       │
                       │ Cancelamento manual (dashboard)
                       ▼
                  ┌──────────┐
                  │ CANCELED │
                  └──────────┘
```

### Templates de Mensagem (customizáveis por clínica)

| Template | Padrão | Variáveis |
|---|---|---|
| `confirmationTemplate` | `"Olá, {nome_paciente}! Confirmamos seu agendamento na {nome_clinica} para {data_consulta} às {hora_consulta}."` | `{nome_paciente}`, `{nome_clinica}`, `{data_consulta}`, `{hora_consulta}` |
| `reminderTemplate` | `"Olá, {nome_paciente}! Lembrete: consulta em {nome_clinica} dia {data_consulta} às {hora_consulta}."` | (mesmas variáveis) |
| `cancellationTemplate` | Template de cancelamento (não implementado no padrão) | (mesmas variáveis) |

### Regras de Disponibilidade

```
weeklyHours (JSON)          AvailabilityException (tabela)
─────────────────          ──────────────────────────────
{                           Se existe registro para a data:
  "1": ["08:00","09:00",    │
        "10:00"],           ├── slots vazio → dia bloqueado
  "3": ["13:00","14:00"],   └── slots preenchidos → substitui
  "5": ["08:00","09:00",          weeklyHours para aquele dia
        "10:00","11:00",
        "14:00","15:00"]    Se NÃO existe exceção:
}                           └── Usa weeklyHours[dayOfWeek]

Se weeklyHours for null:    Se não tem weeklyHours nem exceção:
└── Usa workingHours        └── Gera slots com base em duration
    (array padrão)               (08h-12h e 13h-18h a cada N min)
```

---

## 4. Arquitetura de Deploy

### 4.1 Ambiente de Desenvolvimento (Local)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SEU COMPUTADOR (localhost)                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Docker Compose (dev)                       │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │  PostgreSQL   │  │    Redis     │  │  Evolution API   │   │   │
│  │  │  15-alpine    │  │  7-alpine    │  │  v2.3.1          │   │   │
│  │  │  porta: 5432  │  │  porta: 6379 │  │  porta: 8080     │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Next.js Dev Server (npm run dev)                 │   │
│  │              http://localhost:3000                            │   │
│  │              Porta 3000 (fora do Docker)                      │   │
│  │                                                              │   │
│  │  ● page.tsx          → /login, /register, /dashboard         │   │
│  │  ● schedule/[token]  → Página pública de agendamento         │   │
│  │  ● API Routes        → Webhook, Cron, Auth, Appointments     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Para testar webhook com WhatsApp real:                             │
│    npx localtunnel --port 3000                                      │
│    ou ssh -p 443 -R0:localhost:3000 qr@a.pinggy.io                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Arquivo**: `docker-compose.yml`
**Comando**: `docker compose up -d` + `npm run dev`

### 4.2 Ambiente de Produção (VPS)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        VPS — Linux (Ubuntu/Debian)                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Docker Compose (produção)                     │   │
│  │                                                                  │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │   │
│  │  │   PostgreSQL   │  │    Redis       │  │  Evolution API   │   │   │
│  │  │  15-alpine     │  │  7-alpine      │  │  v2.3.1          │   │   │
│  │  │  (sem porta    │  │  (sem porta    │  │  (sem porta      │   │   │
│  │  │   externa)     │  │   externa)     │  │   externa)       │   │   │
│  │  └────────────────┘  └────────────────┘  └──────────────────┘   │   │
│  │                                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  Next.js App (container)                                 │   │   │
│  │  │  porta interna: 3000                                     │   │   │
│  │  │  ─────────────────────────────────────                   │   │   │
│  │  │  Dockerfile: builder → runner                            │   │   │
│  │  │  ├── Stage 1: npm install, prisma generate, build        │   │   │
│  │  │  └── Stage 2: node:20-alpine, prisma migrate deploy,    │   │   │
│  │  │             npm run start                                 │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  Nginx Proxy Manager (jc21/nginx-proxy-manager)          │   │   │
│  │  │  portas: 80 (HTTP), 443 (HTTPS), 81 (Admin)             │   │   │
│  │  │  ─────────────────────────────────────                   │   │   │
│  │  │  ● Proxy reverso para app:3000                           │   │   │
│  │  │  ● SSL/TLS com Let's Encrypt automático                  │   │   │
│  │  │  ● Domínio: clinikzap.mariotech.com.br                   │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  │  Rede interna: clinikzap-net-prod (bridge)                       │   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Firewall:                                                                │
│    ├── 80/tcp  — HTTP (redireciona para 443)                            │
│    ├── 443/tcp — HTTPS (app)                                            │
│    └── 22/tcp  — SSH (admin)                                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Arquivo**: `docker-compose.prod.yml`
**Comando**: `docker compose -f docker-compose.prod.yml up -d --build`

### 4.3 Pipeline CI/CD (GitHub Actions)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  GitHub Actions — deploy.yml                            │
│                                                                         │
│  Trigger: workflow_dispatch (manual)                                    │
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────────┐    │
│  │ Checkout │───>│ Setup    │───>│ npm      │───>│ prisma        │    │
│  │ Code     │    │ Node 22  │    │ install  │    │ generate      │    │
│  └──────────┘    └──────────┘    └──────────┘    └───────────────┘    │
│                                                         │              │
│                                                         ▼              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────────┐    │
│  │ Deploy   │<───│ Upload   │<───│ Package  │<───│ npm run build │    │
│  │ VPS      │    │ SCP      │    │ tar.gz   │    │ (teste)       │    │
│  └──────────┘    └──────────┘    └──────────┘    └───────────────┘    │
│       │                                                               │
│       ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ssh root@VPS_IP                                               │    │
│  │   tar -xzf clinikzap.tar.gz -C /root/clinikzap               │    │
│  │   cd /root/clinikzap                                         │    │
│  │   docker compose -f docker-compose.prod.yml up -d --build    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  Variáveis de ambiente (GitHub Secrets):                                │
│    ├── VPS_SSH_KEY      — Chave privada SSH                            │
│    ├── VPS_IP           — Endereço IP do servidor                      │
│    ├── POSTGRES_PASSWORD— Senha do PostgreSQL                          │
│    ├── EVOLUTION_API_KEY— Chave da API Evolution                       │
│    └── AUTH_SECRET      — Secreta de encriptação do NextAuth          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Comparativo Dev vs Prod

| Aspecto | Dev | Produção |
|---|---|---|
| **App Next.js** | Fora do Docker (`npm run dev`) | Container Docker (`Dockerfile`) |
| **PostgreSQL porta** | `5432` exposta | Sem porta externa |
| **Redis** | `6379` exposta | Apenas rede interna |
| **Evolution API** | `8080` exposta | Apenas rede interna |
| **Nginx** | Não | Nginx Proxy Manager (SSL) |
| **Domínio** | `localhost:3000` | `clinikzap.mariotech.com.br` |
| **Envio WhatsApp** | Log no console (default) | Envio real |
| **Ambiente** | `NODE_ENV=development` | `NODE_ENV=production` |

---

## 5. Diagrama de Entidade e Relacionamento (DER)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                            User                                      │   │
│  │                          (Clínica)                                   │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  id                String  @id @default(uuid())                      │   │
│  │  email             String  @unique                                   │   │
│  │  password          String  (hash)                                    │   │
│  │  name              String                                            │   │
│  │  createdAt         DateTime  @default(now())                         │   │
│  │  updatedAt         DateTime  @updatedAt                              │   │
│  │  workingHours      String[] @default([...])                          │   │
│  │  weeklyHours       Json?   { "1": ["08:00","09:00"], ... }          │   │
│  │  duration          Int     @default(30)  (minutos por slot)          │   │
│  │  confirmationTemplate String?   (template WhatsApp)                  │   │
│  │  cancellationTemplate String?   (template WhatsApp)                  │   │
│  │  reminderTemplate  String?   (template WhatsApp)                     │   │
│  │  reminderHours     Int     @default(24)  (horas antes)               │   │
│  │                                                                      │   │
│  └────────┬─────────────────────────────────────────────────────────────┘   │
│           │                                                                │
│           │ 1                                                              │
│           │                                                                │
│           ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Customer                                    │   │
│  │                         (Paciente)                                  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  id                String  @id @default(uuid())                      │   │
│  │  name              String                                            │   │
│  │  phone             String  (E.164: +5511999999999)                   │   │
│  │  userId            String  (FK → User.id)                            │   │
│  │  notes             String? (observações internas)                    │   │
│  │  createdAt         DateTime  @default(now())                         │   │
│  │  updatedAt         DateTime  @updatedAt                              │   │
│  │                                                                      │   │
│  │  @@unique([phone, userId])   (mesmo telefone, clínica diferente OK)  │   │
│  │                                                                      │   │
│  └────────┬─────────────────────────────────────────────────────────────┘   │
│           │                                                                │
│           │ N                                                              │
│           ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Appointment                                   │   │
│  │                      (Agendamento)                                  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  id                String  @id @default(uuid())                      │   │
│  │  customerId        String  (FK → Customer.id)                        │   │
│  │  userId            String  (FK → User.id)                            │   │
│  │  appointmentDate   DateTime                                          │   │
│  │  status            AppointmentStatus  (PENDING/CONFIRMED/CANCELED)   │   │
│  │  token             String  @unique @default(uuid())                  │   │
│  │  reminderSent      Boolean @default(false)                           │   │
│  │  createdAt         DateTime  @default(now())                         │   │
│  │  updatedAt         DateTime  @updatedAt                              │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│           ┌────────────────────────────────────────────────────────┐        │
│           │                    AvailabilityException               │        │
│           │                    (Exceção de Disponibilidade)        │        │
│           ├────────────────────────────────────────────────────────┤        │
│           │                                                        │        │
│           │  id                String  @id @default(uuid())        │        │
│           │  userId            String  (FK → User.id)              │        │
│           │  date              String  ("YYYY-MM-DD")              │        │
│           │  slots             String[] (vazio = dia bloqueado)    │        │
│           │  createdAt         DateTime  @default(now())           │        │
│           │  updatedAt         DateTime  @updatedAt                │        │
│           │                                                        │        │
│           │  @@unique([userId, date])   (só uma exceção por dia)   │        │
│           │                                                        │        │
│           └────────────────────────────────────────────────────────┘        │
│                          ▲                                                  │
│                          │                                                  │
│                          │ N                                                │
│                          │                                                  │
│                          └──────── 1 ───────── User ─────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Relacionamentos

| Origem | Destino | Tipo | Campo de Ligação | Comportamento |
|---|---|---|---|---|
| **User** (1) | **Customer** (N) | Um-para-muitos | `Customer.userId` → `User.id` | `onDelete: Cascade` |
| **User** (1) | **Appointment** (N) | Um-para-muitos | `Appointment.userId` → `User.id` | `onDelete: Cascade` |
| **User** (1) | **AvailabilityException** (N) | Um-para-muitos | `AvailabilityException.userId` → `User.id` | `onDelete: Cascade` |
| **Customer** (1) | **Appointment** (N) | Um-para-muitos | `Appointment.customerId` → `Customer.id` | `onDelete: Cascade` |

### Descrição dos Campos

#### User (Clínica / Profissional)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `email` | String (único) | Email de login da clínica |
| `password` | String | Hash da senha (bcrypt, via Auth.js) |
| `name` | String | Nome da clínica (usado nos templates) |
| `workingHours` | String[] | Array padrão de horários (fallback) |
| `weeklyHours` | JSON | Horários por dia da semana: `{ "1": ["08:00"], ... }` (0=domingo) |
| `duration` | Int | Duração de cada slot em minutos (padrão 30) |
| `confirmationTemplate` | String? | Template personalizado de confirmação |
| `cancellationTemplate` | String? | Template personalizado de cancelamento |
| `reminderTemplate` | String? | Template personalizado de lembrete |
| `reminderHours` | Int | Quantas horas antes do agendamento disparar o lembrete (padrão 24) |

#### Customer (Paciente)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `name` | String | Nome do paciente (vindo do pushName do WhatsApp) |
| `phone` | String | Telefone em formato E.164 (`+5511999999999`) |
| `userId` | String (FK) | Clínica à qual este paciente pertence |
| `notes` | String? | Anotações internas (CRM) |

**Unique constraint**: `@@unique([phone, userId])` — um mesmo telefone pode existir em clínicas diferentes, mas não duas vezes na mesma clínica.

#### Appointment (Agendamento)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `customerId` | String (FK) | Paciente dono do agendamento |
| `userId` | String (FK) | Clínica dona do agendamento |
| `appointmentDate` | DateTime | Data e hora escolhida pelo paciente |
| `status` | Enum | `PENDING` (aguardando), `CONFIRMED` (confirmado), `CANCELED` (cancelado) |
| `token` | String (único) | Token UUID usado no link público `/schedule/[token]` |
| `reminderSent` | Boolean | `true` quando o lembrete já foi disparado (evita duplicatas) |

#### AvailabilityException (Exceção de Disponibilidade)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `userId` | String (FK) | Clínica dona da exceção |
| `date` | String | Data no formato `YYYY-MM-DD` |
| `slots` | String[] | Slots customizados para este dia. Array vazio = dia bloqueado |

**Unique constraint**: `@@unique([userId, date])` — só pode haver uma exceção por clínica por dia.

### Mapa de Navegação (como os dados se conectam)

```
                  ┌──────────┐
                  │  User    │
                  │ (login)  │
                  └────┬─────┘
                       │
            ┌──────────┼──────────┐
            │          │          │
            ▼          ▼          ▼
      ┌─────────┐ ┌─────────┐ ┌──────────────────┐
      │Customer │ │Appoint. │ │Availability      │
      │(paciente)│ │(agenda) │ │Exception         │
      └─────────┘ └─────────┘ │(exceção)          │
            │                  └──────────────────┘
            │
            ▼
      ┌─────────┐
      │Appoint. │
      │(hist.)  │
      └─────────┘
```

---

## Apêndice: Rotas da Aplicação

### Rotas Públicas

| Rota | Método | Descrição |
|---|---|---|
| `/schedule/[token]` | GET | Página pública de agendamento (Server Component + SchedulingForm) |
| `/login` | GET | Página de login da clínica |
| `/register` | GET | Página de cadastro da clínica |

### Rotas Autenticadas (Dashboard)

| Rota | Método | Descrição |
|---|---|---|
| `/dashboard` | GET | Dashboard principal |
| `/dashboard/customers` | GET | Lista de pacientes |
| `/dashboard/evolution` | GET | Configuração do WhatsApp (QR Code, status) |

### API Routes

| Rota | Método | Descrição |
|---|---|---|
| `/api/auth/[...nextauth]` | POST | NextAuth handlers (login, session, etc.) |
| `/api/webhook/whatsapp/[[...event]]` | POST | Webhook Evolution API (recebe mensagens) |
| `/api/cron/send-reminders` | GET | Cron job de lembretes (protegido por CRON_SECRET) |
| `/api/appointments/cancel` | POST | Cancelar agendamento |
| `/api/appointments/reschedule` | POST | Reagendar consulta |

### Server Actions

| Action | Localização | Descrição |
|---|---|---|
| `getAppointmentByToken(token)` | `src/app/schedule/actions.ts` | Busca agendamento pelo token |
| `getAvailableSlots(dateStr, userId)` | `src/app/schedule/actions.ts` | Retorna horários disponíveis para uma data |
| `confirmAppointment(token, date, time, name)` | `src/app/schedule/actions.ts` | Confirma o agendamento e envia WhatsApp |
| Ações do dashboard | `src/app/dashboard/actions.ts` | CRUD de agendamentos, clientes, etc. |
| Ações do Evolution | `src/app/dashboard/evolution/actions.ts` | Gerenciamento da instância WhatsApp |

---

> **Dica para novos desenvolvedores**: Comece lendo o fluxo do webhook (seção 2) e depois o fluxo de agendamento (seção 3).
> O esquema do banco (seção 5) é pequeno — apenas 4 tabelas — então vale a pena ler todo o `schema.prisma` antes de codificar.
