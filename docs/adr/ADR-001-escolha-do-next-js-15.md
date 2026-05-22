# ADR-001: Escolha do Next.js 15 como Framework Principal

**Data:** 2026-05-21  
**Status:** Aceito  
**Autor:** Winston — System Architect

---

## Contexto

O ClinikZap é uma plataforma SaaS para agendamento de consultas em clínicas médicas e odontológicas, com integração via WhatsApp. Para sua construção, foi necessário escolher um framework web principal que atendesse aos seguintes requisitos:

- **Renderização híbrida**: páginas públicas (agendamento) com bom SEO e carregamento rápido, e páginas administrativas (dashboard) com experiência rica e interativa.
- **API integrada**: capacidade de expor endpoints REST (webhooks, cron jobs, cancelamento, reagendamento) sem necessidade de um servidor backend separado.
- **Productividade**: boa experiência de desenvolvimento, tipagem estática, ecossistema maduro e facilidade de contratação.
- **Escalabilidade**: suporte a Server Components, streaming e caching para performance.
- **Custo operacional**: deploy simplificado sem necessidade de microsserviços ou orquestração complexa para o MVP.

As alternativas consideradas foram:

| Alternativa | Abordagem |
|---|---|
| **Ruby on Rails** | Framework full-stack monolítico (ERB + Hotwire/Stimulus) |
| **Laravel (PHP)** | Framework full-stack com Inertia.js ou Livewire |
| **Remix** | React com ênfase em web standards e formulários |
| **FastAPI (Python)** | API backend com frontend separado (React/Vue) |
| **Express/NestJS (Node)** | API backend com frontend React separado |
| **Next.js 15** | Framework React full-stack da Vercel |

---

## Decisão

**Optamos pelo Next.js 15 (App Router) com React 19 e TypeScript.**

### Detalhamento da Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js | 15.1.7 |
| UI Library | React | 19.0.0 |
| Linguagem | TypeScript | 5.x |
| Estilização | TailwindCSS | 4.x |
| ORM | Prisma | 6.x |
| Banco de Dados | PostgreSQL | 15 |
| Autenticação | Auth.js (NextAuth) | v5 beta |
| Cache/Distributed Lock | Redis (ioredis) | 7.x |

### Justificativa

**1. Server Components e Renderização Híbrida**

O App Router do Next.js 15 introduz React Server Components (RSC) como padrão, permitindo que componentes sejam renderizados no servidor sem enviar JavaScript ao cliente. Isso é crítico para:

- **Página de agendamento** (`/schedule/[token]`): server-render com SEO adequado para compartilhamento de links no WhatsApp.
- **Dashboard** (`/dashboard`): pode usar componentes do lado do cliente para interatividade (Framer Motion, Sonner para notificações) mantendo o layout inicial no servidor.

**2. Rotas de API Colocadas**

Um dos diferenciais decisivos foi a capacidade de colocar as rotas de API dentro do próprio diretório `src/app/api/`, eliminando a necessidade de um servidor Express/FastAPI separado. As rotas implementadas no ClinikZap incluem:

- `POST /api/webhook/whatsapp/[[...event]]` — webhook Evolution API
- `GET /api/cron/send-reminders` — job de lembretes
- `POST /api/appointments/cancel` — cancelamento
- `POST /api/appointments/reschedule` — reagendamento
- `POST /api/auth/[...nextauth]` — handlers de autenticação

Todas essas rotas convivem no mesmo processo Next.js, simplificando deploy, logging e monitoramento.

**3. React 19**

A adoção do React 19 trouxe benefícios como:

- Suporte a Server Components nativo (sem `use client` em componentes puramente server-side)
- React Compiler (automatic memoization) — disponível em modo experimental no Next.js 15
- Actions (`useActionState`) para formulários no lado do cliente sem bibliotecas externas
- `use()` hook para integração com Promises em Server Components

**4. TypeScript**

O uso de TypeScript é mandatório para um projeto desta complexidade. As interfaces de tipos do webhook da Evolution API e a tipagem estrita do Prisma eliminam classes inteiras de bugs em runtime.

**5. TailwindCSS v4**

A versão 4 do TailwindCSS (CSS-first, sem arquivo `tailwind.config.*`, usando `@import "tailwindcss"` e `@theme inline`) reduz arquivos de configuração e acelera o desenvolvimento de UI. A compatibilidade com React 19 e Server Components é direta.

### Por que não as alternativas?

| Alternativa | Motivo da rejeição |
|---|---|
| **Rails** | Excelente framework, mas exigiria conhecimento de Ruby na equipe e um servidor backend separado para as APIs. Hotwire não oferece o mesmo nível de componentes reativos que React. |
| **Laravel** | Similar ao Rails — traria PHP para o ecossistema, exigindo manutenção de duas stacks distintas (PHP + JS). |
| **Remix** | Próximo do Next.js em conceitos, mas com ecossistema menor, menos integrações com autenticação (Auth.js) e ORMs (Prisma). |
| **FastAPI + React** | Arquitetura de duas aplicações separadas — dobra a superfície de deploy, exige CORS, maior complexidade operacional sem benefício claro para o MVP. |
| **Express/NestJS + React** | Mesmo problema do FastAPI: separação de frontend e backend adiciona complexidade desnecessária para um time pequeno. |

---

## Consequências

### Positivas

- **Deploy único**: uma só aplicação para frontend e backend — deploy via `next build` + `next start`.
- **Produtividade no desenvolvimento**: hot reload, tipagem compartilhada entre frontend e backend, mesmo pacote `package.json`.
- **Performance**: Server Components reduzem o JavaScript enviado ao cliente. Páginas de agendamento carregam sem flash de loading.
- **API Routes estáveis**: roteamento baseado em sistema de arquivos, suporte a middlewares (`auth.config.ts`) e Edge Runtime (quando aplicável).
- **Ecossistema maduro**: Auth.js, Prisma, TailwindCSS, Framer Motion — todas as bibliotecas essenciais têm integração de primeira classe com Next.js.
- **Facilidade de migração para SSR/SSG**: rotas podem ser estáticas, dinâmicas ou híbridas conforme a necessidade.

### Negativas

- **Vendor lock-in moderado**: o App Router é proprietário da Vercel. Migrar para outro framework exigiria reescrita significativa das rotas de API e páginas.
- **Edge Runtime limitado**: algumas funcionalidades (Prisma, bcrypt) não funcionam no Edge Runtime, exigindo `runtime = 'nodejs'` em algumas rotas.
- **NextAuth v5 beta**: a versão beta do Auth.js introduz risco de breaking changes em atualizações futuras.
- **Consumo de memória**: o processo Node.js do Next.js consome mais memória que um servidor Rails ou Laravel equivalente.

### Compliance e Notas Técnicas

- Server Components são o padrão; `'use client'` deve ser usado explicitamente apenas onde interatividade é necessária.
- Rotas de API que usam Prisma ou bcrypt devem definir `runtime = 'nodejs'`.
- A build de produção (`next build`) roda via CI (GitHub Actions) e já captura erros de tipo.
- Middleware de autenticação (`auth.config.ts`) protege as rotas do dashboard e redireciona usuários não autenticados.
