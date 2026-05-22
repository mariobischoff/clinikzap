# Especificação da Integração Webhook — Evolution API v2

**Produto:** ClinikZap  
**Versão:** 1.0  
**Data:** 21 de maio de 2026  
**Autor:** John, Product Manager

---

## 1. Visão Geral

O webhook é o ponto de entrada de todas as interações com pacientes. Ele recebe eventos `MESSAGES_UPSERT` da Evolution API v2 sempre que uma nova mensagem chega ao número de WhatsApp da clínica. O processamento inclui validação, filtragem anti-spam, detecção de human-takeover, e criação do fluxo de agendamento.

### 1.1 Arquitetura

```
 WhatsApp              Evolution API v2              ClinikZap                    Redis/Postgres
   Cloud              (docker-compose)             (Next.js Route)
┌────────┐     ┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│        │     │                     │     │                      │     │                  │
│ Usuário│────▶│ Instância WhatsApp  │────▶│ POST /api/webhook/   │────▶│ Validar payload  │
│ enviou │     │ (Baileys)          │     │ whatsapp/[[...event]]│     │                  │
│ msg    │     │                     │     │                      │     ├──────────────────┤
│        │     │                     │     │                      │     │ Verificar:       │
└────────┘     └─────────────────────┘     │                      │     │ - Chat privado?  │
                                           │                      │     │ - fromMe?        │
                                           │                      │     │ - Silenciado?    │
                                           │                      │     │ - Anti-flood?    │
                                           │                      │     ├──────────────────┤
                                           │                      │     │ Buscar/Criar     │
                                           │                      │     │ Customer +       │
                                           │                      │     │ Appointment      │
                                           │                      │     ├──────────────────┤
                                           │                      │     │ Enviar WhatsApp  │
                                           │                      │     │ (Evolution API)  │
                                           └──────────────────────┘     └──────────────────┘
```

### 1.2 Fluxo de Dados

```
Evolution API → HTTP POST → Next.js Route Handler → Prisma (PostgreSQL) → Evolution API (response)
                                ↕
                            Redis (locks)
```

---

## 2. Payload da Evolution API v2

### 2.1 Formato do Evento MESSAGES_UPSERT

A Evolution API v2 envia webhooks no formato abaixo quando configurada com `webhookByEvents: true` e evento `MESSAGES_UPSERT`.

```json
{
  "event": "MESSAGES_UPSERT",
  "instanceId": "clinikzap",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "ABGGkI5t0N0I0kL9CwV8Xp9d"
    },
    "pushName": "João Silva",
    "messageType": "conversation",
    "message": {
      "conversation": "Olá, gostaria de agendar uma consulta"
    }
  }
}
```

### 2.2 Variações da Mensagem

| Campo | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `event` | `string` | Nome do evento | `"MESSAGES_UPSERT"` |
| `instanceId` | `string` | Nome da instância | `"clinikzap"` |
| `data.key.remoteJid` | `string` | JID do remetente no formato `numero@domain` | `"5511999999999@s.whatsapp.net"` |
| `data.key.fromMe` | `boolean` | `true` se foi a clínica que enviou | `false` |
| `data.key.id` | `string` | ID único da mensagem | `"ABGGkI5t..."` |
| `data.pushName` | `string` | Nome do contato no WhatsApp (opcional) | `"João Silva"` |
| `data.messageType` | `string` | Tipo da mensagem | `"conversation"`, `"extendedTextMessage"` |
| `data.message.conversation` | `string` | Texto da mensagem (se tipo conversation) | `"Olá"` |
| `data.message.extendedTextMessage.text` | `string` | Texto da mensagem (se tipo extendedTextMessage) | `"Olá"` |

### 2.3 Tipos de Mensagem Suportados

| messageType | Campo de texto | Suportado |
|---|---|---|
| `conversation` | `message.conversation` | ✅ Sim |
| `extendedTextMessage` | `message.extendedTextMessage.text` | ✅ Sim |
| `imageMessage` | — | ❌ Não (ignorado) |
| `audioMessage` | — | ❌ Não (ignorado) |
| `videoMessage` | — | ❌ Não (ignorado) |
| `documentMessage` | — | ❌ Não (ignorado) |
| `reactionMessage` | — | ❌ Não (ignorado) |
| `locationMessage` | — | ❌ Não (ignorado) |
| `contactMessage` | — | ❌ Não (ignorado) |
| `buttonsResponseMessage` | — | ❌ Não (ignorado) |
| `listResponseMessage` | — | ❌ Não (ignorado) |

Atualmente o ClinikZap **não diferencia o tipo de mensagem**. Qualquer mensagem de texto (conversation ou extendedTextMessage) dispara o mesmo fluxo de boas-vindas. Mensagens de mídia são ignoradas na prática porque o handler não as processa.

### 2.4 Interface TypeScript

```typescript
// src/app/api/webhook/whatsapp/[[...event]]/route.ts

interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

interface EvolutionMessageData {
  key: EvolutionMessageKey;
  pushName?: string;
  messageType?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
  };
}

interface EvolutionWebhookBody {
  event: string;
  instanceId: string;
  data: EvolutionMessageData;
}
```

---

## 3. Filtragem de Mensagens

### 3.1 Critérios de Filtro

O webhook deve ignorar mensagens que não sejam de agendamento. Os filtros são aplicados em ordem:

| Ordem | Filtro | Condição | Ação |
|---|---|---|---|
| 1 | Estrutura inválida | `!data \|\| !data.key` | Log + retornar 200 |
| 2 | Grupo | `remoteJid.includes('@g.us')` | Log + ignorar |
| 3 | Broadcast | `remoteJid.includes('@newsletter') \|\| remoteJid.includes('@broadcast')` | Log + ignorar |
| 4 | Não privado | `!remoteJid.endsWith('@s.whatsapp.net')` | Log + ignorar |
| 5 | Telefone inválido | `!phone` (após split) | Log + ignorar |
| 6 | fromMe = true | `data.key.fromMe === true` | Ativar human-takeover |
| 7 | Human-takeover ativo | `silence:{phone}` existe no Redis | Ignorar |
| 8 | Anti-flood ativo | `lock:welcome:{phone}` existe no Redis | Ignorar |

### 3.2 Regras de Filtro Detalhadas

#### 3.2.1 Chat Privado vs. Grupo

```typescript
// remoteJid termina com @s.whatsapp.net → chat privado → processa
// remoteJid contém @g.us → grupo → ignora
// remoteJid contém @newsletter ou @broadcast → canal → ignora
// Qualquer outro formato → ignora
```

#### 3.2.2 fromMe (Mensagem Enviada pela Clínica)

Quando `fromMe: true`, significa que a **secretária/profissional** respondeu o paciente manualmente. Nesse caso:

1. Ativar **human-takeover mode** para este chat
2. Setar chave `silence:chat:{phone}` no Redis com TTL de **1 hora**
3. Durante essa hora, o bot não responde automaticamente a este paciente
4. Isso permite que a secretária assuma o atendimento sem interferência do bot

```typescript
// fromMe detectado
const silenceKey = `silence:chat:${phone}`;
await redis.set(silenceKey, 'true', 'EX', 3600); // 1 hora
```

#### 3.2.3 Exemplo: Grupo é Ignorado

```json
{
  "data": {
    "key": {
      "remoteJid": "5511999999999-123456@g.us"
    }
  }
}
```
▶ Retorna `200` com mensagem `"Ignored non-private chat"`.

---

## 4. Estratégia Anti-Flood

### 4.1 Problema

Um paciente pode enviar múltiplas mensagens seguidas ("Olá", "Oi", "Tem horário?", "Alo?"). Sem proteção, cada mensagem geraria um novo link de agendamento, causando confusão e spam.

### 4.2 Solução — Lock no Redis

**Mecanismo:** Lock por telefone com TTL de 15 minutos.

```typescript
const lockKey = `lock:welcome:${phone}`;
const isLocked = await redis.exists(lockKey);

if (isLocked) {
  // Ignorar: já enviamos link nos últimos 15 min
  return NextResponse.json({ message: 'Welcome lock active (anti-flood)' }, { status: 200 });
}

// Aplicar lock
await redis.set(lockKey, 'true', 'EX', 900); // 15 minutos
// ... processar mensagem
```

### 4.3 Comportamento Esperado

| Sequência | Ação |
|---|---|
| 1ª mensagem (09:00) | Lock criado, link enviado |
| 2ª mensagem (09:05) | Lock ativo, ignorado |
| 3ª mensagem (09:12) | Lock ativo, ignorado |
| 4ª mensagem (09:16) | Lock expirado, link enviado novamente |

### 4.4 Limpeza Automática

- TTL de 900 segundos (15 min) garante que o lock expire automaticamente
- Não é necessário job de limpeza
- Redis cuida da expiração

---

## 5. Human-Takeover (Silence Mode)

### 5.1 Conceito

O human-takeover permite que a secretária da clínica "assuma" uma conversa. Quando ela responde o paciente pelo WhatsApp, o bot detecta `fromMe: true` e ativa o modo silêncio para aquele chat por 1 hora.

### 5.2 Fluxo

```
1. Paciente envia: "Olá, quero agendar"
2. Bot responde com link de agendamento
3. Secretária responde: "Pode me informar seu nome?" (fromMe = true)
4. Bot detecta fromMe → silence:chat:{phone} = 1h
5. Paciente responde: "João Silva"
6. Bot verifica silence lock → NÃO responde (ignorado)
7. Secretária continua atendimento manual
8. Após 1h, silence expira → bot volta a responder
```

### 5.3 Redis Keys

| Chave | TTL | Quando é criada | Efeito |
|---|---|---|---|
| `lock:welcome:{phone}` | 900s (15 min) | Ao enviar link | Impede reenvio de link |
| `silence:chat:{phone}` | 3600s (1 hora) | Quando fromMe=true | Bot ignora o chat |

### 5.4 Importante

- Silence mode é por chat (telefone), não global
- Silence mode NÃO impede a secretária de enviar mensagens (só impede o bot)
- Se a secretária parar de responder por 1h, o bot volta a atender

---

## 6. Configuração do Webhook na Evolution API

### 6.1 Registro Automático

Na inicialização da aplicação (ou primeiro acesso ao dashboard de conexão), o ClinikZap configura o webhook automaticamente:

```typescript
// EvolutionService.initInstance() → registerWebhook()
await this.fetchWithTimeout(`${apiUrl}/webhook/set/${instanceName}`, {
  method: 'POST',
  headers: { 'apikey': apiKey },
  body: JSON.stringify({
    webhook: {
      enabled: true,
      url: 'https://app.clinikzap.com.br/api/webhook/whatsapp',
      webhookByEvents: true,
      events: ['MESSAGES_UPSERT'],
    }
  }),
});
```

### 6.2 Settings da Instância

```typescript
await this.fetchWithTimeout(`${apiUrl}/settings/set/${instanceName}`, {
  method: 'POST',
  headers: { 'apikey': apiKey },
  body: JSON.stringify({
    rejectCall: false,       // Rejeitar chamadas de voz
    groupsIgnore: true,      // Ignorar grupos
    alwaysOnline: false,     // Não forçar always-online
    readMessages: false,     // Não marcar mensagens como lidas
    readStatus: false,       // Não ler status
    syncFullHistory: false,  // Não sincronizar histórico
  }),
});
```

### 6.3 Verificação de Webhook

Antes de registrar, o sistema verifica se o webhook já está configurado:

```typescript
const existingWebhook = await fetch(`${apiUrl}/webhook/find/${instanceName}`);
// Se webhook.enabled === true e webhook.url === expectedUrl → skip
```

### 6.4 Variáveis de Ambiente

| Variável | Exemplo | Propósito |
|---|---|---|
| `EVOLUTION_API_URL` | `http://localhost:8080` | URL base da Evolution API |
| `EVOLUTION_API_KEY` | `42a83c48-8424-4f9e-a843-982823a35cfb` | API Key |
| `EVOLUTION_INSTANCE_NAME` | `clinikzap` | Nome da instância |
| `NEXT_PUBLIC_WEBHOOK_URL` | `https://app.clinikzap.com.br/api/webhook/whatsapp` | URL pública do webhook |

---

## 7. Tratamento de Erros e Retry

### 7.1 Estratégia de Erros

| Erro | Causa | Ação |
|---|---|---|
| Payload inválido | Malformed JSON ou estrutura incorreta | Log + retornar 200 |
| Falha no Redis | Redis offline | Log + tentar sem lock (graceful degradation) |
| Falha no PostgreSQL | Banco offline | Retornar 500 (Evolution retentará) |
| Falha na Evolution API | API offline ou timeout | Log + fluxo continua |
| Timeout na Evolution | Rede lenta | Capturar exceção, log, não interromper fluxo |
| Rate limit da Evolution | Muitas requisições | Log + aguardar próximo webhook |

### 7.2 Timeout nas Chamadas Evolution

Todas as chamadas à Evolution API usam timeout de 5 segundos:

```typescript
// EvolutionService.fetchWithTimeout()
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), 5000);
return await fetch(url, { ...options, signal: controller.signal });
```

### 7.3 Graceful Degradation

O webhook é projetado para continuar funcionando mesmo se serviços auxiliares falharem:

1. **Se Redis falhar**: o lock não é aplicado (paciente pode receber múltiplos links em sucessão rápida, mas o banco impede duplicatas)
2. **Se envio de WhatsApp falhar**: o agendamento é criado, mas sem notificação (log de erro)
3. **Se PostgreSQL falhar**: retorna 500, a Evolution API reenviará o webhook

---

## 8. Considerações de Segurança

### 8.1 Validação de Origem

Atualmente, o webhook **não valida a origem** da requisição. Isso significa que qualquer cliente que consiga fazer POST para o endpoint pode simular um webhook. **Mitigação futura:** validar IP da Evolution API ou usar token de autenticação.

### 8.2 Dados Sensíveis

- O payload do webhook **não é armazenado** em banco de dados
- Apenas o telefone e nome do paciente são salvos (Customer)
- Mensagens WhatsApp não são logadas em produção
- Logs em desenvolvimento podem conter payloads completos (console.log)

### 8.3 Proteção contra Ataques

| Ameaça | Mitigação |
|---|---|
| Spoofing de webhook | Futuro: validação de IP/token |
| Flood de requisições | Anti-flood via Redis (15 min) |
| Injeção de dados | TypeScript estrito + validação de tipos |
| Exposição de chaves | API keys em variáveis de ambiente |
| Acesso indevido a tokens | Tokens UUID aleatórios (não sequenciais) |

### 8.4 Headers de Segurança

O Next.js em produção deve configurar:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

(Configurado via `next.config.ts` ou middleware)

---

## 9. Monitoramento e Observabilidade

### 9.1 Logs Estruturados

Todos os eventos importantes são logados com prefixo `[Webhook WhatsApp]`:

```
[Webhook WhatsApp] Received event: {event: "MESSAGES_UPSERT", instanceId: "clinikzap", ...}
[Webhook WhatsApp] Ignoring non-private chat message from remoteJid: ...
[Webhook WhatsApp] Outgoing message from clinic secretary detected. Setting human-takeover bypass lock for 5511999999999.
[Webhook WhatsApp] Bot response bypassed. Chat with 5511999999999 is currently silenced.
[Webhook WhatsApp] Welcome lock exists for 5511999999999 (anti-flood check).
[Webhook WhatsApp] No locks found. Setting lock:welcome:5511999999999 with 15 minutes TTL.
[Webhook WhatsApp] Customer João Silva (5511999999999) has active appointment. Sending contextual message.
[Webhook WhatsApp] Customer João Silva (5511999999999) has no active appointments. Triggering onboarding welcome message.
[Webhook WhatsApp] Created new Customer record: João Silva (5511999999999)
[Webhook WhatsApp] Onboarding scheduling link sent successfully to 5511999999999
[Webhook WhatsApp] Contextual message sent successfully to 5511999999999
[Webhook WhatsApp] Error processing webhook: ...
```

### 9.2 Métricas Sugeridas

| Métrica | Onde | Como |
|---|---|---|
| Webhooks recebidos/min | Dashboard de monitoramento | Contador no endpoint |
| Webhooks ignorados (filtro) | Dashboard de monitoramento | Contador por tipo de filtro |
| Locks criados (anti-flood) | Redis/Rate limiting dashboard | Contador |
| Human-takeover ativado | Dashboard | Contador |
| Customers criados | PostgreSQL | Query de contagem |
| Appointments criados | PostgreSQL | Query de contagem |
| Mensagens WhatsApp enviadas | Evolution API | Log de resposta |

---

## 10. Cenários de Teste

### 10.1 Testes Manuais

**Arquivo de teste:** `tests/test-webhook.js`

```bash
node tests/test-webhook.js
```

### Cenários para Teste Manual

| # | Cenário | Entrada Esperada | Resultado Esperado |
|---|---|---|---|
| 1 | Paciente novo envia "Olá" | Webhook com pushName "João" | Customer criado, Appointment PENDING, link enviado |
| 2 | Paciente envia áudio | Payload sem message.conversation | Webhook processa mas link é enviado (comportamento atual) |
| 3 | Mensagem de grupo | remoteJid com @g.us | Ignorado com log |
| 4 | Duas mensagens rápidas | 2 webhooks no mesmo minuto | 1º processado, 2º bloqueado pelo anti-flood |
| 5 | Secretária responde | fromMe = true | Silence mode ativado por 1h |
| 6 | Paciente com CONFIRMED ativo | Já tem consulta confirmada | Mensagem contextual informando |
| 7 | Paciente com PENDING ativo | Já tem link pendente | Link reenviado |
| 8 | Payload inválido | JSON sem data.key | 200 com "Invalid payload structure" |

### 10.2 Teste de Carga (Sugestão)

- Enviar 100 webhooks simultâneos para o mesmo telefone
- Apenas o primeiro deve ser processado (anti-flood)
- Os 99 restantes devem ser ignorados

---

## 11. Fluxo Detalhado do Handler

### 11.1 Pseudocódigo

```
POST /api/webhook/whatsapp/[[...event]]
  try:
    body = parseJSON(req)
    data = body.data

    if !data OR !data.key:
      return 200("Invalid payload")

    remoteJid = data.key.remoteJid
    phone = remoteJid.split('@')[0]

    // FILTER: Non-private chat
    if isGroup OR isBroadcast OR !isPrivate:
      return 200("Ignored")

    // FILTER: Invalid phone
    if !phone:
      return 200("Invalid phone format")

    // HUMAN-TAKEOVER: fromMe
    if data.key.fromMe:
      redis.set("silence:chat:{phone}", "true", 3600)
      return 200("Human-takeover active")

    // FILTER: Silence mode
    if redis.exists("silence:chat:{phone}"):
      return 200("Chat is silenced")

    // ANTI-FLOOD
    if redis.exists("lock:welcome:{phone}"):
      return 200("Anti-flood active")

    // APPLY LOCK
    redis.set("lock:welcome:{phone}", "true", 900)

    // FETCH CLINIC
    clinic = prisma.user.findFirst()
    if !clinic:
      return 200("No clinic registered")

    // FIND OR CREATE CUSTOMER
    customer = prisma.customer.findUnique(phone + userId)
    activeAppointment = customer ? findActiveAppointment(customer.id) : null

    if activeAppointment:
      sendContextualMessage(activeAppointment, phone)
    else:
      if !customer:
        customer = prisma.customer.create(name, phone, userId)
      appointment = prisma.appointment.create(customerId, userId, PENDING)
      sendWelcomeMessage(phone, appointment.token)

    return 200("Processed")

  catch error:
    log error
    return 500("Internal error")
```

### 11.2 Fluxograma

```
        ┌──────────────────┐
        │  POST /webhook/  │
        │  whatsapp/[...]  │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Parsing JSON     │◀──── Error ──▶ Retornar 200
        │ Validar data.key │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Extrair remoteJid│
        │ e phone          │
        └────────┬─────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │ remoteJid é chat privado?           │
        │ (@s.whatsapp.net)                   │
        └──────┬───────────────┬──────────────┘
               │ Não           │ Sim
               ▼               ▼
        ┌────────────┐  ┌──────────────────────────┐
        │ Retornar   │  │ fromMe?                   │
        │ 200        │  ├──────┬───────────────────┤
        │ "Ignorado" │  │ Sim  │ Não               │
        └────────────┘  │      │                   │
                        ▼      ▼                   │
                 ┌────────────┐                    │
                 │ Human-    │                    │
                 │ takeover  │                    │
                 │ (silence) │                    │
                 └────────────┘                    │
                        │                          │
                        ▼                          ▼
                 ┌────────────────────────┐ ┌────────────────────┐
                 │ Retornar 200           │ │ Silence ativo?     │
                 │ "Human-takeover"       │ ├──────┬─────────────┤
                 └────────────────────────┘ │ Sim  │ Não         │
                                            │      │             │
                                            ▼      ▼             │
                                     ┌────────┐                  │
                                     │ Retorn │                  │
                                     │ 200    │                  │
                                     │ "Silên-│                  │
                                     │ cio"   │                  │
                                     └────────┘                  │
                                            │                    │
                                            ▼                    ▼
                                     ┌──────────────────────────────┐
                                     │ Anti-flood ativo?            │
                                     ├──────┬───────────────────────┤
                                     │ Sim  │ Não                   │
                                     ▼      ▼                       │
                               ┌────────┐                          │
                               │ Retorn │                          │
                               │ 200    │                          │
                               │ "Flood"│                          │
                               └────────┘                          │
                                      │                            │
                                      ▼                            ▼
                               ┌──────────────────────────────────────┐
                               │ Aplicar lock anti-flood              │
                               │ Redis SET lock:welcome:{phone} 900s  │
                               └──────────────────────────────────────┘
                                      │
                                      ▼
                               ┌──────────────────────────────────────┐
                               │ Buscar clínica (User.findFirst)     │
                               │ Se não existe: retornar 200          │
                               └──────────────────────────────────────┘
                                      │
                                      ▼
                               ┌──────────────────────────────────────┐
                               │ Buscar/Criar Customer                │
                               │ Verificar activeAppointment          │
                               ├──────────────────────────────────────┤
                               │ Se tem ativo  → mensagem contextual  │
                               │ Se não tem     → criar + link        │
                               └──────────────────────────────────────┘
                                      │
                                      ▼
                               ┌──────────────────────────────────────┐
                               │ Enviar WhatsApp via Evolution API    │
                               └──────────────────────────────────────┘
                                      │
                                      ▼
                               ┌──────────────────────────────────────┐
                               │ Retornar 200 "Processed"             │
                               └──────────────────────────────────────┘
```

---

## 12. Dependências Externas

### 12.1 Evolution API v2

- **Imagem Docker:** `evoapicloud/evolution-api:v2.3.1`
- **Porta:** 8080
- **Documentação:** https://doc.evolution-api.com/v2
- **Autenticação:** API Key via header `apikey`

### 12.2 Redis

- **Imagem Docker:** `redis:7-alpine`
- **Porta:** 6379
- **Uso no webhook:** Locks anti-flood e human-takeover
- **Chaves utilizadas:**
  - `lock:welcome:{phone}` — TTL 900s
  - `silence:chat:{phone}` — TTL 3600s

### 12.3 PostgreSQL

- **Imagem Docker:** `postgres:15-alpine`
- **Porta:** 5432
- **Uso no webhook:** CRUD de Customer e Appointment

---

## 13. Troubleshooting

### 13.1 Webhook não está sendo chamado

1. Verificar se `NEXT_PUBLIC_WEBHOOK_URL` está configurada e acessível externamente
2. Verificar logs da Evolution API: `docker logs clinikzap-evolution-api`
3. Verificar se a instância está conectada (QR code escaneado)
4. Testar com curl:
   ```bash
   curl -X POST http://localhost:3000/api/webhook/whatsapp/test \
     -H "Content-Type: application/json" \
     -d '{"event":"MESSAGES_UPSERT","data":{"key":{"remoteJid":"5511999999999@s.whatsapp.net","fromMe":false}}}'
   ```

### 13.2 Link duplicado sendo enviado

1. Verificar se o Redis está rodando: `docker ps | grep redis`
2. Verificar se as chaves de lock estão expirando: `redis-cli TTL lock:welcome:5511999999999`

### 13.3 Bot respondendo mesmo com secretária ativa

1. Verificar se `fromMe: true` está sendo detectado corretamente
2. Verificar se `silence:chat:{phone}` está sendo criada no Redis
3. A secretária pode ter respondido de outro dispositivo/número

### 13.4 Erro "No clinic registered"

1. Acessar o dashboard e criar uma conta de administrador
2. Verificar se existe pelo menos um `User` no banco: `SELECT * FROM "User";`
