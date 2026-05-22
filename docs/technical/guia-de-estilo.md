# Guia de Estilo de Código — ClinikZap

**Versão:** 1.0
**Última atualização:** Maio/2026
**Stack:** TypeScript (strict) · React 19 · Next.js 15 App Router · TailwindCSS v4

---

## 1. TypeScript — Modo Strict

O `tsconfig.json` está configurado com `strict: true`, que habilita:

| Flag | Descrição |
|------|-----------|
| `strictNullChecks` | Null e undefined são tipos distintos |
| `strictFunctionTypes` | Checagem estrita de tipos em funções |
| `strictBindCallApply` | Checagem de `bind`, `call`, `apply` |
| `strictPropertyInitialization` | Propriedades de classe devem ser inicializadas |
| `noImplicitAny` | Erro quando tipo não pode ser inferido |
| `noImplicitThis` | Erro quando `this` tem tipo implícito |
| `alwaysStrict` | Código compilado em strict mode |

### 1.1 Regras Adicionais (Implícitas)

```typescript
// ✅ Correto — tipos explícitos em parâmetros de função
export async function getAvailableSlots(dateStr: string, userId: string): Promise<string[]> {
  // ...
}

// ❌ Errado — any implícito
export async function getAvailableSlots(dateStr, userId) {
  // ...
}

// ✅ Correto — tratamento de erro com type guard
catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
}

// ❌ Errado — any no catch
catch (error: any) {
  console.log(error.message);
}
```

---

## 2. Naming Conventions

### 2.1 Arquivos e Diretórios

| Tipo | Convenção | Exemplos |
|------|-----------|----------|
| Componentes React | `kebab-case.tsx` | `scheduling-form.tsx`, `appointments-table.tsx` |
| Server Actions | `kebab-case.ts` | `actions.ts` |
| Serviços | `kebab-case.ts` | `evolution.ts`, `whatsapp.service.ts` |
| Utilitários | `kebab-case.ts` | `template-parser.ts` |
| Rotas API | `kebab-case` | `/api/cron/send-reminders/route.ts` |
| Diretórios dinâmicos | `[param]` | `[token]/`, `[[...event]]/` |

### 2.2 Identificadores

| Entidade | Convenção | Exemplos |
|----------|-----------|----------|
| Componentes React | PascalCase | `SchedulingForm`, `DashboardTabs` |
| Funções/ métodos | camelCase | `getAvailableSlots()`, `confirmAppointment()` |
| Server Actions | camelCase | `confirmAppointment()`, `updateWeeklyHours()` |
| API Routes | camelCase (verbos) | `POST()`, `GET()` exportados |
| Interfaces/ Types | PascalCase | `AppointmentDetails`, `EvolutionWebhookBody` |
| Enums | PascalCase | `AppointmentStatus` |
| Variáveis | camelCase | `customerName`, `availableSlots` |
| Constantes | UPPER_SNAKE_CASE | `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` |
| Classes | PascalCase | `EvolutionService`, `WhatsappService` |
| Prisma models | PascalCase | `User`, `Customer`, `Appointment` |

### 2.3 Nomes de Colunas no Banco

| Entidade | Convenção | Exemplos |
|----------|-----------|----------|
| Colunas | camelCase | `userId`, `appointmentDate`, `reminderSent` |
| Relacionamentos | camelCase + Id | `customerId`, `userId` |
| Enum values | UPPER_SNAKE_CASE | `PENDING`, `CONFIRMED`, `CANCELED` |

---

## 3. Estrutura de Componentes

### 3.1 Server Components (padrão)

```typescript
// src/app/schedule/[token]/page.tsx
import { getAppointmentByToken } from '../actions';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SchedulePage({ params }: PageProps) {
  const { token } = await params;
  const appointment = await getAppointmentByToken(token);
  // Renderização condicional, sem hooks
}
```

**Regras:**
- Arquivos `.tsx` sem `'use client'` são Server Components por padrão
- Podem ser `async` e acessar banco de dados diretamente
- Não podem usar hooks (useState, useEffect, etc.)
- Props devem ser serializáveis (JSON)

### 3.2 Client Components

```typescript
// src/app/schedule/[token]/scheduling-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { confirmAppointment, getAvailableSlots } from '../actions';

interface SchedulingFormProps {
  appointment: AppointmentDetails;
}

export default function SchedulingForm({ appointment }: SchedulingFormProps) {
  const [step, setStep] = useState(1);
  // ...
}
```

**Regras:**
- Primeira linha: `'use client'`
- Importam e usam hooks
- Server Actions são importadas normalmente (executam no servidor)
- Props devem ser passadas do Server Component pai

### 3.3 Server Actions

```typescript
// src/app/schedule/actions.ts
'use server';

import prisma from '@/lib/prisma';
import { EvolutionService } from '@/services/evolution';

export async function confirmAppointment(
  token: string,
  dateStr: string,
  timeStr: string,
  customerName: string
): Promise<{ success: boolean; error?: string }> {
  // Validação
  // Operações Prisma
  // Envio WhatsApp
  // Retorno
}
```

**Regras:**
- Primeira linha: `'use server'`
- Nome significativo que descreve a ação
- Tipagem explícita de parâmetros e retorno
- Tratamento de erro com try/catch
- Retorno de objeto com `{ success, error? }`

---

## 4. Import Order

Organizar imports na seguinte ordem, separados por linha em branco:

```typescript
// 1. Pacotes externos (Next.js, React, bibliotecas)
import { NextRequest, NextResponse } from 'next/server';
import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

// 2. Módulos internos (src/*)
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { EvolutionService } from '@/services/evolution';
import { parseTemplate } from '@/utils/template-parser';

// 3. Componentes locais (mesmo diretório)
import SchedulingForm from './scheduling-form';
```

---

## 5. TailwindCSS v4

### 5.1 Regras de Estilo

- Usar classes utilitárias do Tailwind diretamente no JSX
- **Sem CSS modules, styled-components ou CSS-in-JS**
- Tema definido via `@theme inline` no CSS global
- Paleta escura: `bg-slate-950`, `bg-slate-900`, `slate-100` para texto

```tsx
// ✅ Certo — classes Tailwind diretas
<main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
  <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
    <h1 className="text-2xl font-bold text-slate-100">Título</h1>
  </div>
</main>
```

### 5.2 Padrões Comuns

```tsx
// Card com vidro fosco
<div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">

// Botão gradiente primário
<button className="bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-2xl">

// Input
<input className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100">

// Badge/indicador de status
<div className="text-teal-400 text-xs font-semibold uppercase tracking-wider">
```

### 5.3 Responsividade

```tsx
// Mobile-first: grid 2 colunas, 4 colunas em lg
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## 6. ESLint

### 6.1 Configuração

```javascript
// eslint.config.mjs (flat config)
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
```

**Regras ativas:**
- `next/core-web-vitals` — Boas práticas Next.js (performance, acessibilidade)
- `next/typescript` — TypeScript rules (baseadas no tsconfig)

### 6.2 Regras de Linting (Implícitas)

```bash
# Executar lint
npm run lint

# Build (inclui type-checking implícito)
npm run build
```

### 6.3 Boas Práticas

- Sempre rodar `npm run build` antes de commitar (type-checking + lint)
- O CI executa `npm run build` — se falhar, o deploy não acontece
- **Não há Prettier ou formatador automático** — consistência manual

---

## 7. Error Handling

### 7.1 Padrão de Tratamento de Erros

```typescript
try {
  // Operação que pode falhar
  const result = await operation();
  return { success: true, data: result };
} catch (error: unknown) {
  // Log com prefixo do módulo
  console.error('[ModuleName] Descrição da operação:', error);
  
  // Retorno seguro
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Erro desconhecido' 
  };
}
```

### 7.2 API Routes

```typescript
try {
  // ...
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('[Route Name] Error:', error);
  return NextResponse.json(
    { error: 'Internal server error', details: errorMessage },
    { status: 500 }
  );
}
```

### 7.3 Propagação de Erros no WhatsApp

```typescript
// O envio de WhatsApp NUNCA deve quebrar a operação principal
try {
  await EvolutionService.sendTextMessage(phone, text);
} catch (msgError) {
  console.error('[Module] Failed to send WhatsApp:', msgError);
  // A operação principal continua — apenas loga o erro
}
```

---

## 8. Logs

### 8.1 Formato de Log

```typescript
console.log('[ModuleName] Mensagem descritiva:', dados);
console.warn('[ModuleName] Aviso:', detalhes);
console.error('[ModuleName] Erro:', error);
```

### 8.2 Prefixos de Módulo

| Prefixo | Arquivo |
|---------|---------|
| `[Webhook WhatsApp]` | Webhook route |
| `[Actions]` | `src/app/schedule/actions.ts` |
| `[Dashboard Actions]` | `src/app/dashboard/actions.ts` |
| `[EvolutionService]` | `src/services/evolution.ts` |
| `[Appointment Cancel]` | Cancel API route |
| `[Appointment Reschedule]` | Reschedule API route |
| `[Cron Reminders]` | Cron route |

### 8.3 O que NÃO logar

- Senhas (nem hashes)
- Tokens JWT completos
- Chaves de API
- Dados pessoais sensíveis (CPF, RG, etc.)

---

## 9. Tratamento de Estado (React)

### 9.1 Organização de Estado em Componentes

```typescript
'use client';

import { useState } from 'react';

export default function SchedulingForm({ appointment }: SchedulingFormProps) {
  // Estado do formulário (agrupado por funcionalidade)
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState(appointment.customer.name);
  
  // Estado de UI
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
}
```

### 9.2 useEffect — Padrão de Fetch

```typescript
useEffect(() => {
  if (!selectedDate) return;

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setError(null);
    try {
      const slots = await getAvailableSlots(selectedDate, appointment.user.id);
      setAvailableSlots(slots);
      setSelectedTime('');
    } catch (err) {
      setError('Erro ao carregar horários disponíveis.');
    } finally {
      setLoadingSlots(false);
    }
  };

  fetchSlots();
}, [selectedDate, appointment.user.id]);
```

---

## 10. Prisma — Padrões de Uso

### 10.1 Singleton

```typescript
// src/lib/prisma.ts — Singleton do PrismaClient
const prismaClientSingleton = () => {
  return new PrismaClient();
};

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
```

### 10.2 Consultas

```typescript
// findUnique — busca por campo único (UUID, email, token)
await prisma.appointment.findUnique({ where: { token } });

// findFirst — busca o primeiro registro que atende ao critério
await prisma.appointment.findFirst({ where: { customerId, status: 'PENDING' } });

// findMany — lista múltiplos registros
await prisma.appointment.findMany({ where: { userId }, orderBy: { appointmentDate: 'desc' } });

// include — eager loading de relacionamentos
await prisma.appointment.findUnique({
  where: { token },
  include: { customer: true, user: true },
});

// select — apenas campos específicos
await prisma.user.findUnique({
  where: { id: userId },
  select: { weeklyHours: true, duration: true },
});
```

### 10.3 Transações

```typescript
// Array de operações
await prisma.$transaction([
  prisma.appointment.update({ where: { id }, data: { status: 'CONFIRMED' } }),
  prisma.customer.update({ where: { id }, data: { name: customerName } }),
]);

// Callback com acesso a tx
await prisma.$transaction(async (tx) => {
  const canceled = await tx.appointment.update({ where: { id }, data: { status: 'CANCELED' } });
  const rescheduled = await tx.appointment.create({ data: { ... } });
  return { canceled, rescheduled };
});
```

---

## 11. Padrões de Resposta (API Routes)

### 11.1 Sucesso

```typescript
return NextResponse.json({ message: 'Success', data: result }, { status: 200 });
```

### 11.2 Erro de Validação

```typescript
return NextResponse.json({ error: 'Token is required' }, { status: 400 });
```

### 11.3 Não Encontrado

```typescript
return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
```

### 11.4 Erro Interno

```typescript
return NextResponse.json(
  { error: 'Internal server error', details: errorMessage },
  { status: 500 }
);
```

---

## 12. Testes (Manual Scripts)

Atualmente, o projeto **não possui framework de testes automatizados**. Os testes são scripts Node.js manuais:

```javascript
// tests/test-webhook.js — Testa o webhook manualmente
// tests/test-cron.js — Testa o cron de lembretes
```

### 12.1 Como Escrever Scripts de Teste

```javascript
// tests/test-example.js
async function runTest() {
  console.log('Test: Descrição do teste');
  try {
    const response = await fetch('http://localhost:3000/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* payload */ }),
    });
    const data = await response.json();
    console.log('Resultado:', data);
    console.log('Teste:', response.ok ? '✅ PASSOU' : '❌ FALHOU');
  } catch (error) {
    console.error('❌ ERRO:', error);
  }
}

runTest();
```

### 12.2 Execução

```bash
# O servidor deve estar rodando
npm run dev

# Em outro terminal
node tests/test-webhook.js
node tests/test-cron.js
```

---

## 13. Convenções de Git

### 13.1 Commits

Formato: `tipo(escopo): mensagem em português`

```git
feat(webhook): adiciona anti-flood com Redis
fix(schedule): corrige cálculo de horários disponíveis
refactor(dashboard): extrai tabela de agendamentos para componente
docs: adiciona guia de estilo
chore: atualiza dependências
```

### 13.2 Branches

```bash
main            # Produção
feature/nome    # Nova funcionalidade
fix/nome        # Correção de bug
refactor/nome   # Refatoração
```

---

## 14. Resumo de Boas Práticas

| Item | Prática |
|------|---------|
| TypeScript | `strict: true`, sem `any` |
| Nomes | camelCase (funções), PascalCase (componentes) |
| Server/Client | Server por padrão, Client só com hooks |
| Erros | try/catch com type guard, nunca `any` |
| Logs | Prefixo do módulo, sem dados sensíveis |
| WhatsApp | Falha de envio nunca quebra a operação |
| Prisma | Singleton, parameterized queries |
| API Routes | 200 sucesso, 400 validação, 404 não encontrado, 500 erro |
| Transações | Usar `$transaction` para operações atômicas |
| Tailwind | Apenas classes utilitárias, sem CSS modules |
