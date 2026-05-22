# Guia de Deployment — ClinikZap

**Versão:** 1.0
**Última atualização:** Maio/2026
**Stack:** Docker · Node 20 · PostgreSQL 15 · Redis 7 · Evolution API v2

---

## 1. Pré-requisitos

### 1.1 Local (Desenvolvimento)

- Node.js 20+
- Docker Desktop
- npm
- Git

### 1.2 Produção (VPS — Hetzner)

- Servidor Linux (Ubuntu 22.04 recomendado)
- Docker + Docker Compose v2
- SSH configurado
- Domínio com DNS apontado para o IP do servidor
- Portas 80 e 443 liberadas no firewall

---

## 2. Docker Compose — Serviços

### 2.1 Desenvolvimento (`docker-compose.yml`)

```yaml
services:
  postgres:     # PostgreSQL 15 - porta 5432
  redis:        # Redis 7 - porta 6379
  evolution-api:# Evolution API v2.3.1 - porta 8080
```

**Uso:**
```bash
docker compose up -d
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 2.2 Produção (`docker-compose.prod.yml`)

```yaml
services:
  postgres:             # PostgreSQL 15 (volume persistente)
  redis:                # Redis 7 (volume persistente)
  evolution-api:        # Evolution API v2.3.1
  app:                  # Next.js (Dockerfile multi-stage)
  nginx-proxy-manager:  # Reverse proxy + SSL (ports 80, 81, 443)
```

**Uso:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 2.3 Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

---

## 3. Variáveis de Ambiente

### 3.1 Desenvolvimento (`.env`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clinikzap?schema=public"
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="42a83c48-8424-4f9e-a843-982823a35cfb"
EVOLUTION_INSTANCE_NAME="clinikzap"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WEBHOOK_URL="http://host.docker.internal:3000/api/webhook/whatsapp"
AUTH_SECRET="your_nextauth_secret_here"
```

### 3.2 Produção (`.env.prod` / CI/CD Secrets)

```env
VPS_IP="123.123.123.123"
POSTGRES_PASSWORD="senha_segura_aqui"
EVOLUTION_API_KEY="chave_api_evolution"
AUTH_SECRET="nextauth_secret_producao"
```

**No GitHub Actions, essas variáveis são configuradas como Secrets:**
- `secrets.VPS_SSH_KEY`
- `secrets.VPS_IP`
- `secrets.POSTGRES_PASSWORD`
- `secrets.EVOLUTION_API_KEY`
- `secrets.AUTH_SECRET`

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Production Deploy 🚀

on:
  workflow_dispatch:  # Apenas disparo manual

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Instalar dependências
        run: npm install

      - name: Gerar Prisma Client
        run: npx prisma generate

      - name: Build
        run: npm run build

      - name: Configurar SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}

      - name: Criar .env de produção
        run: |
          echo "POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}" > .env
          echo "EVOLUTION_API_KEY=${{ secrets.EVOLUTION_API_KEY }}" >> .env
          echo "AUTH_SECRET=${{ secrets.AUTH_SECRET }}" >> .env

      - name: Empacotar código
        run: tar -czf clinikzap.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="clinikzap.tar.gz" *

      - name: Enviar para VPS
        run: |
          scp -o StrictHostKeyChecking=no clinikzap.tar.gz root@${{ secrets.VPS_IP }}:/root/
          scp -o StrictHostKeyChecking=no .env root@${{ secrets.VPS_IP }}:/root/clinikzap/.env

      - name: Deploy
        run: |
          ssh -o StrictHostKeyChecking=no root@${{ secrets.VPS_IP }} "tar -xzf /root/clinikzap.tar.gz -C /root/clinikzap && cd /root/clinikzap && docker compose -f docker-compose.prod.yml up -d --build"

      - name: Limpeza
        run: rm clinikzap.tar.gz
```

### 4.2 Deploy Manual (PowerShell — `deploy.ps1`)

```powershell
# Uso: .\deploy.ps1
# Lê variáveis de .env.prod
# Empacota, envia via SCP, extrai e faz deploy na VPS
```

---

## 5. Processo de Deploy (Passo a Passo)

### 5.1 Primeiro Deploy

```bash
# 1. Acessar VPS
ssh root@<IP_DO_SERVIDOR>

# 2. Instalar Docker
curl -fsSL https://get.docker.com | bash

# 3. Clonar repositório (opcional, o CI faz o upload)
git clone https://github.com/marioandre01/clinikzap.git
cd clinikzap

# 4. Configurar Nginx Proxy Manager
# - Acessar http://<IP>:81
# - Login: admin@example.com / changeme
# - Adicionar proxy: clinikzap.mariotech.com.br → app:3000
# - Solicitar certificado SSL Let's Encrypt

# 5. Iniciar serviços
docker compose -f docker-compose.prod.yml up -d --build

# 6. Verificar logs
docker compose -f docker-compose.prod.yml logs -f app
```

### 5.2 Deploy de Atualização (via CI/CD)

```bash
# 1. Ir ao GitHub → Actions → Production Deploy
# 2. Clicar "Run workflow" (branch: main)
# 3. Acompanhar logs no GitHub Actions
# 4. Verificar deploy: https://clinikzap.mariotech.com.br
```

### 5.3 Deploy Manual Alternativo

```bash
# 1. Fazer build local
npm install && npx prisma generate && npm run build

# 2. Empacotar
tar -czf clinikzap.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="clinikzap.tar.gz" *

# 3. Enviar para VPS
scp clinikzap.tar.gz root@<IP>:/root/

# 4. Deploy na VPS
ssh root@<IP>
tar -xzf /root/clinikzap.tar.gz -C /root/clinikzap
cd /root/clinikzap
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 6. Conexão WhatsApp (QR Code)

Após o deploy, é necessário conectar a instância WhatsApp:

### 6.1 Via Evolution API

```bash
# 1. Verificar estado da conexão
curl -X GET "http://localhost:8080/instance/connectionState/clinikzap" \
  -H "apikey: $EVOLUTION_API_KEY"

# 2. Obter QR Code (base64)
curl -X GET "http://localhost:8080/instance/connect/clinikzap" \
  -H "apikey: $EVOLUTION_API_KEY"

# 3. Escanear QR Code com o WhatsApp do consultório
# (ou usar o código de pareamento nas novas versões)
```

### 6.2 Via Dashboard (futuro)

O dashboard terá uma interface para conectar/desconectar a instância WhatsApp.

---

## 7. Estratégia de Backup

### 7.1 Backup do Banco de Dados (PostgreSQL)

```bash
#!/bin/bash
# /root/scripts/backup-db.sh

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="clinikzap"
DB_USER="postgres"
DB_PASSWORD="$(cat /root/clinikzap/.env | grep POSTGRES_PASSWORD | cut -d= -f2)"

# Criar dump
docker exec clinikzap-postgres-prod pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/clinikzap_$TIMESTAMP.sql.gz"

# Manter apenas os últimos 7 dias
find $BACKUP_DIR -name "clinikzap_*.sql.gz" -mtime +7 -delete

# Opcional: enviar para bucket S3/Backblaze
# rclone copy $BACKUP_DIR/clinikzap_$TIMESTAMP.sql.gz b2:clinikzap-backups/
```

**Crontab (execução diária às 3h da manhã):**
```cron
0 3 * * * /root/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### 7.2 Backup do Redis

O Redis contém apenas dados temporários (locks). Em caso de falha, os locks expiram sozinhos. Backup do Redis é opcional.

### 7.3 Backup dos Volumes Docker

```bash
# Backup de todos os volumes
docker run --rm -v clinikzap_postgres_data_prod:/data -v /root/backups:/backup alpine \
  tar -czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /data .
```

### 7.4 Política de Retenção

| Tipo | Frequência | Retenção | Destino |
|------|------------|----------|---------|
| Dump PostgreSQL | Diária | 7 dias | /root/backups/ |
| Dump PostgreSQL | Semanal | 30 dias | Backblaze B2 (futuro) |
| Volumes Docker | Semanal | 30 dias | /root/backups/ |

---

## 8. Monitoramento

### 8.1 Comandos Úteis

```bash
# Logs de todos os serviços
docker compose -f docker-compose.prod.yml logs -f

# Logs apenas do app
docker compose -f docker-compose.prod.yml logs -f app

# Status dos containers
docker compose -f docker-compose.prod.yml ps

# Uso de recursos
docker stats

# Conexão Evolution API
curl -X GET "http://localhost:8080/instance/connectionState/clinikzap" \
  -H "apikey: $EVOLUTION_API_KEY"
```

### 8.2 Health Checks

O Next.js não possui endpoint de health check atualmente. Recomenda-se criar:

```typescript
// src/app/api/health/route.ts (futuro)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    database: await checkDatabase(),
    redis: await checkRedis(),
    evolution: await checkEvolution(),
    uptime: process.uptime(),
  });
}
```

### 8.3 Alertas Recomendados

- **Container down:** Docker auto-restart (`restart: always`)
- **Disco cheio:** Monitorar `/root/backups/` e volumes Docker
- **SSL expirando:** NPM renova automaticamente
- **API Evolution offline:** Verificar conexão WhatsApp

---

## 9. Rollback

### 9.1 Rollback de Código

```bash
# 1. Reverter para versão anterior no repositório
git revert HEAD
git push origin main

# 2. Disparar novo deploy (CI/CD)
# Ou manualmente com a versão anterior
```

### 9.2 Rollback de Banco de Dados

```bash
# 1. Identificar migration anterior
npx prisma migrate list

# 2. Reverter para migration específica
npx prisma migrate resolve --rolled-back <migration-name>

# 3. Restaurar dump (se necessário)
docker exec -i clinikzap-postgres-prod psql -U postgres clinikzap < backup.sql
```

### 9.3 Rollback Completo

```bash
# 1. Parar serviços
docker compose -f docker-compose.prod.yml down

# 2. Restaurar backup do banco
gunzip -c /root/backups/clinikzap_20260520_030000.sql.gz | \
  docker exec -i clinikzap-postgres-prod psql -U postgres clinikzap

# 3. Reverter imagem Docker para tag anterior
docker compose -f docker-compose.prod.yml up -d
```

---

## 10. Troubleshooting

### 10.1 App não inicia

```bash
# Verificar logs
docker compose logs app

# Verificar se migrations estão pendentes
docker exec clinikzap-app-prod npx prisma migrate status

# Executar migrations manualmente
docker exec clinikzap-app-prod npx prisma migrate deploy
```

### 10.2 Evolution API não conecta

```bash
# Verificar estado
curl http://localhost:8080/instance/fetchInstances -H "apikey: $API_KEY"

# Recriar instância
# A aplicação tenta recriar automaticamente na inicialização
```

### 10.3 Webhook não chega

```bash
# Verificar URL do webhook
curl http://localhost:8080/webhook/find/clinikzap -H "apikey: $API_KEY"

# A URL deve corresponder a NEXT_PUBLIC_WEBHOOK_URL
# Em produção: https://clinikzap.mariotech.com.br/api/webhook/whatsapp
```

### 10.4 Portas em conflito

```bash
# Verificar o que está usando a porta 3000
netstat -tlnp | grep 3000

# Se necessário, parar processo ou alterar porta no docker-compose
```
