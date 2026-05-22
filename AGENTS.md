# AGENTS.md — clinikzap

Full-stack Next.js app for clinic appointment scheduling via WhatsApp.

## Quick start

```bash
npm install
docker compose up -d                    # PostgreSQL + Redis + Evolution API
npx prisma generate && npx prisma migrate dev
npm run dev                             # http://localhost:3000
```

## Essential commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run build` | Production build (runs via CI; also catches type errors) |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npx prisma generate` | Generate Prisma client (needed after pulls) |
| `npx prisma migrate dev` | Create & apply dev migrations |
| `node tests/test-webhook.js` | Manual webhook test (dev server must be running) |
| `node tests/test-cron.js` | Manual cron reminder test (dev server must be running) |

Tests are automated with **Vitest**. Run `npm run test` to run the suite, or `npm run test:coverage` to check coverage. Manual webhook/cron test scripts are also available.

## Architecture

- **Next.js 15 App Router** + **React 19** — no Pages Router.
- **Auth.js v5 beta** (`next-auth@5.0.0-beta.25`) — Credentials provider + JWT strategy + Prisma adapter. No OAuth.
- **TailwindCSS v4** — CSS-first (`@import "tailwindcss"`), no `tailwind.config.*`. Theme uses `@theme inline`.
- **Prisma v6** with PostgreSQL — migrations run via `prisma migrate deploy` at container startup in production.
- **No formatter** configured. Only ESLint for linting.
- **No database seed script** exists.

## Data flow

1. Patient sends WhatsApp → Evolution API webhook → `POST /api/webhook/whatsapp/[[...event]]/route.ts` → creates Customer + PENDING Appointment → sends scheduling link.
2. Patient clicks `/schedule/[token]` → picks slot → confirms → status → CONFIRMED → confirmation WhatsApp.
3. Cron (`GET /api/cron/send-reminders`) sends 24h reminders for CONFIRMED appointments.

## API routes

| Route | Purpose |
|---|---|
| `POST /api/auth/[...nextauth]` | NextAuth handlers |
| `POST /api/webhook/whatsapp/[[...event]]` | WhatsApp webhook receiver |
| `GET /api/cron/send-reminders` | Reminder cron endpoint |
| `POST /api/appointments/cancel` | Cancel appointment |
| `POST /api/appointments/reschedule` | Reschedule appointment |

## Quirks & gotchas

- **Webhook ignores** groups (`@g.us`), broadcasts, and self-sent messages.
- **Redis** is used only for anti-flood locking (15 min) and human-takeover silence mode (1 hour) in the webhook handler.
- **`EVOLUTION_SEND_IN_DEV=false`** (default) logs WhatsApp messages to console instead of sending. Set to `true` to actually send.
- **Expose localhost for WhatsApp testing** via `npx localtunnel` or `ssh -p 443 -R0:localhost:3000 qr@a.pinggy.io`.
- **`force-dynamic`** is set on dashboard and cron routes to prevent caching.
- **Template messages** use `{variable}` syntax (`parseTemplate` in `src/utils/template-parser.ts`).
- **`src/app/api/whatsapp/webhook/`** is an empty/unused directory — the real webhook is at `src/app/api/webhook/whatsapp/`.
- **CI** (`.github/workflows/deploy.yml`) runs `prisma generate` + `npm run build` only — no lint, no tests.

## Key environment variables

- `DATABASE_URL` — PostgreSQL connection
- `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE_NAME`
- `NEXT_PUBLIC_APP_URL` — base URL for scheduling links
- `AUTH_SECRET` — NextAuth encryption secret
- `CRON_SECRET` — optional bearer token for cron endpoint
- `REDIS_URL` — Redis connection (prod only)

## Padrões de Qualidade de Código

- **TypeScript Estrito**: Sempre usar TypeScript estrito. Sem `any`, sem `as unknown`, sem type assertions desnecessários. Tipagem explícita em funções e APIs.
- **Tamanho de Funções**: Máximo 40 linhas por função. Se ultrapassar, extrair helpers com nomes descritivos.
- **Comentários**: Nenhum comentário óbvio do "o que" o código faz. Comentar apenas o "porquê" em casos de restrições complexas, invariantes sutis ou workarounds.
- **Tratamento de Erros**: Nunca engolir erros silenciosamente. Todo `catch` deve registrar com `console.error` ou propagar. Validar inputs nas bordas externas (APIs, formulários); confiar no código interno.
- **Segurança**: Nunca hardcodar secrets, senhas ou tokens. Usar sempre variáveis de ambiente.
- **Decisões e Mudanças**: Interpretar ambiguidade com o mais provável e reportar; em caso de mudanças complexas ou irreversíveis, confirmar antes.
