# ADR-004: Autenticação e Autorização

**Data:** 2026-05-21  
**Status:** Aceito  
**Autor:** Winston — System Architect

---

## Contexto

O ClinikZap requer autenticação para acesso ao dashboard administrativo (onde a clínica gerencia horários, pacientes e agendamentos) e autorização para proteger as rotas de API.

### Requisitos de Autenticação

- **Login com email e senha**: clínicas acessam o sistema com credenciais próprias.
- **Proteção de rotas**: acesso ao dashboard restrito a usuários autenticados.
- **Sessão stateless**: idealmente sem banco de sessão, usando JWT.
- **Simplicidade**: sem OAuth, sem provedores de terceiros (Google, GitHub) — o MVP é B2B e cada clínica terá seu cadastro manual.
- **Integração com Prisma**: o modelo `User` já existe no schema e contém a senha hasheada.
- **Segurança**: senhas armazenadas com hash bcrypt, sessão com HTTP-only cookies.

### Alternativas Consideradas

| Alternativa | Abordagem | Motivo da Rejeição |
|---|---|---|
| **NextAuth v4** | Autenticação para Next.js Pages Router | Não suporta App Router de forma nativa; descontinuado |
| **Auth.js v5 beta (NextAuth)** | Autenticação universal para Next.js App Router | **Selecionado** |
| **Clerk** | SaaS de autenticação terceirizado | Custo adicional; dependência externa; dados dos usuários em servidor de terceiros |
| **Lucia** | Biblioteca de autenticação leve | Menos integrações; ecossistema menor; sem suporte a JWT out-of-the-box |
| **Iron Session** | Sessão baseada em cookies criptografados | Muito baixo nível; exigiria implementar login, registro, reset de senha do zero |

---

## Decisão

**Optamos pelo Auth.js v5 beta (NextAuth) com Credentials provider, JWT strategy e Prisma Adapter.**

### Stack de Autenticação

| Componente | Tecnologia |
|---|---|
| Framework de auth | Auth.js v5 (next-auth@5.0.0-beta.25) |
| Provider | Credentials (email + senha) |
| Estratégia de sessão | JWT (stateless) |
| ORM / Adapter | @auth/prisma-adapter + Prisma v6 |
| Hashing | bcryptjs |
| Armazenamento de senha | Hash bcrypt no model `User.password` |

### Implementação Detalhada

**1. Arquivo de Configuração (`auth.config.ts`)**

```typescript
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirects to login
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  providers: [],
};
```

**2. Handler de Autenticação (`auth.ts`)**

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id;
      return session;
    },
  },
});
```

**3. Rota de API (`/api/auth/[...nextauth]/route.ts`)**

```typescript
export const { GET, POST } = handlers;
export const runtime = 'nodejs';
```

### Justificativa das Decisões

**1. Auth.js v5 (NextAuth) ao invés de NextAuth v4**

- **Suporte nativo ao App Router**: o Auth.js v5 foi reescrito para o App Router do Next.js 15 com suporte a Server Components, Route Handlers e Middleware.
- **Edge-ready**: embora o Prisma exija `runtime = 'nodejs'`, o Auth.js v5 pode rodar no Edge Runtime quando o adapter não for necessário.
- **Middleware simplificado**: o callback `authorized` no `auth.config.ts` substitui a antiga lógica de middleware com checks manuais.

**2. Credentials Provider (sem OAuth)**

- **Público B2B**: clínicas não farão login com Google ou GitHub — o email corporativo é a identidade natural.
- **Simplicidade**: evita configurar OAuth apps, redirect URIs e gerenciar tokens de refresh.
- **Controle total**: a validação de credenciais é feita inteiramente no backend da aplicação.
- **User model já existe**: o model `User` no Prisma já contém `email` e `password` — o PrismaAdapter integra perfeitamente.

**3. JWT Strategy (Stateless)**

- **Sem banco de sessão**: sessions JWT não exigem queries ao banco para validar o usuário em cada requisição.
- **Escalável**: em um cenário multi-clínica, sessions stateless não pressionam o banco.
- **Payload customizado**: o JWT carrega o `id` do usuário, permitindo consultas ao Prisma filtradas por `userId` sem precisar buscar o user a cada requisição.
- **HTTP-only cookie**: o token JWT é armazenado em cookie HTTP-only, prevenindo XSS.

**4. PrismaAdapter**

O `@auth/prisma-adapter` sincroniza automaticamente os models `User`, `Account` e `Session` do Auth.js com o banco PostgreSQL gerenciado pelo Prisma. Como usamos apenas Credentials (sem OAuth), as tabelas `Account` e `Session` não são utilizadas, mas o adapter é mantido por compatibilidade e para facilitar a adição futura de OAuth se necessário.

**5. Bcryptjs para Hashing**

- **bcryptjs**: implementação pura em JavaScript, sem dependências nativas (evita `node-gyp` e problemas de compilação em diferentes plataformas).
- **Custo computacional**: bcrypt com fator de custo padrão (10 rounds) oferece boa proteção contra brute-force.
- **Sal automático**: bcrypt incorpora salt aleatório em cada hash.

### Por que não Clerk, Lucia ou Iron Session?

| Alternativa | Motivo da Rejeição |
|---|---|
| **Clerk** | SaaS pago; dados de autenticação em servidores de terceiros; complexidade adicional para um MVP que precisa apenas de login email+senha |
| **Lucia** | Ótima biblioteca, mas não oferece JWT out-of-the-box; exigiria implementar refresh tokens, expiração e callbacks manualmente |
| **Iron Session** | Muito baixo nível; não oferece providers (Credentials), nem middleware de proteção de rotas, nem callbacks JWT |

---

## Consequências

### Positivas

- **Curva de aprendizado baixa**: Auth.js é amplamente documentado, com exemplos oficiais para Next.js App Router.
- **Segurança embutida**: CSRF protection, HTTP-only cookies, hash bcrypt, validação de sessão automática.
- **Proteção de rotas declarativa**: o middleware `auth()` + callback `authorized` protege o dashboard sem código boilerplate.
- **Stateless e escalável**: JWT elimina a necessidade de consultar o banco a cada requisição autenticada.
- **Adapter flexível**: o PrismaAdapter pode ser estendido para suportar OAuth no futuro sem mudanças na estrutura.

### Negativas

- **Auth.js v5 beta**: ainda está em beta (v5.0.0-beta.25), o que pode implicar em breaking changes entre versões.
- **Sem suporte a Edge Runtime**: a combinação PrismaAdapter + bcryptjs exige Node.js runtime — não é possível usar Edge na rota de auth.
- **Sem refresh token automático**: JWT strategy não oferece refresh automático. Se o token expirar, o usuário precisa fazer login novamente.
- **Sem recovery de senha**: o MVP não implementa "esqueci minha senha" — será necessário reset manual via banco.
- **Single session**: JWT strategy não permite invalidar sessões individualmente (revogar token exige mudar a `AUTH_SECRET`).

### Compliance e Notas Técnicas

- A rota de auth (`/api/auth/[...nextauth]`) deve usar `runtime = 'nodejs'` explicitamente.
- A `AUTH_SECRET` é obrigatória em produção e deve ser uma string aleatória de alta entropia.
- A senha do usuário é armazenada como hash bcrypt no campo `User.password`; nunca é retornada em nenhuma API.
- O cookie de sessão é automaticamente configurado com `Secure` em produção e `SameSite=Lax`.
- Para o MVP, o cadastro de novas clínicas é feito manualmente via banco ou será implementado como uma rota protegida por admin.
- Planeja-se adicionar rate limiting no endpoint de login para prevenir ataques de brute-force.
