# ADR-002: Arquitetura de Webhook WhatsApp

**Data:** 2026-05-21  
**Status:** Aceito  
**Autor:** Winston — System Architect

---

## Contexto

O ClinikZap depende de integração com WhatsApp como principal canal de comunicação com pacientes. O fluxo crítico do negócio é:

1. Paciente envia mensagem → sistema detecta → cria agendamento pendente → envia link de scheduling
2. Paciente clica no link → confirma horário → sistema envia confirmação
3. 24h antes → sistema envia lembrete automático

Para viabilizar este fluxo, foi necessário escolher um gateway WhatsApp e definir uma arquitetura de webhook que fosse confiável, de baixo custo e adequada para uma operação SaaS com múltiplas clínicas no futuro.

### Alternativas Consideradas

| Gateway | Tipo | Custo estimado (mensal) |
|---|---|---|
| **WhatsApp Business API (Cloud API)** | Oficial Meta | ~US$ 0,005/mensagem + taxas |
| **Twilio WhatsApp API** | Agregador oficial | ~US$ 0,005/mensagem |
| **Evolution API v2** | Self-hosted (Baileys) | Custo do servidor apenas |
| **Baileys direto** | Biblioteca Node.js | Custo do servidor apenas |
| **WWebJS (whatsapp-web.js)** | Automação via Puppeteer | Custo do servidor + RAM |

---

## Decisão

**Optamos pela Evolution API v2 (Baileys-based) como gateway WhatsApp, auto-hospedada via Docker.**

### Arquitetura Geral do Webhook

```
┌──────────────┐     Mensagem      ┌──────────────┐    HTTP POST    ┌──────────────────┐
│   Paciente   │ ────────────────> │  Evolution    │ ─────────────> │  Next.js App      │
│  (WhatsApp)  │                   │  API v2       │                │  /api/webhook/    │
└──────────────┘                   │  (Docker)     │                │  whatsapp/        │
        │                          └──────┬───────┘                └────────┬─────────┘
        │                                 │                                 │
        │                         ┌───────┴────────┐                ┌──────┴────────┐
        │                         │   PostgreSQL    │                │    Redis       │
        │                         │  (Evolution DB) │                │ (anti-flood    │
        │                         └────────────────┘                │  + silêncio)   │
        │                                                           └───────────────┘
        │                                                                   │
        └───────────────────── Mensagem de resposta ◄───────────────────────┘
                              (Evolution API /message/sendText)
```

### Componentes da Decisão

**1. Evolution API v2 como Gateway**

A Evolution API é um software open-source auto-hospedado que utiliza a biblioteca **Baileys** (implementação não-oficial do protocolo WhatsApp Web em TypeScript). Ela expõe uma API REST completa para:

- Gerenciamento de instâncias (criar, conectar, desconectar)
- Envio e recebimento de mensagens
- Webhooks por evento
- Gerenciamento de QR Code para conexão

**Por que escolhemos a Evolution API:**

- **Custo reduzido**: não há taxa por mensagem. O custo é exclusivamente o VPS onde a aplicação e os containers rodam.
- **Self-hosted**: controle total sobre os dados — as mensagens dos pacientes não passam por servidores de terceiros (Meta, Twilio).
- **Múltiplas instâncias**: suporte nativo a múltiplas conexões WhatsApp, essencial para o plano de multi-tenancy (cada clínica terá sua própria instância).
- **API REST completa**: integração simples com Next.js via fetch, sem necessidade de SDKs complexos.
- **Webhook por eventos**: configuração de webhooks específicos (`MESSAGES_UPSERT`), ignorando eventos desnecessários.
- **Comunidade ativa**: o projeto Evolution API tem grande adoção no Brasil, com comunidade ativa e atualizações frequentes.

**2. Single Endpoint Pattern**

Todas as mensagens recebidas chegam a um único endpoint:

```
POST /api/webhook/whatsapp/[[...event]]/route.ts
```

O catch-all segment (`[[...event]]`) foi usado para capturar qualquer variação de path que a Evolution API possa enviar, garantindo resiliência.

O fluxo de processamento no endpoint é:

1. **Validação de payload**: verifica se `data.key` existe.
2. **Filtro de chats**: ignora grupos (`@g.us`), broadcasts (`@broadcast`, `@newsletter`) e mensagens de canais. Processa apenas mensagens privadas (`@s.whatsapp.net`).
3. **Extração do telefone**: remove o sufixo `@s.whatsapp.net` do `remoteJid`.
4. **Human-takeover detection**: se `fromMe` for `true` (secretária respondendo), ativa o modo silêncio.
5. **Anti-flood**: verifica lock no Redis para evitar múltiplos welcomes em curto espaço de tempo.
6. **Processamento**: busca ou cria Customer + cria PENDING Appointment → envia link de scheduling via WhatsApp.

**3. Anti-Flood via Redis (15 minutos)**

```typescript
const lockKey = `lock:welcome:${phone}`;
await redis.set(lockKey, 'true', 'EX', 900); // 15 minutos TTL
```

**Motivação:** pacientes podem enviar múltiplas mensagens seguidas ("Olá", "oie", "tá funcionando?"). Sem o lock, cada mensagem geraria um novo link de agendamento e uma nova mensagem de WhatsApp, resultando em spam e confusão.

**Funcionamento:**
- Quando uma mensagem é processada, um lock é criado no Redis com chave `lock:welcome:{phone}` e TTL de 15 minutos.
- Mensagens subsequentes dentro da janela de 15 minutos são ignoradas (retornam `200 OK` sem processamento).
- Após 15 minutos sem interação, o lock expira automaticamente e uma nova mensagem do paciente reinicia o fluxo.

**4. Human-Takeover Silence Mode (1 hora)**

```typescript
const silenceKey = `silence:chat:${phone}`;
await redis.set(silenceKey, 'true', 'EX', 3600); // 1 hora TTL
```

**Motivação:** quando um atendente humano (secretária da clínica) começa a conversar com o paciente pelo WhatsApp, o bot não deve mais interferir. Do contrário, o paciente receberia mensagens automáticas concorrendo com a atendente.

**Funcionamento:**
- Quando o webhook recebe uma mensagem com `fromMe = true` (mensagem enviada pela clínica), um lock de silêncio é ativado para aquele chat por 1 hora.
- Enquanto o lock de silêncio estiver ativo, qualquer mensagem do paciente é ignorada pelo bot.
- Após 1 hora sem interação da clínica, o silêncio expira e o bot volta a operar normalmente.

**5. Filtro de Privacidade (`groupsIgnore: true`)**

Durante a inicialização da instância (`initInstance`), configuramos:

```typescript
groupsIgnore: true  // Ignora mensagens de grupos
```

Isso evita que o bot reaja a mensagens em grupos onde o número da clínica está presente.

---

## Consequências

### Positivas

- **Custo operacional praticamente zero**: sem taxa por mensagem, sem custos de API de terceiros.
- **Privacidade e compliance**: dados dos pacientes não transitam por servidores de Meta/Twilio. LGPD mais fácil de garantir.
- **Controle total**: podemos configurar cada aspecto da instância (webhook, settings, histórico).
- **Resiliência**: Redis locks previnem comportamentos anômalos (flood, interferência humana).
- **Separation of concerns**: Evolution API gerencia a conexão WhatsApp, Next.js gerencia a lógica de negócio.
- **Múltiplas instâncias**: fundação para suporte a múltiplas clínicas no futuro (ADR-005).

### Negativas

- **Risco de bloqueio**: o uso de Baileys (não-oficial) viola os Termos de Serviço do WhatsApp. Embora raro, há risco de bloqueio temporário ou permanente do número.
- **Qualidade da conexão**: por não ser oficial, a conexão pode cair com mais frequência, exigindo reconexão via QR Code.
- **Manutenção da Evolution API**: o container precisa ser atualizado periodicamente para acompanhar mudanças no protocolo WhatsApp.
- **Latência**: por ser self-hosted, a qualidade da entrega de mensagens depende da infraestrutura do VPS.
- **Sem suporte a templates oficiais**: a Evolution API não suporta WhatsApp Business API templates (media, botões, listas) — apenas texto simples.
- **Perda de mensagens durante downtime**: se o servidor estiver fora do ar, mensagens enviadas pelos pacientes são perdidas (a Evolution API não faz replay de webhooks).

### Compliance e Notas Técnicas

- O webhook retorna **sempre HTTP 200** para evitar que a Evolution API tente reenviar mensagens não processáveis.
- Em desenvolvimento, `EVOLUTION_SEND_IN_DEV=false` faz com que as mensagens sejam apenas logadas no console, evitando spam acidental.
- A exposição do localhost para testes com WhatsApp real usa ferramentas como `localtunnel` ou `pinggy`.
- O webhook deve ser registrado na Evolution API durante a inicialização da instância (`EvolutionService.initInstance`).
- Em produção, recomenda-se configurar um sistema de fila (ex: BullMQ + Redis) para garantir que nenhuma mensagem seja perdida durante picos ou instabilidades.
