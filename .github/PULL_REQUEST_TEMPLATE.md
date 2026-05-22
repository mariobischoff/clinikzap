---
name: "📦 Pull Request"
about: "Submeta alterações para revisão"
title: ""
labels: ""
assignees: mariobischoff

---

## Descrição das Mudanças

<!-- Descreva de forma clara e objetiva o que este PR altera. Inclua o contexto necessário para o revisor entender a motivação. -->

### Problema Relacionado

<!-- Se este PR resolve uma issue, referencie-a aqui usando closes, fix, ou resolve. -->
<!-- Exemplo: "Closes #123" ou "Relacionado à feature #456" -->

### Tipo de Mudança

<!-- Marque com [x] as opções que se aplicam. -->

- [ ] 🐛 **Bugfix** — Correção de bug
- [ ] ✨ **Feature** — Nova funcionalidade
- [ ] ♻️ **Refactor** — Refatoração de código (sem mudança de comportamento)
- [ ] 📝 **Documentação** — Apenas documentação
- [ ] ⚡ **Performance** — Melhoria de performance
- [ ] 🧪 **Testes** — Adição ou correção de testes
- [ ] 🔧 **Configuração** — Mudanças em configuração/infraestrutura
- [ ] 🚀 **CI/CD** — Pipeline de integração/deploy

### Checklist

<!-- Verifique se seu PR atende aos requisitos abaixo antes de submeter. -->

- [ ] O código segue os padrões de estilo do projeto (ESLint passando)
- [ ] O build foi testado localmente (`npm run build`)
- [ ] O código foi testado em ambiente de desenvolvimento
- [ ] Se aplicável, a migração do banco de dados foi gerada (`npx prisma migrate dev`)
- [ ] Se aplicável, o cliente Prisma foi regenerado (`npx prisma generate`)
- [ ] Não há variáveis de ambiente ou secrets expostos no código
- [ ] Os commits seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] A documentação foi atualizada (se necessário)

### Evidências de Teste

<!-- Descreva como você testou as alterações. Inclua comandos executados e resultados. -->

```
Cole comandos e outputs relevantes aqui
```

### Screenshots (se aplicável)

<!-- Se o PR altera a interface do usuário, adicione screenshots do antes e depois. -->

| Antes | Depois |
|-------|--------|
|       |        |

### Referência à Issue (Linear)

<!-- Se este PR está vinculado a uma issue no Linear, informe o ID. -->
<!-- Exemplo: "ENG-123" -->

**Linear:** `ENG-`

### Informações Adicionais

<!-- Adicione qualquer informação relevante para o revisor, como decisões técnicas, trade-offs, ou áreas que merecem atenção especial. -->

---

**Agradecemos sua contribuição!** 🙌
