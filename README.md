# ClinikZap 🩺⚡

> **ClinikZap** é uma plataforma SaaS moderna desenvolvida para clínicas médicas, odontológicas e profissionais autônomos automatizarem o processo de agendamento de consultas e lembretes de presença utilizando o **WhatsApp**.

O sistema permite que o paciente receba um link dinâmico e seguro para escolher seu próprio horário de atendimento, atualiza o status de confirmação e dispara lembretes automáticos 24 horas antes da consulta.

---

## 🚀 Funcionalidades Principais

- 📲 **Integração WhatsApp Nativa (Evolution API v2):** Pareamento simples do número da clínica via QR Code diretamente no painel administrativo.
- 🛡️ **Filtro Inteligente contra Spam:** O sistema ignora automaticamente grupos (`@g.us`) e mensagens enviadas pelo próprio robô, respondendo apenas a chats privados.
- 📅 **Agendamento Dinâmico por Token (`/schedule/[token]`):** O paciente recebe um link único de uso único onde seleciona a data e os horários livres da clínica em tempo real.
- 💬 **Mensagens Automatizadas:**
  - **Envio do Link:** O paciente inicia a conversa no WhatsApp e recebe imediatamente o link personalizado de agendamento.
  - **Confirmação Instantânea:** Assim que o paciente escolhe o horário, o sistema confirma no banco e envia os detalhes da consulta de volta no WhatsApp dele.
  - **Lembrete 24 Horas:** Cron job integrado que detecta consultas confirmadas para o dia seguinte e envia um lembrete automático para reduzir o absenteísmo.
- 🔐 **Painel Administrativo Seguro:** Dashboard profissional protegido utilizando **Auth.js v5 (NextAuth)** para visualização de consultas, pacientes e status de conexões.
- 🐳 **Infraestrutura Docker Completa:** Todo o ecossistema (PostgreSQL, Redis e Evolution API) orquestrado via Docker Compose para desenvolvimento local rápido.

---

## 🛠️ Stack Tecnológica

- **Front-end & Back-end:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions e Route Handlers)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [TailwindCSS](https://tailwindcss.com/)
- **Banco de Dados & ORM:** [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM](https://www.prisma.io/)
- **Cache & Filas:** [Redis](https://redis.io/)
- **Integração WhatsApp:** [Evolution API v2](https://github.com/evolution-foundation/evolution-api) (Baseado em Baileys)
- **Autenticação:** [Auth.js v5](https://authjs.dev/)
- **Ambiente:** [Docker](https://www.docker.com/)

---

## 📂 Estrutura do Projeto

```text
├── docker/                 # Arquivos de suporte e volumes do Docker
├── prisma/                 # Esquemas do banco de dados (PostgreSQL) e migrações
├── public/                 # Imagens e assets públicos da aplicação
├── src/
│   ├── app/                # Rotas da aplicação (Next.js App Router)
│   │   ├── api/            # API Routes (Webhooks do WhatsApp e Cron de lembretes)
│   │   ├── dashboard/      # Painel administrativo da clínica
│   │   └── schedule/       # Rota pública de agendamento para o paciente
│   ├── components/         # Componentes reutilizáveis de UI
│   ├── lib/                # Configurações do Prisma, utilitários, etc.
│   └── services/           # Comunicação com a Evolution API
├── docker-compose.yml      # Orquestração do Postgres, Redis e Evolution API
├── .env.example            # Modelo de variáveis de ambiente
└── .gitignore              # Proteção para não commitar dependências e chaves locais
```

---

## ⚙️ Pré-requisitos

Para rodar este projeto localmente, você precisará ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (Versão 18 ou superior)
- [Docker & Docker Compose](https://www.docker.com/)
- Um cliente Git.

---

## 🔧 Instalação e Execução

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/seu-usuario/clinikzap.git
cd clinikzap
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Abra o arquivo `.env` criado e configure os segredos locais (como o `AUTH_SECRET`). Para testes locais, as URLs padrão do PostgreSQL e da Evolution API já vêm configuradas prontas para o Docker.

### 3. Iniciar os Serviços no Docker
Suba os contêineres do PostgreSQL, Redis e Evolution API:
```bash
docker compose up -d
```

### 4. Rodar as Migrações do Banco de Dados
Com os contêineres ativos, crie as tabelas no PostgreSQL através do Prisma:
```bash
npx prisma migrate dev
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse no seu navegador:
- Painel do ClinikZap: `http://localhost:3000`
- Gerenciamento do WhatsApp (Evolution API): `http://localhost:8080`

---

## 🔗 Integração Externa (Como Testar com o Celular)

Para testar o recebimento de mensagens e o agendamento em aparelhos reais estando em ambiente local:

1. **Exponha a porta do Next.js temporariamente:**
   ```bash
   npx localtunnel --port 3000 --local-host 127.0.0.1
   # Ou utilize o pinggy:
   ssh -p 443 -R0:localhost:3000 qr@a.pinggy.io
   ```
2. **Copie a URL pública gerada** (ex: `https://sua-url.loca.lt`).
3. **Atualize no seu `.env`:**
   ```env
   NEXT_PUBLIC_APP_URL="https://sua-url.loca.lt"
   ```
4. Acesse o dashboard administrativo (`http://localhost:3000/dashboard/evolution`), escaneie o QR Code com o seu WhatsApp e peça para um amigo enviar uma mensagem para o número pareado.

---

## 📝 Licença

Este projeto está sob a licença [MIT](LICENSE). Sinta-se livre para usar, estudar e evoluir!

---

Desenvolvido para portfólio de engenharia de software. 🚀
