# ADR-005: Estrutura de Multi-tenancy

**Data:** 2026-05-21  
**Status:** Proposto  
**Autor:** Winston — System Architect

---

## Contexto

O ClinikZap foi iniciado como um MVP para uma única clínica, mas o produto tem como objetivo atender múltiplas clínicas (inquilinos) em uma única instância SaaS. É necessário definir a estratégia de isolamento de dados e recursos entre as clínicas desde o início, mesmo que a implementação completa seja postergada.

### Requisitos de Multi-tenancy

- **Isolamento de dados**: uma clínica não pode acessar dados de outra clínica.
- **Isolamento de conexão WhatsApp**: cada clínica possui seu próprio número de WhatsApp, que deve ser conectado separadamente.
- **Roteamento de webhook**: mensagens recebidas devem ser roteadas para a clínica correta com base na instância WhatsApp de origem.
- **Administração centralizada**: como operador do SaaS, precisamos de visibilidade sobre todas as clínicas.
- **Custo controlado**: usar o mesmo banco de dados para todas as clínicas para evitar custos operacionais elevados.
- **Migração suave**: o MVP foi construído com modelo single-clinic (`prisma.user.findFirst()` no webhook). A migração para multi-tenancy deve ser gradual.

### Alternativas de Isolamento

| Abordagem | Isolamento | Complexidade | Custo | Adequação |
|---|---|---|---|---|
| **Database-per-tenant** | Total (banco separado) | Alta | Alto (N bancos) | Baixa para este caso |
| **Schema-per-tenant** | Parcial (schemas no mesmo banco) | Alta | Médio | Média |
| **Row-level isolation (FK)** | Lógico (filtro por userId) | Baixa | Baixo | **Alta** |

---

## Decisão

**Optamos pelo isolamento por linha (row-level isolation) via chave estrangeira `userId`, com instâncias independentes da Evolution API por clínica.**

### Arquitetura de Multi-tenancy

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App                           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Clínica A │  │ Clínica B │  │ Clínica C │  ...        │
│  │  (User A) │  │  (User B) │  │  (User C) │            │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘              │
│        │              │              │                    │
│        └──────────────┴──────────────┘                    │
│                       │                                   │
│                       ▼                                   │
│  ┌──────────────────────────────────────┐                │
│  │     PostgreSQL (único banco)         │                │
│  │                                      │                │
│  │  User A ── Customer A ── Appointment │                │
│  │  User B ── Customer B ── Appointment │                │
│  │  User C ── Customer C ── Appointment │                │
│  └──────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Evolution API                          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Instância │  │ Instância │  │ Instância │             │
│  │  A (5599) │  │  B (5588) │  │  C (5577) │             │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘              │
│        │              │              │                    │
│        └──────────────┴──────────────┘                    │
│                       │                                   │
│                       ▼                                   │
│  Webhook: instanceId = "instance_a" → User A              │
│  Webhook: instanceId = "instance_b" → User B              │
└─────────────────────────────────────────────────────────┘
```

### Estratégia de Isolamento de Dados

**1. Isolamento por Row-Level (via FK `userId`)**

Todos os models que pertencem a uma clínica contêm o campo `userId` referenciando o `User`:

```prisma
model Customer {
  userId  String
  user    User    @relation(fields: [userId], references: [id])
  @@unique([phone, userId])  // Telefone único por clínica
}

model Appointment {
  userId  String
  user    User    @relation(fields: [userId], references: [id])
}
```

**Benefícios:**
- **Um banco de dados**: todas as clínicas compartilham o mesmo PostgreSQL. Custo operacional baixo.
- **Consultas multi-clínica**: o operador do SaaS pode executar queries agregadas (ex: total de agendamentos em todas as clínicas).
- **Migrations únicas**: schema é gerenciado centralmente via Prisma.
- **Performance**: índices por `userId` garantem que consultas de uma clínica não escaneiem dados de outras.

**Padrão de consulta seguro:**
```typescript
const appointments = await prisma.appointment.findMany({
  where: { userId: session.user.id }, // ← sempre filtrado pelo userId da sessão
});
```

**2. Instâncias Independentes da Evolution API**

Cada clínica terá sua própria instância na Evolution API:

```typescript
// Inicialização por clínica
await EvolutionService.initInstance(`clinica_${user.id}`);
```

O campo `instanceId` no payload do webhook identifica qual instância enviou a mensagem:

```typescript
interface EvolutionWebhookBody {
  event: string;
  instanceId: string;  // ← identifica a clínica
  data: EvolutionMessageData;
}
```

No webhook, o `instanceId` será usado para buscar o `User` correto no banco:

```typescript
// Migração futura — substituir prisma.user.findFirst()
const clinic = await prisma.user.findFirst({
  where: { evolutionInstanceId: body.instanceId },
});
```

Isso exige a adição de um campo `evolutionInstanceId` no model `User`.

**3. Model User como Tenant Root**

O model `User` é a raiz do inquilino. Ele contém não apenas credenciais de login, mas também:

- Configurações de horário (`workingHours`, `weeklyHours`, `duration`)
- Templates personalizados de WhatsApp (`confirmationTemplate`, `cancellationTemplate`, `reminderTemplate`)
- Preferências de lembretes (`reminderHours`)

Cada clínica é, de fato, um `User` no sistema — não há um model `Tenant` separado. Isso simplifica o MVP e evita joins extras.

### Plano de Migração do Single-clinic para Multi-clinic

O MVP atual usa `prisma.user.findFirst()` no webhook, assumindo que há apenas uma clínica. A migração será feita em etapas:

**Fase 1 — Fundação (MVP atual — concluído)**
- Schema Prisma com `userId` em Customer e Appointment (já implementado).
- Autenticação com login por clínica.
- Webhook usa `findFirst()` — compatível com 1 clínica.

**Fase 2 — Adicionar suporte a múltiplas instâncias Evolution**
- Adicionar campo `evolutionInstanceName` e `evolutionPhoneNumber` ao model `User`.
- Modificar `EvolutionService.initInstance` para aceitar instance name por clínica.
- Modificar webhook para buscar clínica por `instanceId` ao invés de `findFirst()`.
- Dashboard de gerenciamento de conexão WhatsApp (QR Code) por clínica.

**Fase 3 — Isolamento completo**
- Criar middleware/helper que automaticamente filtra todas as queries por `userId` da sessão.
- Implementar testes de isolamento: garantir que Clínica A não acessa dados da Clínica B.
- Adicionar logging de auditoria por tenant.

**Fase 4 — Administração centralizada**
- Criar painel admin (superadmin) com visão de todas as clínicas.
- Implementar métricas por clínica (agendamentos, pacientes, etc.).
- Gerenciamento de planos e limites por clínica.

### Por que não database-per-tenant ou schema-per-tenant?

**Database-per-tenant:**
- Vantagem: isolamento total, backup independente por clínica.
- Desvantagem: N conexões de banco (uma por clínica), migrations precisam ser aplicadas em N bancos, custo operacional alto.
- Decisão: inadequado para o estágio atual — o SaaS ainda não tem escala que justifique a complexidade.

**Schema-per-tenant (PostgreSQL schemas):**
- Vantagem: isolamento lógico dentro do mesmo banco.
- Desvantagem: Prisma não suporta multi-schema de forma nativa; exigiria múltiplas conexões ou manipulação de `search_path` por requisição.
- Decisão: complexidade técnica alta com pouco ganho sobre row-level isolation para o cenário atual.

---

## Consequências

### Positivas

- **Custo operacional mínimo**: um banco PostgreSQL, uma aplicação Next.js, uma Evolution API — para N clínicas.
- **Simplicidade**: a arquitetura atual já está preparada (FK `userId` existente em Customer e Appointment).
- **Migração gradual**: não precisa reescrever o sistema — as mudanças são incrementais.
- **Consultas cross-tenant**: relatórios administrativos e métricas globais são queries SQL simples.
- **Performance previsível**: índices por `userId` + `phone` garantem consultas eficientes.

### Negativas

- **Sem isolamento físico**: um bug na aplicação pode potencialmente vazar dados entre clínicas (ex: esquecer o filtro `userId` em uma query).
- **Ponto único de falha**: uma falha no banco afeta todas as clínicas simultaneamente.
- **Contenção de recursos**: uma clínica com muitos agendamentos pode impactar a performance das demais (embora improvável no volume esperado).
- **Complexidade de backup**: o backup do banco contém dados de todas as clínicas — não é possível restaurar o backup de uma única clínica sem ferramentas auxiliares.
- **Limites de escalabilidade**: bancos PostgreSQL têm limites práticos (ex: 100GB-1TB), que podem ser atingidos com centenas de clínicas de grande porte.

### Compliance e Notas Técnicas

- Toda query no Prisma deve incluir `userId: session.user.id` no `where`. Recomenda-se criar um service layer ou middleware que force este filtro automaticamente.
- O campo `@@unique([phone, userId])` no model Customer já garante que um telefone pode existir em múltiplas clínicas sem conflito.
- A adição do campo `evolutionInstanceId` no model `User` é a primeira tarefa da Fase 2.
- O webhook atual usa `prisma.user.findFirst()` — isso deve ser alterado para `findUnique({ where: { evolutionInstanceId } })` ou similar antes de conectar a segunda clínica.
- A Evolution API suporta múltiplas instâncias na mesma instalação Docker — não há necessidade de rodar múltiplos containers.
- Planeja-se implementar rate limiting por clínica no webhook (além do anti-flood por paciente) para garantir fair usage.
