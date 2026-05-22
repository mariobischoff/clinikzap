# Documentação de Segurança — ClinikZap

**Versão:** 1.0
**Última atualização:** Maio/2026

---

## 1. Autenticação e Autorização

### 1.1 Fluxo de Autenticação

O ClinikZap utiliza **NextAuth.js v5 (beta)** com:

- **Provider:** Credenciais (email + senha)
- **Adapter:** Prisma (consulta `User` no banco)
- **Estratégia de sessão:** JWT (JSON Web Token)
- **Hash de senha:** bcryptjs

```
┌──────────┐     ┌──────────────┐     ┌────────────┐     ┌─────────────┐
│  Browser  │────▶│  /api/auth/  │────▶│  Prisma    │────▶│  PostgreSQL  │
│  (Login)  │     │  callback/   │     │  Adapter   │     │  (User)     │
│           │◀────│  credentials │◀────│            │◀────│             │
│           │     │              │     │            │     │             │
│  JWT      │     │  bcrypt      │     │  Valida    │     │  Retorna    │
│  Cookie   │     │  .compare()  │     │  senha     │     │  hash       │
└──────────┘     └──────────────┘     └────────────┘     └─────────────┘
```

**Fluxo detalhado:**

1. Usuário envia `email` + `password` para `/api/auth/callback/credentials`
2. `authorize()` busca o usuário por email no banco
3. Compara a senha com `bcrypt.compare(plaintext, hash)`
4. Se válido, cria um JWT com `{ id, name, email }`
5. JWT é armazenado em cookie HTTP-only (não acessível via JavaScript)
6. A cada requisição, o middleware verifica o JWT via `auth()` (NextAuth)

### 1.2 Configuração JWT

```typescript
// src/auth.ts
session: { strategy: 'jwt' },

callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
    }
    return session;
  },
},
```

### 1.3 Middleware de Proteção

```typescript
// src/middleware.ts
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
```

- Rotas `/dashboard/*` — apenas usuários autenticados
- Rota `/login` — redireciona para `/dashboard` se já logado
- Rotas públicas (`/schedule/[token]`, `/api/webhook/*`) — sem autenticação

### 1.4 Verificação de Autorização nas Server Actions

Todas as Server Actions do dashboard verificam a sessão antes de executar:

```typescript
const session = await auth();
const userId = session?.user?.id;

if (!userId) {
  throw new Error('Unauthorized: No active session found');
}
```

---

## 2. Segurança do Webhook

### 2.1 Modelo de Confiança

O webhook da Evolution API **não possui autenticação HMAC ou assinatura de requisição**. O modelo de segurança é baseado em:

1. **URL secreta:** A URL do webhook é definida via variável de ambiente (`NEXT_PUBLIC_WEBHOOK_URL`) e registrada na Evolution API durante a inicialização
2. **Validação de payload:** O webhook valida a estrutura básica (`data.key` existe) antes de processar
3. **Isolamento de instância:** A Evolution API é executada no mesmo Docker network, não exposta publicamente
4. **Rate limiting interno:** Anti-flood por Redis impede processamento excessivo

### 2.2 Inicialização Segura da Instância

```typescript
static async initInstance(instanceName: string): Promise<void> {
  // 1. Verifica se instância já existe
  // 2. Configura settings (groupsIgnore, syncFullHistory=false)
  // 3. Verifica se webhook já está configurado
  // 4. Se não, registra webhook com a URL definida no ambiente
}
```

### 2.3 Recomendações Futuras

Para produção com múltiplos tenants, recomenda-se:

- Implementar verificação de IP de origem (Evolution API tem IP fixo)
- Adicionar header secreto compartilhado entre Evolution e webhook
- Validar `instanceId` contra instâncias registradas

---

## 3. Rate Limiting

### 3.1 Anti-Flood (Redis)

```
Chave:     lock:welcome:{phone}
TTL:       15 minutos (900 segundos)
Função:    Evita múltiplas respostas a mensagens repetidas do mesmo paciente
```

### 3.2 Human-Takeover (Redis)

```
Chave:     silence:chat:{phone}
TTL:       1 hora (3600 segundos)
Função:    Quando a secretária responde manualmente, o bot fica em modo silencioso
```

### 3.3 Comportamento

```typescript
// Anti-flood: verifica se já respondeu nos últimos 15 min
const lockKey = `lock:welcome:${phone}`;
const isLocked = await redis.exists(lockKey);
if (isLocked) {
  return NextResponse.json({ message: 'Welcome lock active (anti-flood)' });
}
await redis.set(lockKey, 'true', 'EX', 900);

// Human-takeover: verifica se secretária atendeu na última hora
const silenceKey = `silence:chat:${phone}`;
const isSilenced = await redis.exists(silenceKey);
if (isSilenced) {
  return NextResponse.json({ message: 'Chat is silenced (human-takeover bypass)' });
}
```

---

## 4. Gerenciamento de Variáveis de Ambiente

### 4.1 Arquivos .env

| Arquivo | Finalidade | Incluído no Git? |
|---------|------------|------------------|
| `.env` | Desenvolvimento local (não versionado) | ❌ (.gitignore) |
| `.env.example` | Template com valores de exemplo | ✅ Sim |
| `.env.prod` | Deploy manual via PowerShell | ❌ (.gitignore) |
| CI/CD | Criado dinamicamente no GitHub Actions | - |

### 4.2 Variáveis Sensíveis

| Variável | Tipo | Risco se exposta |
|----------|------|------------------|
| `DATABASE_URL` | String de conexão PostgreSQL | Acesso total ao banco |
| `AUTH_SECRET` | Chave de encriptação JWT | Forja de tokens de sessão |
| `EVOLUTION_API_KEY` | Chave da Evolution API | Controle da instância WhatsApp |
| `CRON_SECRET` | Token do endpoint cron | Disparo manual de lembretes |
| `POSTGRES_PASSWORD` | Senha do banco (produção) | Acesso total ao banco |

### 4.3 Boas Práticas

- **Nunca** commitar `.env` ou `.env.prod`
- Usar secrets do GitHub Actions para CI/CD
- Rotacionar `AUTH_SECRET` periodicamente
- Em produção, as variáveis são injetadas pelo Docker Compose

---

## 5. CORS e Headers de Segurança

### 5.1 CORS

Atualmente, o Next.js não possui configuração explícita de CORS. O comportamento padrão é:

- **API Routes:** Aceitam requisições de qualquer origem (padrão Next.js)
- **Páginas:** Servidas pelo próprio Next.js, não há CORS relevante

### 5.2 Headers de Segurança (Recomendados)

O Next.js 15 aplica automaticamente alguns headers de segurança. Para produção, recomenda-se configurar no `next.config.ts`:

```typescript
// next.config.ts — configuração recomendada para produção
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};
```

---

## 6. Prevenção contra Ataques Comuns

### 6.1 SQL Injection

**Proteção:** O Prisma ORM usa **parameterized queries** por padrão. Todas as consultas são compiladas para SQL com parâmetros vinculados, eliminando risco de SQL injection.

```typescript
// SEGURO — Prisma usa parameterized queries
await prisma.user.findUnique({
  where: { email: userInput },  // Nunca concatenado diretamente no SQL
});
```

### 6.2 XSS (Cross-Site Scripting)

**Proteções ativas:**

1. **React 19:** Escapa automaticamente valores em JSX (`{variavel}` escapa HTML)
2. **Next.js Server Components:** Renderização no servidor, sem execução de scripts no cliente
3. **Templates WhatsApp:** Usam sintaxe própria `{variavel}`, não interpretada como HTML
4. **Sonner (toast):** Biblioteca segura para notificações

**Ponto de atenção:** O template de mensagens WhatsApp (`confirmationTemplate`, etc.) é texto livre. Embora não seja renderizado como HTML, recomenda-se validar o conteúdo no servidor.

### 6.3 CSRF (Cross-Site Request Forgery)

**Proteções ativas:**

1. **NextAuth.js:** Inclui proteção CSRF nativa para rotas de autenticação
2. **Server Actions:** Usam cookies HTTP-only + token CSRF implícito do Next.js
3. **SameSite cookie:** O cookie de sessão JWT usa `SameSite=Lax` por padrão

### 6.4 Ataques de Força Bruta

**Proteções atuais:**
- Não há rate limiting no endpoint de login (a implementar)

**Recomendação:**
```typescript
// Futura implementação — rate limiting no login
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: 'minute',
  fireImmediately: true,
});
```

### 6.5 Mass Assignment

**Proteção:** Prisma requer definição explícita dos campos a serem atualizados:

```typescript
// SEGURO — apenas campos definidos são atualizados
await prisma.user.update({
  where: { id: userId },
  data: {
    name: newName, // Apenas este campo
  },
});
```

---

## 7. HTTPS/SSL

### 7.1 Desenvolvimento

- `http://localhost:3000` — Sem HTTPS (ambiente local)

### 7.2 Produção

Gerenciado pelo **Nginx Proxy Manager**:

- **SSL/TLS:** Let's Encrypt (automático via NPM)
- **Portas expostas:** 80 (HTTP → redireciona para 443) e 443 (HTTPS)
- **Proxy reverso:** NPM → Next.js App (porta 3000)
- **Renovação:** Automática (Let's Encrypt)

```
Browser ──HTTPS──▶ NPM (443) ──HTTP──▶ Next.js (3000)
                     │
                     ├── Let's Encrypt (auto-renew)
                     └── Proxy reverso
```

### 7.3 Docker Network

Todos os serviços internos se comunicam via rede Docker bridge (`clinikzap-net-prod`), nunca expostos publicamente:

- PostgreSQL: apenas na rede interna
- Redis: apenas na rede interna
- Evolution API: apenas na rede interna
- Next.js App: exposto apenas para o NPM (porta 3000)

---

## 8. Boas Práticas de Desenvolvimento

### 8.1 Checklist de Segurança para Pull Requests

- [ ] Não contém secrets hardcoded (senhas, keys, tokens)
- [ ] Usa Prisma (não SQL raw) para consultas ao banco
- [ ] Server Actions verificam sessão do usuário
- [ ] Dados de entrada são validados (tipos, formatos)
- [ ] Mensagens de erro não expõem detalhes internos em produção
- [ ] Logs não contêm dados sensíveis (senhas, tokens completos)

### 8.2 Tratamento de Erros

```typescript
// Correto — não expõe detalhes internos em produção
try {
  // ...
} catch (error) {
  console.error('[Module] Error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

```typescript
// Server Actions — formato seguro
try {
  // ...
  return { success: true };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Erro desconhecido',
  };
}
```

### 8.3 Auditoria de Logs

Logs são estruturados com prefixos por módulo e **nunca** incluem:
- Senhas (nem hashes)
- Tokens JWT completos
- Chaves de API
- Dados bancários ou documentos pessoais

---

## 9. Resumo de Responsabilidades

| Aspecto | Responsável | Status |
|---------|-------------|--------|
| Hash de senha | bcryptjs | ✅ Implementado |
| JWT Session | NextAuth.js | ✅ Implementado |
| Middleware de rotas | NextAuth middleware | ✅ Implementado |
| Anti-flood webhook | Redis | ✅ Implementado |
| Human-takeover | Redis | ✅ Implementado |
| SQL Injection | Prisma ORM | ✅ Prevenido |
| XSS | React + Next.js | ✅ Prevenido |
| CSRF | NextAuth + Next.js | ✅ Implementado |
| HTTPS/SSL | Nginx Proxy Manager | ✅ Implementado |
| CORS headers | next.config.ts | ⚠️ Pendente |
| CSP headers | next.config.ts | ⚠️ Pendente |
| Rate limit login | - | ❌ Não implementado |
| Webhook HMAC | - | ❌ Não implementado |
| Auditoria de acesso | - | ❌ Não implementado |
| Secrets rotation | - | ❌ Não implementado |
