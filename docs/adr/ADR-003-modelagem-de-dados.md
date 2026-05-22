# ADR-003: Modelagem de Dados

**Data:** 2026-05-21  
**Status:** Aceito  
**Autor:** Winston — System Architect

---

## Contexto

O ClinikZap precisa armazenar dados estruturados de clínicas, pacientes, agendamentos e exceções de disponibilidade. A escolha do banco de dados e o design do schema são decisões críticas que afetam a integridade referencial, performance e evolução futura do sistema.

### Requisitos de Dados

- **Usuários (clínicas)**: dados da clínica, horários de funcionamento, templates de mensagens personalizáveis.
- **Pacientes (customers)**: nome, telefone (E.164), vínculo com a clínica, notas de CRM.
- **Agendamentos (appointments)**: data/hora, status (PENDING → CONFIRMED → CANCELED), token público único para link de scheduling.
- **Exceções de disponibilidade**: dias bloqueados ou com horários customizados por clínica.
- **Relacionamentos**: um paciente pertence a uma clínica, um agendamento pertence a um paciente e a uma clínica.
- **Escalabilidade futura**: suporte a múltiplas clínicas no mesmo banco (multi-tenancy por linha).

### Alternativas Consideradas

| Alternativa | Tipo | Motivo da Rejeição |
|---|---|---|
| **MongoDB** | NoSQL document store | Falta de integridade referencial nativa entre Customer, Appointment e disponibilidade; joins complexos em consultas de dashboard |
| **SQLite** | SQL embarcado | Sem concorrência adequada para um SaaS multi-clínica; sem suporte a JSONB; sem migrations robustas |
| **MySQL** | SQL relacional | Suporte inferior a JSON; performance inferior em consultas com tipos customizados |
| **PostgreSQL 15** | SQL relacional avançado | **Selecionado** |

---

## Decisão

**Optamos pelo PostgreSQL 15 como banco de dados relacional, com Prisma v6 como ORM.**

### Schema do Banco

```prisma
model User {
  id                     String                  @id @default(uuid())
  email                  String                  @unique
  password               String
  name                   String
  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt
  customers              Customer[]
  appointments           Appointment[]
  workingHours           String[]                @default([...])
  weeklyHours            Json?
  duration               Int                     @default(30)
  availabilityExceptions AvailabilityException[]
  confirmationTemplate   String?
  cancellationTemplate   String?
  reminderTemplate       String?
  reminderHours          Int                     @default(24)
}

model Customer {
  id           String        @id @default(uuid())
  name         String
  phone        String
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  appointments Appointment[]
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  @@unique([phone, userId])
}

model Appointment {
  id              String            @id @default(uuid())
  customerId      String
  customer        Customer          @relation(fields: [customerId], references: [id], onDelete: Cascade)
  userId          String
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  appointmentDate DateTime
  status          AppointmentStatus @default(PENDING)
  token           String            @unique @default(uuid())
  reminderSent    Boolean           @default(false)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

model AvailabilityException {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date      String   // "YYYY-MM-DD"
  slots     String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([userId, date])
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELED
}
```

### Justificativa das Decisões de Design

**1. PostgreSQL como Banco de Dados**

- **Integridade Referencial**: relacionamentos entre `User ↔ Customer ↔ Appointment` são garantidos via chaves estrangeiras (`@relation` + `onDelete: Cascade`). Não é possível criar um agendamento para um paciente ou clínica inexistentes.
- **JSONB para weeklyHours**: o campo `weeklyHours` no modelo `User` usa `Json?` (opcional), permitindo armazenar estruturas flexíveis como `{"1": ["08:00", "09:00"], "2": ["08:00", ...]}` sem precisar de tabelas de normalização complexas. O PostgreSQL JSONB permite consultar e indexar estes dados.
- **Suporte a Enum**: o `AppointmentStatus` como enum nativo do banco (`AppointmentStatus` no PostgreSQL via Prisma) garante que apenas valores válidos sejam armazenados.
- **Array types**: `workingHours` como `String[]` e `slots` como `String[]` são tipos nativos do PostgreSQL, permitindo consultas eficientes.
- **Maturidade e ecossistema**: PostgreSQL é referência em bancos relacionais, com suporte a replicação, backups point-in-time e ferramentas maduras de migração.

**2. UUID como Primary Key**

```prisma
id String @id @default(uuid())
```

**Motivação:**
- **Segurança**: UUIDs não são sequenciais, impedindo que um usuário adivinhe IDs de recursos (ex: `/schedule/{token}`).
- **Distributed-friendly**: UUIDs podem ser gerados no lado da aplicação sem conflitos, facilitando migrações futuras para bancos distribuídos ou separação de leitura/escrita.
- **Token público**: o campo `token` no Appointment é um UUID único usado como link público de agendamento — não expõe o ID interno nem informações sequenciais.
- **Uniqueness universal**: não há risco de colisão entre ambientes (dev, staging, produção).

**Contraponto**: UUIDs são maiores que inteiros (128 bits vs 32 bits) e podem impactar performance de índices. Para o volume esperado (milhares de agendamentos por mês), o impacto é insignificante.

**3. AppointmentStatus como Enum**

```prisma
enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELED
}
```

Usar enum nativo do banco (traduzido para enum PostgreSQL) ao invés de string solta ou tabela de status traz:
- **Validação em nível de banco**: nenhum código consegue inserir um status inválido.
- **Descoberta**: o Prisma gera o tipo TypeScript `AppointmentStatus` automaticamente, com autocomplete no código.
- **Performance**: enums ocupam 4 bytes no PostgreSQL vs string varchar.

**4. Chave Composta Unique no Customer**

```prisma
@@unique([phone, userId])
```

Um telefone deve ser único por clínica (não globalmente), permitindo que o mesmo paciente exista em clínicas diferentes sem conflito. Esta constraint unique composta:
- É usada diretamente no webhook para `findUnique` com `where: { phone_userId: { phone, userId } }`.
- Impede duplicatas acidentais de pacientes na mesma clínica.

**5. AvailabilityException com Unique Composto**

```prisma
@@unique([userId, date])
```

Cada clínica pode ter no máximo uma exceção por data. Se `slots` for vazio, o dia está completamente bloqueado. Se tiver slots específicos, substitui os horários padrão (`workingHours`/`weeklyHours`) apenas para aquela data.

### Por que não MongoDB ou SQLite?

**MongoDB:**
- Ausência de integridade referencial nativa: um `customerId` inválido em uma collection `appointments` só seria detectado em runtime.
- Joins complexos: o dashboard precisaria agregar agendamentos por status, data, paciente e clínica — operações muito mais custosas em MongoDB que em SQL relacional.
- Modelo de dados relacional: os dados do ClinikZap são inerentemente relacionais (User → Customer → Appointment). Forçar isso em documentos resulta em dados aninhados profundos ou múltiplas consultas.

**SQLite:**
- Concorrência limitada: SQLite permite apenas um escritor por vez, inadequado para um SaaS multi-clínica.
- Sem tipos JSONB ou array nativos.
- Sem suporte a schemas e migrations avançadas como o Prisma oferece com PostgreSQL.

---

## Consequências

### Positivas

- **Integridade dos dados garantida**: constraints, enums e chaves estrangeiras no banco previnem dados inconsistentes.
- **Consultas eficientes**: joins diretos entre User, Customer e Appointment para o dashboard e relatórios.
- **Flexibilidade com JSONB**: `weeklyHours` pode evoluir sem migrations — adicionar novos campos ao JSON não quebra dados existentes.
- **UUID seguro para links públicos**: o token UUID evita enumeração de agendamentos.
- **Maturidade**: PostgreSQL + Prisma é uma combinação testada e documentada.

### Negativas

- **Migrations gerenciadas pelo Prisma**: embora poderoso, o Prisma gera migrations que precisam ser revisadas manualmente em casos complexos (ex: transformação de dados).
- **Overhead de UUID**: índices em UUID são ligeiramente maiores que em inteiros sequenciais. O impacto é mínimo no volume esperado.
- **JSONB sem schema enforcement**: campos como `weeklyHours` podem conter qualquer JSON válido — a validação fica por conta da aplicação.
- **Cascade delete**: `onDelete: Cascade` no relacionamento `User → Customer → Appointment` significa que deletar uma clínica remove todos os pacientes e agendamentos — operação que deve ser protegida na aplicação.

### Compliance e Notas Técnicas

- O Prisma Client singleton (`src/lib/prisma.ts`) garante uma única instância durante hot reload em desenvolvimento.
- Migrações em produção rodam via `prisma migrate deploy` no startup do container.
- A string de conexão (`DATABASE_URL`) suporta SSL em produção.
- O banco de dados da Evolution API também usa PostgreSQL (`evolution` database no mesmo cluster), simplificando a administração.
- Planeja-se implementar soft delete em agendamentos cancelados para auditoria futura.
