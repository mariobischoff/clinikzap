# Documentação do Banco de Dados — ClinikZap

**Versão:** 1.0
**Última atualização:** Maio/2026
**SGBD:** PostgreSQL 15
**ORM:** Prisma v6
**Schema principal:** `public`

---

## 1. Visão Geral do Esquema

```
┌───────────────────┐       ┌─────────────────────┐
│       User        │       │      Customer        │
│───────────────────│       │─────────────────────│
│ id (PK, UUID)     │──┐   │ id (PK, UUID)        │
│ email (UNIQUE)    │  │   │ name (String)         │
│ password (hash)   │  │   │ phone (String)        │
│ name              │  │   │ userId (FK → User)    │
│ workingHours[]    │  │   │ notes (String?)       │
│ weeklyHours (JSON)│  │   │ createdAt             │
│ duration          │  │   │ updatedAt             │
│ confirmationTpl   │  │   └──────────┬────────────┘
│ cancellationTpl   │  │              │
│ reminderTpl       │  │              │ 1
│ reminderHours     │  │              │
│ createdAt         │  │              │ N
│ updatedAt         │  │   ┌──────────▼────────────┐
└────────┬──────────┘  │   │     Appointment        │
         │ 1           │   │────────────────────────│
         │             ├───│ id (PK, UUID)           │
         │ N           │   │ customerId (FK)         │
         │             │   │ userId (FK)             │
         ▼             │   │ appointmentDate         │
┌───────────────────┐  │   │ status (Enum)           │
│AvailabilityException│  │   │ token (UNIQUE, UUID)   │
│───────────────────│  │   │ reminderSent (Boolean)  │
│ id (PK, UUID)     │  │   │ createdAt               │
│ userId (FK → User)│──┘   │ updatedAt               │
│ date (String)     │      └────────────────────────┘
│ slots (String[])  │
│ createdAt         │
│ updatedAt         │
│ UNIQUE(userId,date)
└───────────────────┘
```

---

## 2. Modelos e Campos

### 2.1 User

Representa uma clínica ou profissional de saúde. É a entidade central do sistema.

| Campo | Tipo | Atributos | Descrição |
|-------|------|-----------|-----------|
| `id` | `String` | `@id @default(uuid())` | Identificador único |
| `email` | `String` | `@unique` | Email de login |
| `password` | `String` | Obrigatório | Hash bcrypt da senha |
| `name` | `String` | Obrigatório | Nome da clínica/profissional |
| `workingHours` | `String[]` | `@default([...])` | Lista de horários padrão (fallback) |
| `weeklyHours` | `Json?` | Nullable | Horários por dia da semana `{"1": ["08:00"]}` |
| `duration` | `Int` | `@default(30)` | Duração padrão da consulta (minutos) |
| `confirmationTemplate` | `String?` | Nullable | Template WhatsApp de confirmação |
| `cancellationTemplate` | `String?` | Nullable | Template WhatsApp de cancelamento |
| `reminderTemplate` | `String?` | Nullable | Template WhatsApp de lembrete |
| `reminderHours` | `Int` | `@default(24)` | Horas antes da consulta para enviar lembrete |
| `createdAt` | `DateTime` | `@default(now())` | Data de criação |
| `updatedAt` | `DateTime` | `@updatedAt` | Data de atualização |

**Relacionamentos:**
- `customers` → `Customer[]` (1:N)
- `appointments` → `Appointment[]` (1:N)
- `availabilityExceptions` → `AvailabilityException[]` (1:N)

### 2.2 Customer

Representa um paciente vinculado a uma clínica.

| Campo | Tipo | Atributos | Descrição |
|-------|------|-----------|-----------|
| `id` | `String` | `@id @default(uuid())` | Identificador único |
| `name` | `String` | Obrigatório | Nome do paciente |
| `phone` | `String` | Obrigatório | Telefone em formato E.164 (ex: +5511999999999) |
| `userId` | `String` | FK → User.id | Clínica à qual pertence |
| `notes` | `String?` | Nullable | Anotações internas (CRM) |
| `createdAt` | `DateTime` | `@default(now())` | Data de criação |
| `updatedAt` | `DateTime` | `@updatedAt` | Data de atualização |

**Constraints:**
- `@@unique([phone, userId])` — Um telefone é único por clínica

**Relacionamentos:**
- `user` → `User` (N:1)
- `appointments` → `Appointment[]` (1:N)

### 2.3 Appointment (Enum: AppointmentStatus)

Representa um agendamento de consulta.

**Enum `AppointmentStatus`:**
| Valor | Descrição |
|-------|-----------|
| `PENDING` | Aguardando confirmação do paciente |
| `CONFIRMED` | Confirmado pelo paciente |
| `CANCELED` | Cancelado (por paciente ou clínica) |

**Campos:**

| Campo | Tipo | Atributos | Descrição |
|-------|------|-----------|-----------|
| `id` | `String` | `@id @default(uuid())` | Identificador único |
| `customerId` | `String` | FK → Customer.id | Paciente |
| `userId` | `String` | FK → User.id | Clínica responsável |
| `appointmentDate` | `DateTime` | Obrigatório | Data e hora agendada |
| `status` | `AppointmentStatus` | `@default(PENDING)` | Status do agendamento |
| `token` | `String` | `@unique @default(uuid())` | Token único para link público |
| `reminderSent` | `Boolean` | `@default(false)` | Se o lembrete já foi enviado |
| `createdAt` | `DateTime` | `@default(now())` | Data de criação |
| `updatedAt` | `DateTime` | `@updatedAt` | Data de atualização |

**Relacionamentos:**
- `customer` → `Customer` (N:1)
- `user` → `User` (N:1)

### 2.4 AvailabilityException

Gerencia exceções de disponibilidade (feriados, dias especiais).

| Campo | Tipo | Atributos | Descrição |
|-------|------|-----------|-----------|
| `id` | `String` | `@id @default(uuid())` | Identificador único |
| `userId` | `String` | FK → User.id | Clínica |
| `date` | `String` | Formato `YYYY-MM-DD` | Data da exceção |
| `slots` | `String[]` | `@default([])` | Slots disponíveis (vazio = dia bloqueado) |
| `createdAt` | `DateTime` | `@default(now())` | Data de criação |
| `updatedAt` | `DateTime` | `@updatedAt` | Data de atualização |

**Constraints:**
- `@@unique([userId, date])` — Apenas uma exceção por clínica por data

---

## 3. Migrations

### 3.1 Estratégia

O ClinikZap utiliza o sistema de migrações do Prisma com a seguinte estratégia:

1. **Desenvolvimento:** `npx prisma migrate dev` — cria e aplica migrations automaticamente
2. **Produção:** `npx prisma migrate deploy` — aplica migrations pendentes de forma segura (executado no Docker entrypoint)

### 3.2 Fluxo de Trabalho

```bash
# 1. Modificar schema.prisma
# 2. Gerar migration
npx prisma migrate dev --name descricao-da-mudanca

# 3. Regerar Prisma Client (após pull do git)
npx prisma generate

# 4. Produção (automático via Dockerfile)
npx prisma migrate deploy
```

### 3.3 Histórico de Migrations

| Migration | Data | Descrição |
|-----------|------|-----------|
| `0_init` | - | Schema inicial com User, Customer, Appointment |

> Histórico completo disponível em: `prisma/migrations/`

### 3.4 Regras Importantes

- **Nunca editar migrations já aplicadas** — sempre criar novas migrations
- **Sempre rodar `prisma generate`** após alterar o schema
- **Produção usa `migrate deploy`** (não `migrate dev`)
- O container de produção executa `prisma migrate deploy` na inicialização
- As migrations fazem parte do pacote de deploy (incluídas no tarball)

---

## 4. Consultas e Padrões de Acesso

### 4.1 Padrões Comuns

```typescript
// Buscar agendamento por token (página pública)
prisma.appointment.findUnique({
  where: { token },
  include: { customer: true, user: true },
});

// Buscar horários disponíveis
prisma.user.findUnique({
  where: { id: userId },
  select: {
    weeklyHours: true,
    workingHours: true,
    duration: true,
    availabilityExceptions: {
      where: { date: dateStr },
    },
  },
});

// Buscar agendamentos já confirmados (para evitar conflitos)
prisma.appointment.findMany({
  where: {
    userId,
    status: 'CONFIRMED',
    appointmentDate: { gte: startOfDay, lte: endOfDay },
  },
  select: { appointmentDate: true },
});

// Buscar agendamentos para lembrete (cron)
prisma.appointment.findMany({
  where: {
    status: 'CONFIRMED',
    reminderSent: false,
    appointmentDate: { gte: now },
  },
  include: { customer: true, user: true },
});
```

### 4.2 Transações

```typescript
// Confirmar agendamento + atualizar nome do paciente
await prisma.$transaction([
  prisma.appointment.update({
    where: { id },
    data: { appointmentDate: finalDate, status: 'CONFIRMED' },
  }),
  prisma.customer.update({
    where: { id: customerId },
    data: { name: customerName },
  }),
]);
```

```typescript
// Reagendar (cancelar original + criar novo)
await prisma.$transaction(async (tx) => {
  const canceled = await tx.appointment.update({
    where: { id },
    data: { status: 'CANCELED' },
  });
  const rescheduled = await tx.appointment.create({
    data: {
      customerId,
      userId,
      appointmentDate: placeholderDate,
      status: 'PENDING',
    },
  });
  return { canceled, rescheduled };
});
```

### 4.3 Upsert (Exceções de Disponibilidade)

```typescript
await prisma.availabilityException.upsert({
  where: { userId_date: { userId, date: dateStr } },
  create: { userId, date: dateStr, slots: sortedSlots },
  update: { slots: sortedSlots },
});
```

---

## 5. Estratégia de Indexação

### 5.1 Índices Atuais (definidos pelo Prisma)

| Modelo | Índice | Tipo | Campos |
|--------|--------|------|--------|
| `User` | `email` | Único | `email` |
| `Customer` | `phone_userId` | Composto único | `phone`, `userId` |
| `Appointment` | `token` | Único | `token` |
| `AvailabilityException` | `userId_date` | Composto único | `userId`, `date` |

### 5.2 Índices Implícitos (chaves primárias)

Todas as tabelas têm índice na PK (`id` UUID). O PostgreSQL cria automaticamente um índice B-tree para PKs e unique constraints.

### 5.3 Índices Implementados

Os seguintes índices compostos foram adicionados ao schema (`prisma/schema.prisma`):

```prisma
model Appointment {
  // Índice para consultas do dashboard (listar por clínica + data)
  @@index([userId, appointmentDate])
  
  // Índice para consultas de disponibilidade (buscar por data + status)
  @@index([userId, status, appointmentDate])
  
  // Índice para cron de lembretes
  @@index([status, reminderSent, appointmentDate])
}

model Customer {
  // Índice para busca de pacientes (dashboard)
  @@index([userId, name])
}
```

### 5.4 Plano de Execução (Exemplos)

Para verificar se uma consulta está usando índices:

```sql
EXPLAIN ANALYZE
SELECT * FROM "Appointment"
WHERE "userId" = '...' AND "status" = 'CONFIRMED'
ORDER BY "appointmentDate" DESC;
```

---

## 6. Considerações Adicionais

### 6.1 Formato de Dados

- **Telefones:** Formato E.164 armazenado como String (ex: `5511999999999`). Sem prefixo `+`.
- **Datas:** `DateTime` no PostgreSQL com timezone. As conversões para fuso horário brasileiro são feitas na aplicação via `toLocaleDateString('pt-BR')`.
- **Slots:** Strings no formato `HH:MM` (24h), armazenadas em arrays.
- **weeklyHours:** JSON object com chaves de 0 a 6 (domingo a sábado) e arrays de strings.
- **Templates:** Texto livre com variáveis `{nome_paciente}`, `{nome_clinica}`, `{data_consulta}`, `{hora_consulta}`, `{link_consulta}`.

### 6.2 Schema Evolution (Schema da Evolution API)

O banco de dados contém um segundo schema `evolution` gerenciado automaticamente pela Evolution API para armazenar:

- Sessões WhatsApp ativas
- Filas de mensagens
- Cache de dispositivos
- Logs de conexão

**Não intervir neste schema.** Ele é gerenciado exclusivamente pela Evolution API.

### 6.3 Backup

Ver documento [`deploy.md`](./deploy.md) para estratégia de backup do banco de dados.
