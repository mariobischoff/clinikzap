# Runbook de Operações — ClinikZap

**Versão:** 1.0
**Última atualização:** Maio/2026
**Público-alvo:** Equipe de operações / DevOps
**Tags:** #runbook #operacoes #monitoramento #troubleshooting

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura dos Serviços](#2-arquitetura-dos-serviços)
3. [Monitoramento do Sistema](#3-monitoramento-do-sistema)
   - 3.1 [Health Check](#31-health-check)
   - 3.2 [Verificação do Webhook](#32-verificação-do-webhook)
   - 3.3 [Verificação do Redis](#33-verificação-do-redis)
   - 3.4 [Status da Evolution API](#34-status-da-evolution-api)
   - 3.5 [Monitoramento de Disco e Recursos](#35-monitoramento-de-disco-e-recursos)
4. [Gerenciamento de Serviços](#4-gerenciamento-de-serviços)
   - 4.1 [Reinicialização de Serviços](#41-reinicialização-de-serviços)
   - 4.2 [Logs dos Serviços](#42-logs-dos-serviços)
5. [Problemas Comuns e Soluções](#5-problemas-comuns-e-soluções)
   - 5.1 [Evolution API Desconectada](#51-evolution-api-desconectada)
   - 5.2 [Falha de Conexão com Redis](#52-falha-de-conexão-com-redis)
   - 5.3 [Verificação de Backup PostgreSQL](#53-verificação-de-backup-postgresql)
   - 5.4 [Certificado SSL Expirado](#54-certificado-ssl-expirado)
   - 5.5 [Espaço em Disco Insuficiente](#55-espaço-em-disco-insuficiente)
   - 5.6 [Webhook Não Está Recebendo Mensagens](#56-webhook-não-está-recebendo-mensagens)
   - 5.7 [Aplicação Não Inicia](#57-aplicação-não-inicia)
   - 5.8 [Paciente Recebe Múltiplos Links](#58-paciente-recebe-múltiplos-links)
   - 5.9 [Lembretes Não Estão Sendo Enviados](#59-lembretes-não-estão-sendo-enviados)
6. [Procedimentos de Emergência](#6-procedimentos-de-emergência)
   - 6.1 [Reinicialização Completa](#61-reinicialização-completa)
   - 6.2 [Recuperação de Dados](#62-recuperação-de-dados)
   - 6.3 [Rollback de Versão](#63-rollback-de-versão)
   - 6.4 [Procedimento em Caso de Queda da Evolution API](#64-procedimento-em-caso-de-queda-da-evolution-api)
7. [Checklist Diário/Semanal](#7-checklist-diáriosemanal)
8. [Contatos e Escalabilidade](#8-contatos-e-escalabilidade)

---

## 1. Visão Geral

Este runbook contém os procedimentos operacionais necessários para manter o ClinikZap funcionando em produção. O sistema é composto por 5 serviços Docker rodando em um VPS Ubuntu 22.04:

| Serviço | Porta | Função | Depende de |
|---------|-------|--------|------------|
| `app` | 3000 | Next.js (aplicação principal) | postgres, redis, evolution-api |
| `postgres` | 5432 | Banco de dados PostgreSQL | — |
| `redis` | 6379 | Cache e locks anti-flood | — |
| `evolution-api` | 8080 | Gateway WhatsApp (Baileys) | redis |
| `nginx-proxy-manager` | 80/443 | Proxy reverso + SSL | — |

**Ambiente de produção:** VPS Hetzner, Docker Compose, Ubuntu 22.04
**Domínio:** `https://clinikzap.mariotech.com.br`

---

## 2. Arquitetura dos Serviços

```
                             Internet
                                │
                    ┌───────────┴───────────┐
                    │  Nginx Proxy Manager  │
                    │    (80 / 443 / 81)    │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Next.js App (:3000) │
                    └──┬───────┬───────┬────┘
                       │       │       │
              ┌────────┴┐ ┌────┴────┐ ┌┴──────────┐
              │Postgres │ │  Redis  │ │ Evolution  │
              │ (:5432) │ │ (:6379) │ │ API (:8080)│
              └─────────┘ └─────────┘ └────────────┘
```

### Rede Docker

Todos os serviços se comunicam via rede interna `clinikzap-net-prod`. Apenas o Nginx Proxy Manager expõe portas para a internet (80, 443, 81).

### Variáveis de Ambiente Críticas

Consulte o arquivo `.env` na raiz do projeto. As variáveis sensíveis estão no arquivo `.env.prod` e nos secrets do GitHub Actions.

---

## 3. Monitoramento do Sistema

### 3.1 Health Check

O ClinikZap **não possui um endpoint de health check nativo** (recomendado para implementação futura). Enquanto isso, use os comandos abaixo para verificar o status de cada componente:

```bash
# Verificar status de todos os containers
ssh root@<VPS_IP>
docker compose -f docker-compose.prod.yml ps

# Verificar se o app está respondendo
curl -s -o /dev/null -w "%{http_code}" https://clinikzap.mariotech.com.br/login

# Verificar se a página de agendamento pública está acessível
curl -s -o /dev/null -w "%{http_code}" https://clinikzap.mariotech.com.br/schedule/test

# Verificar logs recentes do app (últimas 50 linhas)
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

#### Endpoint de Health Check Sugerido

Para implementação futura, crie o arquivo `src/app/api/health/route.ts`:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabase(),
    redis: await checkRedis(),
    evolution: await checkEvolution(),
  };

  const httpStatus = checks.database === 'ok' && checks.redis === 'ok' ? 200 : 503;
  return NextResponse.json(checks, { status: httpStatus });
}
```

### 3.2 Verificação do Webhook

Para verificar se o webhook está recebendo mensagens:

```bash
# 1. Verificar logs do webhook em tempo real
docker compose -f docker-compose.prod.yml logs -f app | grep "\[Webhook WhatsApp\]"

# 2. Verificar quantidade de webhooks processados nas últimas 24h
docker compose -f docker-compose.prod.yml logs app --since=24h | grep "\[Webhook WhatsApp\]" | wc -l

# 3. Verificar se há erros no webhook
docker compose -f docker-compose.prod.yml logs app --since=1h | grep "\[Webhook WhatsApp\] Error"

# 4. Testar webhook manualmente
curl -X POST https://clinikzap.mariotech.com.br/api/webhook/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPSERT",
    "instanceId": "clinikzap",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "test-123"
      },
      "pushName": "Teste",
      "messageType": "conversation",
      "message": {
        "conversation": "Olá, teste operacional"
      }
    }
  }'

# 5. Verificar URL configurada na Evolution API
curl -s http://localhost:8080/webhook/find/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .
```

#### Respostas Esperadas do Webhook

| Resposta | Significado |
|----------|-------------|
| `"Webhook processed successfully"` | ✅ Mensagem processada, link enviado |
| `"Welcome lock active (anti-flood)"` | ✅ Anti-flood ativo, mesma mensagem ignorada |
| `"Human-takeover active lock applied"` | ✅ Secretária respondeu, bot silenciado |
| `"Chat is silenced (human-takeover bypass)"` | ✅ Modo silêncio ativo |
| `"Ignored non-private chat"` | ✅ Mensagem de grupo/broadcast ignorada |
| `"No clinic registered yet"` | ⚠️ Nenhuma clínica cadastrada |
| `"Invalid payload structure"` | ⚠️ Payload mal formatado |

### 3.3 Verificação do Redis

O Redis armazena apenas dados temporários com TTL. Verifique seu estado:

```bash
# Acessar Redis CLI
docker exec -it clinikzap-redis-prod redis-cli

# Comandos úteis dentro do Redis CLI:
PING                    # Verificar conectividade (deve retornar "PONG")
KEYS "lock:welcome:*"   # Listar todos os locks anti-flood ativos
KEYS "silence:chat:*"   # Listar todos os silence modes ativos
TTL lock:welcome:5511999999999  # Verificar TTL restante de um lock específico
DBSIZE                  # Quantidade total de chaves
INFO memory             # Uso de memória do Redis
INFO stats              # Estatísticas de operações

# Verificar uso de memória do Redis pelo Docker
docker stats clinikzap-redis-prod --no-stream

# Sair do Redis CLI com CTRL+D ou digite EXIT
```

Entendendo as chaves Redis:

| Chave | TTL | Conteúdo | Significado |
|-------|-----|----------|-------------|
| `lock:welcome:{phone}` | 900s (15 min) | `"true"` | Anti-flood: link já foi enviado recentemente |
| `silence:chat:{phone}` | 3600s (1h) | `"true"` | Human-takeover: secretária está atendendo |

> **Importante:** O Redis não tem persistência obrigatória. Se o Redis reiniciar, os locks simplesmente expiram e são recriados conforme necessário. Não há perda de dados críticos.

### 3.4 Status da Evolution API

```bash
# Verificar se o container está rodando
docker ps | grep evolution

# Verificar logs da Evolution API
docker compose -f docker-compose.prod.yml logs --tail=50 evolution-api

# Verificar estado da conexão WhatsApp via API
curl -s http://localhost:8080/instance/connectionState/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .

# Resposta esperada (conectado):
# {
#   "instanceName": "clinikzap",
#   "state": "open",
#   "status": "connected"
# }

# Resposta esperada (desconectado):
# {
#   "instanceName": "clinikzap",  
#   "state": "close",
#   "status": "disconnected"
# }

# Verificar se a instância existe
curl -s http://localhost:8080/instance/fetchInstances \
  -H "apikey: $EVOLUTION_API_KEY" | jq .
```

#### Leitura dos Logs da Evolution API

Os logs da Evolution API indicam o estado da conexão WhatsApp:

```
# Conectando (QR code gerado)
[QRCODE] QR Code generated for instance clinikzap

# Conectado com sucesso
[Baileys] Connection opened for clinikzap

# Desconectado (necessário reconectar)
[Baileys] Connection closed for clinikzap

# Reconexão automática
[Baileys] Attempting reconnect for clinikzap (attempt 1/5)
```

### 3.5 Monitoramento de Disco e Recursos

```bash
# Verificar espaço em disco
df -h

# Verificar espaço ocupado pelos backups
du -sh /root/backups/

# Verificar espaço ocupado pelos volumes Docker
docker system df

# Verificar uso de recursos por container
docker stats

# Verificar uso de CPU e memória detalhado
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Verificar espaço no volume do PostgreSQL
docker run --rm -v clinikzap_postgres_data_prod:/data alpine du -sh /data

# Alertas de disco (acionar se > 80%):
# - /dev/sda1: verificar com df -h
```

---

## 4. Gerenciamento de Serviços

### 4.1 Reinicialização de Serviços

Todos os comandos devem ser executados no VPS como root.

#### Reiniciar Serviço Específico

```bash
# Reiniciar apenas o app Next.js
docker compose -f docker-compose.prod.yml restart app

# Reiniciar apenas o PostgreSQL
docker compose -f docker-compose.prod.yml restart postgres

# Reiniciar apenas o Redis
docker compose -f docker-compose.prod.yml restart redis

# Reiniciar apenas a Evolution API
docker compose -f docker-compose.prod.yml restart evolution-api

# Aguardar o serviço ficar saudável
docker compose -f docker-compose.prod.yml logs -f app
```

#### Reiniciar Todos os Serviços (sem rebuild)

```bash
docker compose -f docker-compose.prod.yml restart
```

#### Rebuild + Reinicialização Completa

```bash
# Para atualizações de código ou configuração
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

#### Parar e Iniciar Serviços Individualmente

```bash
# Parar um serviço específico
docker compose -f docker-compose.prod.yml stop app

# Iniciar um serviço específico
docker compose -f docker-compose.prod.yml start app

# Parar todos os serviços
docker compose -f docker-compose.prod.yml down

# Iniciar todos os serviços
docker compose -f docker-compose.prod.yml up -d
```

### 4.2 Logs dos Serviços

```bash
# Logs de todos os serviços (stream)
docker compose -f docker-compose.prod.yml logs -f

# Logs do app (com prefixo colorido)
docker compose -f docker-compose.prod.yml logs -f app

# Últimas N linhas do app
docker compose -f docker-compose.prod.yml logs --tail=100 app

# Logs do app desde um horário específico
docker compose -f docker-compose.prod.yml logs --since="2026-05-20T10:00:00" app

# Logs do app das últimas 2 horas
docker compose -f docker-compose.prod.yml logs --since=2h app

# Logs filtrados por módulo
docker compose -f docker-compose.prod.yml logs app 2>&1 | grep "\[Webhook WhatsApp\]"
docker compose -f docker-compose.prod.yml logs app 2>&1 | grep "\[Cron Reminders\]"
docker compose -f docker-compose.prod.yml logs app 2>&1 | grep "\[EvolutionService\]"
docker compose -f docker-compose.prod.yml logs app 2>&1 | grep "\[Dashboard Actions\]"

# Logs do PostgreSQL
docker compose -f docker-compose.prod.yml logs --tail=50 postgres

# Logs da Evolution API
docker compose -f docker-compose.prod.yml logs --tail=50 evolution-api

# Exportar logs para arquivo (útil para diagnósticos)
docker compose -f docker-compose.prod.yml logs app > /tmp/app-logs-$(date +%Y%m%d).txt
```

#### Prefixos de Log e Seus Significados

| Prefixo | Módulo | Exemplo de Log |
|---------|--------|---------------|
| `[Webhook WhatsApp]` | Webhook handler | `[Webhook WhatsApp] Customer criado: 5511999999999` |
| `[Actions]` | Server actions de agendamento | `[Actions] Agendamento confirmado: token abc-123` |
| `[Dashboard Actions]` | Server actions do dashboard | `[Dashboard Actions] Horários atualizados` |
| `[EvolutionService]` | Wrapper da Evolution API | `[EvolutionService] Mensagem enviada: 5511999999999` |
| `[Appointment Cancel]` | Cancelamento | `[Appointment Cancel] Agendamento cancelado: token abc` |
| `[Appointment Reschedule]` | Reagendamento | `[Appointment Reschedule] Reagendamento criado` |
| `[Cron Reminders]` | Cron de lembretes | `[Cron Reminders] 3 lembretes enviados` |

---

## 5. Problemas Comuns e Soluções

### 5.1 Evolution API Desconectada

**Sintomas:**
- Pacientes enviam mensagens mas não recebem resposta
- Logs mostram `[Baileys] Connection closed` ou `[EvolutionService] Error: connection closed`
- Dashboard mostra instância WhatsApp desconectada

**Causas:**
- Telefone da clínica perdeu conexão com a internet
- WhatsApp Web foi desconectado manualmente
- Atualização do WhatsApp que exigiu reconexão
- Reinicialização do servidor

**Solução:**

```bash
# 1. Verificar estado atual
curl -s http://localhost:8080/instance/connectionState/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .

# 2. Se "close" ou "disconnected", forçar reconexão
# Opção A: Obter QR Code (base64 — exibir no navegador ou dashboard)
curl -X GET http://localhost:8080/instance/connect/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq -r '.base64'

# Opção B: Obter código de pareamento (recomendado — mais estável)
curl -X GET http://localhost:8080/instance/pairingCode/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq -r '.pairingCode'

# 3. Escanear o QR Code ou usar o código de pareamento no WhatsApp da clínica
#    (WhatsApp → Menu → Aparelhos conectados → Conectar um dispositivo)

# 4. Verificar se a conexão foi estabelecida
sleep 10
curl -s http://localhost:8080/instance/connectionState/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .
```

**Se não funcionar, tente recriar a instância:**

```bash
# 1. Logar na Evolution API e recriar a instância
# (a aplicação tenta recriar automaticamente na inicialização)
docker compose -f docker-compose.prod.yml restart evolution-api

# 2. Se ainda assim não funcionar, reiniciar todo o stack
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 3. Verificar logs
docker compose -f docker-compose.prod.yml logs evolution-api
```

### 5.2 Falha de Conexão com Redis

**Sintomas:**
- Logs mostram `[Webhook WhatsApp] Error: connect ECONNREFUSED 127.0.0.1:6379`
- Anti-flood não funciona (pacientes recebem múltiplos links)
- Human-takeover não funciona (bot responde mesmo com secretária ativa)
- Aplicação pode ficar lenta

**Causas:**
- Container Redis parou
- Redis consumiu toda a memória
- Rede Docker com problemas
- Porta 6379 ocupada

**Solução:**

```bash
# 1. Verificar status do container Redis
docker ps | grep redis

# 2. Verificar logs do Redis
docker compose -f docker-compose.prod.yml logs --tail=30 redis

# 3. Tentar reiniciar o Redis
docker compose -f docker-compose.prod.yml restart redis

# 4. Testar conectividade
docker exec clinikzap-redis-prod redis-cli PING

# 5. Verificar se o app consegue conectar
docker exec clinikzap-app-prod node -e "
  const { createClient } = require('redis');
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
  client.on('error', (err) => console.error('Erro:', err));
  client.connect().then(() => {
    console.log('Conectado ao Redis!');
    client.quit();
  }).catch((err) => console.error('Falha:', err));
"

# 6. Forçar reinicialização total se necessário
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

> **Graceful Degradation:** Se o Redis falhar, o webhook continua funcionando, mas sem anti-flood (paciente pode receber múltiplos links em sucessão rápida). O banco de dados impede duplicatas.

### 5.3 Verificação de Backup PostgreSQL

**Sintomas:**
- Preocupação com retenção de dados
- Procedimento de recuperação após falha

**Verificação:**

```bash
# 1. Listar backups existentes
ls -lh /root/backups/
# Resultado esperado: clinikzap_20260521_030000.sql.gz

# 2. Verificar se o backup de hoje foi gerado
ls -lh /root/backups/$(date +%Y%m%d)*

# 3. Verificar integridade de um backup (sem extrair)
gunzip -c /root/backups/clinikzap_$(date +%Y%m%d_030000).sql.gz | head -20
# Deve mostrar: PostgreSQL database dump

# 4. Verificar log do cron de backup
cat /var/log/backup.log | tail -10

# 5. Verificar crontab
crontab -l | grep backup

# 6. Forçar execução manual do backup
bash /root/scripts/backup-db.sh
cat /var/log/backup.log | tail -10
```

**Se o backup não estiver sendo gerado:**

```bash
# 1. Verificar se o script de backup existe
ls -la /root/scripts/backup-db.sh

# 2. Verificar permissões
chmod +x /root/scripts/backup-db.sh

# 3. Verificar se o crontab está ativo
systemctl status cron

# 4. Verificar espaço em disco (backups podem falhar se o disco estiver cheio)
df -h /root/backups/

# 5. Testar backup manualmente
/root/scripts/backup-db.sh
```

### 5.4 Certificado SSL Expirado

**Sintomas:**
- Navegador mostra "Conexão não segura" ou "NET::ERR_CERT_DATE_INVALID"
- Webhook pode não funcionar (Evolution API exige HTTPS)

**Causas:**
- Certificado Let's Encrypt não renovou automaticamente
- Nginx Proxy Manager não conseguiu renovar
- Domínio expirou ou DNS não está resolvendo corretamente

**Solução:**

```bash
# 1. Acessar Nginx Proxy Manager
# URL: https://clinikzap.mariotech.com.br:81
# Email padrão: admin@example.com
# Senha padrão: changeme

# 2. No painel NPM, ir em "SSL Certificate"
# Verificar status do certificado

# 3. Forçar renovação manual
# No NPM: Editar o proxy → SSL → "Force SSL" e "Request a new certificate"

# 4. Verificar se o Let's Encrypt está respondendo
curl -I https://acme-v02.api.letsencrypt.org/directory

# 5. Se falhar, verificar se a porta 80 está acessível (Let's Encrypt exige)
# O NPM usa porta 80 para validação HTTP-01

# 6. Como último recurso, recriar o certificado
# NPM → SSL Certificates → Add → Let's Encrypt
# Domain: clinikzap.mariotech.com.br
# Email: admin@mariotech.com.br
```

### 5.5 Espaço em Disco Insuficiente

**Sintomas:**
- Backups param de ser gerados
- PostgreSQL pode parar de aceitar conexões
- Aplicação fica instável
- `df -h` mostra uso > 85%

**Solução Imediata:**

```bash
# 1. Verificar o que está ocupando espaço
du -sh /* 2>/dev/null | sort -rh | head -10

# 2. Limpar backups antigos (manter apenas 7 dias mais recentes)
find /root/backups -name "*.sql.gz" -mtime +7 -delete

# 3. Limpar imagens Docker não utilizadas
docker system prune -f

# 4. Limpar volume de build do Next.js (se aplicável)
docker exec clinikzap-app-prod rm -rf /app/.next/cache

# 5. Verificar logs do Docker (podem crescer muito)
docker system df
du -sh /var/lib/docker/containers
```

**Solução Preventiva:**

```bash
# 1. Configurar log rotation do Docker
# Editar /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# 2. Reiniciar Docker para aplicar
systemctl restart docker

# 3. Adicionar monitoramento de disco ao crontab
cat > /root/scripts/check-disk.sh << 'EOF'
#!/bin/bash
USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $USAGE -gt 85 ]; then
  echo "ALERTA: Disco com $USAGE% de uso em $(date)" >> /var/log/disk-alert.log
  # Aqui pode enviar um email ou notificação
fi
EOF
chmod +x /root/scripts/check-disk.sh

# No crontab (executar a cada hora):
# 0 * * * * /root/scripts/check-disk.sh
```

### 5.6 Webhook Não Está Recebendo Mensagens

**Sintomas:**
- Pacientes enviam mensagens mas não recebem link
- Log do app não mostra activity do webhook
- Nenhum Customer novo sendo criado

**Checklist de Diagnóstico:**

```bash
# 1. A Evolution API está rodando?
docker ps | grep evolution

# 2. A instância WhatsApp está conectada?
curl -s http://localhost:8080/instance/connectionState/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .

# 3. O webhook está configurado na Evolution API?
curl -s http://localhost:8080/webhook/find/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .

# A URL deve ser: https://clinikzap.mariotech.com.br/api/webhook/whatsapp

# 4. Testar o webhook manualmente
curl -X POST https://clinikzap.mariotech.com.br/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPSERT",
    "instanceId": "clinikzap",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "test-manual-123"
      },
      "pushName": "Teste Operacional",
      "messageType": "conversation",
      "message": {
        "conversation": "Teste"
      }
    }
  }'

# 5. Verificar se o app está acessível externamente
curl -s -o /dev/null -w "%{http_code}" https://clinikzap.mariotech.com.br/login

# 6. Verificar o DNS do domínio
nslookup clinikzap.mariotech.com.br
```

**Reconfigurar o Webhook na Evolution API:**

```bash
# Se a URL do webhook estiver incorreta ou ausente, reconfigurar:
curl -X POST http://localhost:8080/webhook/set/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://clinikzap.mariotech.com.br/api/webhook/whatsapp",
      "webhookByEvents": true,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

### 5.7 Aplicação Não Inicia

**Sintomas:**
- `docker compose up -d` não completa
- Container `app` fica reiniciando (`restarting`)
- Logs mostram erros de inicialização

**Solução:**

```bash
# 1. Verificar logs do app
docker compose -f docker-compose.prod.yml logs --tail=50 app

# 2. Verificar se as migrations estão pendentes
docker exec clinikzap-app-prod npx prisma migrate status

# 3. Executar migrations manualmente
docker exec clinikzap-app-prod npx prisma migrate deploy

# 4. Verificar conectividade com o banco
docker exec clinikzap-app-prod npx prisma db execute --stdin <<< "SELECT 1"

# 5. Verificar variáveis de ambiente
docker exec clinikzap-app-prod env | grep -E "DATABASE|EVOLUTION|AUTH|NEXT"

# 6. Se necessário, rebuild total
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

### 5.8 Paciente Recebe Múltiplos Links

**Sintomas:**
- Paciente reclama que recebeu vários links de agendamento
- Múltiplos appointments PENDING criados para o mesmo paciente

**Causas e Soluções:**

```bash
# 1. Verificar se o Redis está funcionando (anti-flood depende dele)
docker exec clinikzap-redis-prod redis-cli PING

# 2. Verificar quantos locks ativos existem
docker exec clinikzap-redis-prod redis-cli KEYS "lock:welcome:*"

# 3. Verificar se o TTL está sendo aplicado corretamente
# (deve ser 900 segundos = 15 minutos)
docker exec clinikzap-redis-prod redis-cli TTL lock:welcome:5511999999999

# 4. Forçar expiração de um lock específico (se necessário)
docker exec clinikzap-redis-prod redis-cli DEL lock:welcome:5511999999999

# 5. Se o Redis não estiver disponível, iniciá-lo
docker compose -f docker-compose.prod.yml start redis
```

### 5.9 Lembretes Não Estão Sendo Enviados

**Sintomas:**
- Pacientes não recebem lembrete de consulta
- Log do cron não mostra activity

**Solução:**

```bash
# 1. Verificar se o cron está configurado no servidor
crontab -l | grep send-reminders

# 2. Testar o endpoint manualmente
curl -s https://clinikzap.mariotech.com.br/api/cron/send-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# 3. Verificar logs do cron
docker compose -f docker-compose.prod.yml logs --since=2h app | grep "\[Cron Reminders\]"

# 4. Verificar se há agendamentos elegíveis
docker exec clinikzap-app-prod npx prisma db execute --stdin <<< "
  SELECT COUNT(*) FROM \"Appointment\"
  WHERE status = 'CONFIRMED'
  AND \"reminderSent\" = false
  AND \"appointmentDate\" > NOW()
  AND \"appointmentDate\" < NOW() + INTERVAL '30 hours';
"

# 5. Verificar timezone do servidor
date
# O servidor deve estar em UTC. Ajustes de fuso são feitos na aplicação.

# 6. Se usando CRON_SECRET, verificar se é o mesmo configurado
grep CRON_SECRET /root/clinikzap/.env
```

---

## 6. Procedimentos de Emergência

### 6.1 Reinicialização Completa

Use este procedimento quando o sistema estiver completamente inoperante ou após uma falha grave.

```bash
# 1. Acessar o VPS
ssh root@<VPS_IP>

# 2. Verificar o estado atual
docker compose -f docker-compose.prod.yml ps

# 3. Parar todos os serviços
docker compose -f docker-compose.prod.yml down

# 4. Verificar se as portas foram liberadas
netstat -tlnp | grep -E '(3000|5432|6379|8080|80|443)'

# 5. Limpar recursos não utilizados (opcional)
docker system prune -f

# 6. Rebuild e iniciar todos os serviços
docker compose -f docker-compose.prod.yml up -d --build

# 7. Aguardar inicialização (30-60 segundos)
sleep 30

# 8. Verificar status
docker compose -f docker-compose.prod.yml ps

# 9. Verificar logs do app
docker compose -f docker-compose.prod.yml logs --tail=20 app

# 10. Verificar se o app responde
curl -s -o /dev/null -w "%{http_code}" https://clinikzap.mariotech.com.br/login

# 11. Verificar conexão Evolution API
curl -s http://localhost:8080/instance/connectionState/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .
```

**Tempo estimado:** 2-5 minutos

### 6.2 Recuperação de Dados

**Cenário:** Perda de dados do PostgreSQL (corrupção, exclusão acidental, falha de volume).

```bash
# 1. Identificar o backup mais recente
ls -lt /root/backups/clinikzap_*.sql.gz | head -1

# 2. Verificar integridade do backup
gunzip -c /root/backups/clinikzap_20260520_030000.sql.gz | head -50

# 3. Parar a aplicação (evitar escrita durante restore)
docker compose -f docker-compose.prod.yml stop app
docker compose -f docker-compose.prod.yml stop evolution-api

# 4. Restaurar o backup
gunzip -c /root/backups/clinikzap_20260520_030000.sql.gz | \
  docker exec -i clinikzap-postgres-prod psql -U postgres clinikzap

# 5. Verificar restauração
docker exec clinikzap-postgres-prod psql -U postgres clinikzap -c "SELECT COUNT(*) FROM \"User\";"
docker exec clinikzap-postgres-prod psql -U postgres clinikzap -c "SELECT COUNT(*) FROM \"Appointment\";"

# 6. Reiniciar os serviços
docker compose -f docker-compose.prod.yml start app
docker compose -f docker-compose.prod.yml start evolution-api

# 7. Verificar logs
docker compose -f docker-compose.prod.yml logs --tail=20 app
```

> **⚠️ Importante:** O restore substitui completamente o banco de dados. Qualquer dado criado após o backup será perdido.

**Cenário:** Perda do volume Docker do PostgreSQL.

```bash
# 1. Recriar o volume
docker compose -f docker-compose.prod.yml down
docker volume rm clinikzap_postgres_data_prod

# 2. Reiniciar o PostgreSQL (volume vazio será recriado)
docker compose -f docker-compose.prod.yml up -d postgres

# 3. Aguardar PostgreSQL iniciar
sleep 15

# 4. Restaurar o backup
gunzip -c /root/backups/clinikzap_20260520_030000.sql.gz | \
  docker exec -i clinikzap-postgres-prod psql -U postgres clinikzap

# 5. Aplicar migrations (se houver diferenças)
docker compose -f docker-compose.prod.yml run app npx prisma migrate deploy

# 6. Iniciar os demais serviços
docker compose -f docker-compose.prod.yml up -d
```

### 6.3 Rollback de Versão

**Cenário:** Deploy recente introduziu um bug crítico.

```bash
# Opção 1: Reverter commit e fazer novo deploy
# 1. Localmente
git revert HEAD
git push origin main

# 2. Ir ao GitHub Actions e disparar novo deploy manualmente
# https://github.com/marioandre01/clinikzap/actions/workflows/deploy.yml

# Opção 2: Rollback manual com versão anterior (se disponível)
# 1. No VPS, verificar se há tag anterior
docker images | grep clinikzap-app

# 2. Editar docker-compose.prod.yml para usar a imagem anterior
# Alterar: image: clinikzap-app:latest → image: clinikzap-app:<commit-hash-anterior>

# 3. Rebuild e restart
docker compose -f docker-compose.prod.yml up -d
```

**Rollback de Banco de Dados:**

```bash
# 1. Listar migrations
docker exec clinikzap-app-prod npx prisma migrate status

# 2. Se precisar reverter uma migration específica:
# 2a. Marcar migration como rolled back
docker exec clinikzap-app-prod npx prisma migrate resolve --rolled-back <migration-name>

# 2b. Restaurar dump do banco
gunzip -c /root/backups/clinikzap_20260519_030000.sql.gz | \
  docker exec -i clinikzap-postgres-prod psql -U postgres clinikzap
```

### 6.4 Procedimento em Caso de Queda da Evolution API

**Cenário:** Evolution API parou de funcionar completamente.

```bash
# 1. Verificar se o container está rodando
docker ps | grep evolution

# 2. Verificar logs para entender a causa
docker compose -f docker-compose.prod.yml logs --tail=50 evolution-api

# 3. Tentar restart do serviço
docker compose -f docker-compose.prod.yml restart evolution-api
sleep 15

# 4. Verificar se voltou
curl -s http://localhost:8080/instance/connectionState/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .

# 5. Se a API não estiver respondendo, verificar porta
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
# Resposta esperada: 200 (ou 404, mas deve responder)

# 6. Se a porta não responde, reiniciar o stack inteiro
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 7. Se o problema persistir, verificar espaço em disco
df -h

# 8. Recriar a instância (caso extremo)
# A aplicação tenta recriar automaticamente. Se falhar:
docker exec clinikzap-app-prod node -e "
  const { EvolutionService } = require('./src/services/evolution');
  EvolutionService.initInstance('clinikzap').then(() => console.log('OK'));
"
```

---

## 7. Checklist Diário/Semanal

### Diário

- [ ] Verificar `docker compose ps` — todos os serviços estão rodando?
- [ ] Verificar `df -h` — disco com menos de 80% de uso?
- [ ] Verificar logs do webhook — `docker compose logs app --since=1h | grep "\[Webhook WhatsApp\]"`
- [ ] Verificar se a Evolution API está conectada — `curl ... /connectionState`
- [ ] Verificar se backups estão sendo gerados — `ls -lh /root/backups/$(date +%Y%m%d)*`

### Semanal

- [ ] Verificar logs de erro mais detalhados — `grep -i "error\|fail\|exception"` nos logs
- [ ] Verificar renovação do SSL — acessar `https://clinikzap.mariotech.com.br` e verificar data de validade
- [ ] Verificar tamanho dos logs Docker — `docker system df`
- [ ] Verificar uso de memória do Redis — `docker exec clinikzap-redis-prod redis-cli INFO memory`
- [ ] Verificar número de pacientes e agendamentos no banco:

```bash
docker exec clinikzap-postgres-prod psql -U postgres clinikzap -c "
  SELECT
    (SELECT COUNT(*) FROM \"User\") as clinicas,
    (SELECT COUNT(*) FROM \"Customer\") as pacientes,
    (SELECT COUNT(*) FROM \"Appointment\") as agendamentos,
    (SELECT COUNT(*) FROM \"Appointment\" WHERE status = 'PENDING') as pendentes,
    (SELECT COUNT(*) FROM \"Appointment\" WHERE status = 'CONFIRMED') as confirmados,
    (SELECT COUNT(*) FROM \"Appointment\" WHERE status = 'CANCELED') as cancelados;
"
```

### Mensal

- [ ] Verificar e limpar backups antigos (manter no máximo 7 dias em disco)
- [ ] Verificar se há atualizações de segurança nos containers
- [ ] Revisar logs de erros recorrentes
- [ ] Testar restore de backup em ambiente de staging
- [ ] Rotacionar `AUTH_SECRET` se necessário

---

## 8. Contatos e Escalabilidade

| Papel | Responsável | Contato |
|-------|-------------|---------|
| **DevOps** | Time de operações | <operacoes@mariotech.com.br> |
| **Suporte Técnico** | Suporte ClinikZap | <suporte@clinikzap.com.br> |
| **Product Manager** | John | Via opencode |

### Critérios de Escalação

| Situação | Ação | Prazo |
|----------|------|-------|
| App fora do ar | Reinicialização completa | Imediato |
| Evolution API desconectada | Tentar reconexão, escalar se falhar | 30 min |
| Perda de dados | Restaurar backup + notificar PM | 1h |
| SSL expirado | Renovar no NPM | 2h |
| Erro não identificado | Analisar logs, escalar para dev | 4h |

---

> **Documento mantido por:** John, Product Manager
> **Última revisão:** Maio/2026
> **Próxima revisão:** Agosto/2026
