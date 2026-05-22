# Guia de Contribuição — ClinikZap

Obrigado por considerar contribuir com o **ClinikZap**! 🚀

Este documento define as diretrizes para contribuir com o projeto. Seguindo estes padrões, garantimos um processo colaborativo eficiente e de alta qualidade.

---

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Reportar Bugs](#como-reportar-bugs)
- [Como Sugerir Features](#como-sugerir-features)
- [Setup do Ambiente de Desenvolvimento](#setup-do-ambiente-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Conventional Commits](#conventional-commits)
- [Estrutura do Projeto](#estrutura-do-projeto)

---

## Código de Conduta

Este projeto adota um código de conduta baseado no respeito e na colaboração. Ao interagir com a comunidade, você se compromete a:

- Ser respeitoso e acolhedor com todos os participantes
- Aceitar críticas construtivas com profissionalismo
- Focar no que é melhor para a comunidade e o projeto
- Demonstrar empatia com outros contribuidores

---

## Como Reportar Bugs

Antes de abrir um relatório de bug:

1. **Verifique se já não foi reportado** — Use a busca de issues para evitar duplicatas.
2. **Teste na versão mais recente** — O bug pode já ter sido corrigido.
3. **Use o template de bug report** — Siga o template disponível em [ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md).

### Informações essenciais para o relatório:

- **Descrição clara** do problema
- **Passos reproduzíveis** — Se não for possível reproduzir, não podemos corrigir
- **Comportamento esperado** vs **comportamento atual**
- **Screenshots** ou vídeos, se aplicável
- **Ambiente**: navegador, versão do SO, dispositivo, resolução de tela
- **Logs de erro** do console do navegador ou servidor

> ⚠️ **Importante:** Bugs relacionados a segurança devem ser reportados **privadamente**. Envie um e-mail para [mario@clinikzap.com.br](mailto:mario@clinikzap.com.br) — não abra uma issue pública.

---

## Como Sugerir Features

Toda sugestão é bem-vinda! Para propor uma nova funcionalidade:

1. **Use o template de feature request** disponível em [ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md).
2. **Explique o problema que resolve** — Qual a dor do usuário?
3. **Descreva a solução proposta** — Como você imagina a funcionalidade?
4. **Avalie o impacto no MVP** — Sua sugestão ajuda a classificar a prioridade.

### O que torna uma feature request forte:

- Foco no **problema do usuário**, não apenas na solução técnica
- Casos de uso concretos e realistas
- Alternativas consideradas (mostra que você pesquisou)
- Mockups ou wireframes (se possível)

---

## Setup do Ambiente de Desenvolvimento

### Pré-requisitos

| Ferramenta      | Versão Mínima | Como verificar          |
|-----------------|---------------|-------------------------|
| Node.js         | >= 20.x       | `node --version`        |
| npm             | >= 10.x       | `npm --version`         |
| Docker          | >= 24.x       | `docker --version`      |
| Docker Compose  | >= 2.x        | `docker compose version` |
| Git             | >= 2.x        | `git --version`         |

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/mariobischoff/clinikzap.git
cd clinikzap

# 2. Instale as dependências
npm install

# 3. Inicie os serviços (PostgreSQL + Redis + Evolution API)
docker compose up -d

# 4. Gere o cliente Prisma e aplique as migrações
npx prisma generate
npx prisma migrate dev

# 5. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações locais

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) 🎉

### Variáveis de Ambiente Essenciais

| Variável                    | Descrição                                    | Exemplo                                    |
|-----------------------------|----------------------------------------------|--------------------------------------------|
| `DATABASE_URL`              | Conexão com PostgreSQL                       | `postgresql://user:pass@localhost:5432/db` |
| `EVOLUTION_API_URL`         | URL da Evolution API                         | `http://localhost:8080`                     |
| `EVOLUTION_API_KEY`         | Chave de autenticação da Evolution API       | `seu-api-key`                              |
| `EVOLUTION_INSTANCE_NAME`   | Nome da instância no Evolution API           | `clinikzap-dev`                            |
| `NEXT_PUBLIC_APP_URL`       | URL pública da aplicação                     | `http://localhost:3000`                     |
| `AUTH_SECRET`               | Secret para criptografia JWT                 | `openssl rand -base64 32`                  |
| `CRON_SECRET`               | Token de segurança para endpoint cron        | `seu-cron-secret`                          |
| `REDIS_URL`                 | Conexão com Redis (apenas produção)          | `redis://localhost:6379`                   |

### Comandos Úteis

| Comando                           | Descrição                                    |
|-----------------------------------|----------------------------------------------|
| `npm run dev`                     | Inicia servidor Next.js em modo dev          |
| `npm run build`                   | Gera build de produção                       |
| `npm run lint`                    | Executa ESLint em todos os arquivos          |
| `npx prisma generate`             | Regenera cliente Prisma                      |
| `npx prisma migrate dev`          | Cria e aplica migrações locais               |
| `npx prisma studio`               | Abre interface gráfica do banco de dados     |
| `node tests/test-webhook.js`      | Testa manualmente o webhook do WhatsApp      |
| `node tests/test-cron.js`         | Testa manualmente o cron de lembretes        |

---

## Padrões de Código

### TypeScript

- O projeto usa **TypeScript strict mode** — certifique-se de que não há erros de tipo.
- Evite `any` sempre que possível. Prefira `unknown` se o tipo for desconhecido.
- Utilize tipos explícitos em parâmetros e retornos de funções públicas.
- Siga os princípios de **código limpo**: nomes descritivos, funções pequenas, single responsibility.

### ESLint

Todos os arquivos devem passar pelo ESLint sem erros:

```bash
npm run lint
```

A configuração está em `eslint.config.mjs` (formato flat config).

### Naming Conventions

| Recurso                  | Convenção                | Exemplo                    |
|--------------------------|--------------------------|----------------------------|
| Arquivos de rota Next.js | `kebab-case`             | `send-reminders`           |
| Componentes React        | `PascalCase`             | `AppointmentCard.tsx`      |
| Funções e variáveis      | `camelCase`              | `formatPhoneNumber()`      |
| Constantes               | `UPPER_SNAKE_CASE`       | `MAX_RETRY_COUNT`          |
| Tipos/Interfaces         | `PascalCase`             | `AppointmentStatus`        |
| Arquivos utilitários     | `kebab-case`             | `template-parser.ts`       |
| Tabelas Prisma           | `snake_case` (plural)    | `appointments`, `customers`|

### Estrutura de Arquivos

```text
src/
├── app/                    # App Router (Next.js 15)
│   ├── api/                # Rotas de API
│   ├── (auth)/             # Páginas de autenticação
│   ├── dashboard/          # Dashboard administrativo
│   └── schedule/           # Agendamento público
├── components/             # Componentes React reutilizáveis
├── lib/                    # Configurações de bibliotecas
├── services/               # Lógica de negócio
├── types/                  # Definições de tipos TypeScript
└── utils/                  # Funções utilitárias
```

### React e Next.js

- Use **Server Components** sempre que possível (padrão no App Router).
- Mude para Client Components apenas quando necessário (eventos, hooks, estado, etc).
- Prefira Server Actions para mutações de dados.
- Não use Pages Router — apenas App Router.
- Componentes de página devem estar em `page.tsx` dentro da pasta da rota.

### Prisma e Banco de Dados

- Sempre gere migrações via `npx prisma migrate dev`.
- Nunca edite migrações manualmente.
- Consulte o banco através do Prisma Client, nunca SQL direto.
- Use transações para operações que envolvem múltiplas tabelas.

### Estilo (TailwindCSS v4)

- Use `@theme inline` para customizações de tema no CSS.
- Prefira classes utilitárias Tailwind a CSS customizado.
- Não há `tailwind.config.*` — a configuração é feita via CSS com `@import "tailwindcss"`.

---

## Processo de Pull Request

### Fluxo

```mermaid
graph LR
    A[Criar Branch] --> B[Desenvolver]
    B --> C[Testar Localmente]
    C --> D[Lint + Build]
    D --> E[Abrir PR]
    E --> F[Revisão]
    F --> G[Merge]
```

### Passo a Passo

1. **Crie uma branch a partir da `main`**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/nome-da-feature
   ```
   **Convenção de branches:**
   - `feat/` — Nova funcionalidade
   - `fix/` — Correção de bug
   - `refactor/` — Refatoração
   - `docs/` — Documentação
   - `chore/` — Tarefas de manutenção

2. **Desenvolva seguindo os padrões do projeto** (veja seção acima)

3. **Teste localmente**
   ```bash
   npm run build
   npm run lint
   # Testes manuais conforme aplicável
   ```

4. **Faça commits seguindo Conventional Commits**
   ```bash
   git add .
   git commit -m "feat: adiciona cancelamento de agendamento via WhatsApp"
   ```

5. **Envie a branch e abra o PR**
   ```bash
   git push origin feat/nome-da-feature
   ```
   Use o template de PR disponível em [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).

6. **Aguarde a revisão**

### O que é avaliado na revisão

- **Correção** — O código faz o que deveria fazer?
- **Qualidade** — O código é limpo, legível e bem estruturado?
- **Testabilidade** — É possível testar a mudança?
- **Segurança** — Há exposição de dados, validação de entrada insuficiente?
- **Performance** — A mudança introduz gargalos?
- **Consistência** — Segue os padrões do projeto?

### Antes do merge

- ✅ Conflitos resolvidos
- ✅ CI passando (build + lint)
- ✅ Pelo menos uma aprovação na revisão
- ✅ Commits rebaseados (opcional, mas preferível)

---

## Conventional Commits

O ClinikZap utiliza [Conventional Commits](https://www.conventionalcommits.org/) para padronizar as mensagens de commit. Isso gera automaticamente o changelog e ajuda na semântica de versões.

### Formato

```
<tipo>(<escopo opcional>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos Permitidos

| Tipo       | Descrição                                      | Exemplo                                              |
|------------|------------------------------------------------|------------------------------------------------------|
| `feat`     | Nova funcionalidade                            | `feat: adiciona envio de confirmação por WhatsApp`   |
| `fix`      | Correção de bug                                | `fix: corrige validação de telefone no cadastro`     |
| `refactor` | Refatoração sem mudança de comportamento       | `refactor: extrai lógica de templates para utils`    |
| `docs`     | Documentação                                   | `docs: atualiza guia de contribuição`                |
| `chore`    | Manutenção (deps, config, CI)                  | `chore: atualiza dependências do Prisma`             |
| `style`    | Formatação, estilos (sem mudança de lógica)    | `style: ajusta espaçamento do botão de agendamento`  |
| `perf`     | Melhoria de performance                        | `perf: otimiza consulta de agendamentos do dia`      |
| `test`     | Adição ou correção de testes                   | `test: adiciona teste unitário para parseTemplate`   |

### Escopos Comuns

| Escopo          | Descrição                        |
|-----------------|----------------------------------|
| `webhook`       | Webhook do WhatsApp              |
| `schedule`      | Página de agendamento            |
| `dashboard`     | Dashboard administrativo         |
| `cron`          | Tarefas agendadas                |
| `auth`          | Autenticação                     |
| `db`            | Banco de dados / Prisma          |
| `whatsapp`      | Integração com WhatsApp          |
| `ui`            | Interface do usuário             |
| `api`           | Rotas de API                     |

### Exemplos

```bash
# Funcionalidade com escopo
git commit -m "feat(webhook): adiciona processamento de mensagens de grupo"

# Correção de bug com referência à issue
git commit -m "fix: corrige timeout na consulta de agendamentos

Closes #42"

# Refatoração com descrição detalhada
git commit -m "refactor(api): extrai lógica de cancelamento para serviço dedicado

Move a lógica de cancelamento do handler da rota para um serviço
separado, facilitando testes e reuso."
```

---

## Estrutura do Projeto

```
clinikzap/
├── .github/                 # GitHub templates e workflows
│   ├── ISSUE_TEMPLATE/      # Templates de issues
│   ├── workflows/           # GitHub Actions
│   ├── CONTRIBUTING.md      # Este guia
│   ├── CODEOWNERS           # Auto-assign de PRs
│   └── dependabot.yml       # Configuração do Dependabot
├── prisma/                  # Schema e migrações do Prisma
├── public/                  # Arquivos estáticos
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # Componentes React
│   ├── lib/                 # Configurações (Prisma, Auth.js, Redis)
│   ├── services/            # Lógica de negócio
│   ├── types/               # Tipos TypeScript
│   └── utils/               # Utilitários
├── tests/                   # Scripts de teste manuais
├── docker-compose.yml       # Serviços locais (PostgreSQL, Redis, Evolution API)
├── eslint.config.mjs        # Configuração ESLint (flat config)
└── AGENTS.md                # Guia para agentes de IA
```

---

## Dúvidas?

Se você tiver qualquer dúvida que não foi respondida neste guia:

- Abra uma [Discussão](https://github.com/mariobischoff/clinikzap/discussions)
- Envie um e-mail para [mario@clinikzap.com.br](mailto:mario@clinikzap.com.br)

Mais uma vez, obrigado por contribuir! 🎉
