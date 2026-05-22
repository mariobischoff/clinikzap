# Referência da API — ClinikZap

**Versão:** 1.0
**Última atualização:** Maio/2026
**Base URL:** `https://clinikzap.mariotech.com.br` (produção) | `http://localhost:3000` (desenvolvimento)

---

## Sumário

| Rota | Método | Proteção | Descrição |
|------|--------|----------|-----------|
| `/api/auth/[...nextauth]` | POST/GET | - | Handlers NextAuth |
| `/api/webhook/whatsapp/[[...event]]` | POST | HMAC (implícito) | Webhook Evolution API |
| `/api/cron/send-reminders` | GET | Bearer Token | Lembrete automático |
| `/api/appointments/cancel` | POST | - | Cancelar agendamento via token |
| `/api/appointments/reschedule` | POST | - | Reagendar pela clínica |

---

## 1. Autenticação

### POST /api/auth/[...nextauth]

Handlers do NextAuth.js para login, sessão e logout.

**Métodos aceitos:**
- `POST /api/auth/callback/credentials` — Login com email + senha
- `GET /api/auth/session` — Obter sessão atual
- `GET /api/auth/signout` — Logout
- `GET /api/auth/csrf` — Token CSRF

**Request (Login — Credentials Provider):**

```json
{
  "email": "clinica@exemplo.com",
  "password": "senha123",
  "csrfToken": "token_csrf",
  "callbackUrl": "/dashboard",
  "json": true,
  "redirect": false
}
```

**Response (Sucesso):**

```json
{
  "url": "http://localhost:3000/dashboard",
  "status": 200,
  "ok": true,
  "user": {
    "id": "uuid-do-usuario",
    "email": "clinica@exemplo.com",
    "name": "Clínica Exemplo"
  }
}
```

**Response (Falha):**

```json
{
  "url": "http://localhost:3000/login?error=CredentialsSignin",
  "status": 401,
  "ok": false
}
```

**Possíveis Erros:**
| Código | Descrição |
|--------|-----------|
| 401 | Credenciais inválidas (email ou senha incorretos) |
| 401 | Usuário não encontrado |

---

## 2. Webhook WhatsApp

### POST /api/webhook/whatsapp/[[...event]]

Recebe eventos da Evolution API quando uma mensagem WhatsApp chega.

**Autenticação:** Nenhuma (a Evolution API é configurada com URL fixa via variável de ambiente `NEXT_PUBLIC_WEBHOOK_URL`)

**Request Body (Evolution API v2 — MESSAGES_UPSERT):**

```json
{
  "event": "MESSAGES_UPSERT",
  "instanceId": "clinikzap",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "BAES5AHCK..."
    },
    "pushName": "João Silva",
    "messageType": "conversation",
    "message": {
      "conversation": "Olá, gostaria de agendar"
    }
  }
}
```

**Response (Sucesso — 200):**

```json
{
  "message": "Webhook processed successfully"
}
```

**Response (Ignorado — 200):**

```json
{
  "message": "Ignored non-private chat"
}
```

**Response (Anti-flood — 200):**

```json
{
  "message": "Welcome lock active (anti-flood)"
}
```

**Response (Human-takeover — 200):**

```json
{
  "message": "Human-takeover active lock applied"
}
```

**Response (Sem clínica cadastrada — 200):**

```json
{
  "error": "No clinic registered yet"
}
```

**Códigos HTTP:**
| Código | Significado |
|--------|-------------|
| 200 | Processado ou ignorado (sempre 200 para evitar retentativas da Evolution) |
| 500 | Erro interno do servidor |

**Possíveis Errors (500):**

```json
{
  "error": "Internal server error",
  "details": "Mensagem do erro"
}
```

**Observações:**
- Mensagens de grupos (`@g.us`), broadcasts e newsletters são ignoradas
- Mensagens enviadas pela própria clínica (`fromMe: true`) ativam o modo human-takeover
- O anti-flood impede múltiplas respostas para o mesmo número em 15 minutos

---

## 3. Lembrete Automático (Cron)

### GET /api/cron/send-reminders

Endpoint chamado por um cron job (crontab, CronJob, etc.) para enviar lembretes de consultas.

**Autenticação:** Opcional — Bearer Token via `CRON_SECRET`

**Headers:**

```
Authorization: Bearer <CRON_SECRET>
```

**Response (Sucesso — 200):**

```json
{
  "message": "Processed 50 appointments, sent 3 reminders",
  "results": [
    {
      "id": "uuid-do-appointment",
      "phone": "5511999999999",
      "status": "sent"
    },
    {
      "id": "uuid-de-outro",
      "status": "failed",
      "error": "Failed to send message: 404"
    }
  ]
}
```

**Códigos HTTP:**
| Código | Significado |
|--------|-------------|
| 200 | Processado com sucesso (mesmo se alguns envios falharem) |
| 401 | `CRON_SECRET` configurado mas token não enviado ou inválido |
| 500 | Erro interno |

**Lógica de Disparo:**
- Busca appointments `CONFIRMED` com `reminderSent = false` e data futura
- Para cada um, calcula a janela: `[reminderHours - 1h, reminderHours + 1.5h]`
- Se estiver dentro da janela, envia o lembrete e marca `reminderSent = true`
- Usa o template personalizável da clínica (ou o default)

---

## 4. Cancelar Agendamento

### POST /api/appointments/cancel

Cancela um agendamento.

**Autenticação:** Requer sessão ativa (session cookie via NextAuth). Usuário deve ser dono do agendamento.

**Request Body:**

```json
{
  "token": "uuid-do-appointment-token"
}
```

**Response (Sucesso — 200):**

```json
{
  "message": "Appointment successfully canceled",
  "appointment": {
    "id": "uuid",
    "status": "CANCELED",
    "customerId": "uuid-customer",
    "userId": "uuid-user",
    "appointmentDate": "2026-05-22T14:00:00.000Z",
    "token": "uuid-token",
    "reminderSent": false,
    "createdAt": "2026-05-21T22:00:00.000Z",
    "updatedAt": "2026-05-21T22:30:00.000Z"
  }
}
```

**Response (Erro — 400):**

```json
{
  "error": "Cannot cancel appointment with status 'CANCELED'"
}
```

**Códigos HTTP:**
| Código | Significado |
|--------|-------------|
| 200 | Cancelado com sucesso |
| 400 | Token não enviado ou status inválido |
| 404 | Appointment não encontrado |
| 500 | Erro interno |

**Observações:**
- O token é o mesmo enviado no link de agendamento (`/schedule/[token]`)
- A mensagem de cancelamento é enviada via WhatsApp usando o template da clínica

---

## 5. Reagendar Agendamento

### POST /api/appointments/reschedule

Cria um novo agendamento pendente a partir de um existente (cancelando o original). Usado pela clínica para solicitar reagendamento.

**Autenticação:** Requer sessão ativa (session cookie via NextAuth). Usuário deve ser dono do agendamento original.

**Request Body:**

```json
{
  "appointmentId": "uuid-do-appointment-original"
}
```

**Response (Sucesso — 200):**

```json
{
  "message": "Appointment successfully rescheduled by clinic",
  "canceledAppointment": {
    "id": "uuid-original",
    "status": "CANCELED"
  },
  "newPendingAppointment": {
    "id": "uuid-novo",
    "status": "PENDING",
    "token": "novo-uuid-token"
  }
}
```

**Response (Erro — 400):**

```json
{
  "error": "Appointment is already canceled"
}
```

**Códigos HTTP:**
| Código | Significado |
|--------|-------------|
| 200 | Reagendado com sucesso |
| 400 | AppointmentId não enviado ou já cancelado |
| 401 | Sessão inativa (mock: sempre ativa) |
| 404 | Appointment original não encontrado |
| 500 | Erro interno |

**Observações:**
- Executa em transação Prisma (`$transaction`)
- Cria um novo appointment `PENDING` com data placeholder (+7 dias)
- Envia mensagem via WhatsApp com link para o novo agendamento
- O template de reagendamento é fixo (não customizável atualmente)

---

## 6. Server Actions (Next.js)

As Server Actions não são endpoints REST tradicionais, mas são invocadas diretamente dos componentes React. Estão documentadas aqui para referência.

### 6.1 schedule/actions.ts

#### `getAppointmentByToken(token: string): Promise<AppointmentDetails | null>`

Retorna os dados de um agendamento pelo token.

**Uso:** Página pública `/schedule/[token]`

#### `getAvailableSlots(dateStr: string, userId: string): Promise<string[]>`

Retorna os horários disponíveis para uma data e clínica específicas.

**Lógica:**
1. Busca exceções de disponibilidade para a data
2. Se existir exceção, usa seus slots (ou array vazio = dia bloqueado)
3. Se não, usa `weeklyHours` para o dia da semana
4. Se não houver weeklyHours, gera slots de 30 em 30 minutos (8h-12h, 13h-18h)
5. Remove horários já agendados (status CONFIRMED)

**Uso:** Componente `SchedulingForm` (step 2)

#### `confirmAppointment(token, dateStr, timeStr, customerName): Promise<{ success, error? }>`

Confirma o agendamento.

**Uso:** Componente `SchedulingForm` (step 3)

### 6.2 dashboard/actions.ts

#### `updateWeeklyHours(weeklyHours: Record<string, string[]>): Promise<{ success, error? }>`

Atualiza horários semanais da clínica.

#### `setAvailabilityException(dateStr, slots, blockAllDay): Promise<{ success, error? }>`

Define exceção de disponibilidade para uma data específica.

#### `deleteAvailabilityException(id: string): Promise<{ success, error? }>`

Remove uma exceção de disponibilidade.

#### `searchCustomers(query: string): Promise<Array<{id, name, phone}>>`

Busca pacientes por nome ou telefone (limite 10 resultados).

#### `createManualAppointment(data): Promise<{ success, error?, warning? }>`

Cria agendamento manualmente pelo painel admin.

#### `updateCustomerNotes(customerId, notes): Promise<{ success, error? }>`

Atualiza anotações do paciente.

#### `getCustomerHistory(customerId): Promise<{ success, customer?, appointments?, error? }>`

Retorna histórico completo de agendamentos do paciente.

#### `updateWhatsAppTemplates(templates): Promise<{ success, error? }>`

Atualiza templates de mensagens WhatsApp.

#### `updateReminderSettings(reminderHours: number): Promise<{ success, error? }>`

Atualiza o tempo de antecedência dos lembretes.

#### `getAdminAvailableSlots(dateStr: string): Promise<string[]>`

Wrapper de `getAvailableSlots` para o usuário logado.

#### `updateClinicDuration(duration: number): Promise<{ success, error? }>`

Atualiza a duração padrão da consulta (30, 45 ou 60 min).

---

## 7. Códigos de Erro (Padronizados)

| Código | Significado | Onde ocorre |
|--------|-------------|-------------|
| 400 | Bad Request — Dados inválidos ou faltantes | Cancel, Reschedule |
| 401 | Unauthorized — Autenticação necessária | Cron, Reschedule (futuro) |
| 404 | Not Found — Recurso não encontrado | Cancel, Reschedule |
| 500 | Internal Server Error — Erro inesperado | Todos os endpoints |

**Formato de erro padronizado:**

```json
{
  "error": "Mensagem descritiva do erro",
  "details": "Detalhes adicionais (apenas em 500, em desenvolvimento)"
}
```
