# PRD — Documento de Requisitos do Produto

**Produto:** ClinikZap  
**Versão do Documento:** 1.0  
**Data:** 21 de maio de 2026  
**Autor:** John, Product Manager  
**Status:** Aprovado

---

## 1. Resumo Executivo

O ClinikZap é uma plataforma SaaS que permite que clínicas médicas e odontológicas brasileiras gerenciem o agendamento de consultas diretamente pelo WhatsApp. O paciente envia uma mensagem no WhatsApp da clínica e recebe um link para agendar sua consulta de forma autônoma, sem necessidade de atendente. A plataforma também oferece dashboard administrativo, CRM, lembretes automatizados e painel de analytics.

**Visão:** Tornar-se o padrão brasileiro de agendamento de consultas por WhatsApp, eliminando a sobrecarga de ligações e mensagens nas clínicas.

**Proposta de Valor:**
- Redução de custos operacionais com atendimento telefônico
- Agendamento 24/7 sem intervenção humana
- Lembretes automáticos que reduzem faltas (no-show)
- Experiência do paciente 100% via WhatsApp (sem app para baixar)
- Setup rápido: conecte o WhatsApp da clínica em minutos

---

## 2. Público-Alvo

### 2.1 Mercado Primário

| Segmento | Descrição | Tamanho Estimado (Brasil) |
|---|---|---|
| Clínicas odontológicas | Consultórios e clínicas com 1-10 dentistas | ~120.000 |
| Clínicas médicas | Clínicas de especialidades, check-up, pediatria | ~90.000 |
| Profissionais autônomos | Médicos e dentistas que atendem por conta própria | ~250.000 |
| Pequenos hospitais | Hospitais de pequeno porte e centros de diagnóstico | ~5.000 |

### 2.2 Dores do Cliente

1. **Alto volume de ligações:** Secretárias passam horas ao telefone agendando e reagendando consultas.
2. **Faltas (no-show):** Pacientes esquecem consultas — taxa média de 20-30% no Brasil.
3. **Processo manual:** Agenda de papel ou planilhas — sem confirmação automática.
4. **Experiência do paciente:** Dificuldade para agendar fora do horário comercial.
5. **Custo operacional:** Secretária dedicada exclusivamente à agenda.

### 2.3 Personas

#### Persona 1: Dra. Carla — Dentista Proprietária

| Atributo | Descrição |
|---|---|
| **Idade** | 38 anos |
| **Profissão** | Dentista, proprietária de clínica com 4 consultórios |
| **Localização** | São Paulo, SP |
| **Equipe** | 3 dentistas associados, 2 recepcionistas |
| **Dores** | Recepcionistas sobrecarregadas; pacientes esquecem horários; perde ~15% do faturamento com no-show |
| **Objetivos** | Automatizar agendamento, reduzir faltas, expandir horário de atendimento |
| **Como nos usa** | Conecta o WhatsApp da clínica, configura horários disponíveis, acompanha dashboard |
| **Frase** | "Preciso de algo simples que minhas pacientes consigam usar sem explicação." |

#### Persona 2: João — Paciente

| Atributo | Descrição |
|---|---|
| **Idade** | 32 anos |
| **Profissão** | Analista de TI |
| **Perfil** | Prefere resolver tudo pelo WhatsApp; tem pressa |
| **Comportamento** | Envia mensagem no WhatsApp da clínica → quer agendar em < 2 minutos |
| **Frustrações** | "Ligar pra clínica é uma novela — muitas vezes ninguém atende ou só tem horário comercial." |
| **Frase** | "Se não for pelo WhatsApp, provavelmente vou adiar ou ir pra outra clínica." |

#### Persona 3: Sr. Antônio — Paciente Idoso

| Atributo | Descrição |
|---|---|
| **Idade** | 67 anos |
| **Profissão** | Aposentado |
| **Perfil** | Baixa familiaridade com tecnologia |
| **Comportamento** | Envia áudio ou texto simples no WhatsApp |
| **Necessidade** | Interface muito simples — clicar em data/horário e confirmar |
| **Frase** | "Contanto que seja fácil que nem mandar mensagem, eu consigo." |

---

## 3. Mapa da Jornada do Usuário (Paciente)

```
                   ┌──────────────┐
                   │ Paciente tem │
                   │  dor/sintoma │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐     ┌─────────────────────┐
                   │ Envia WhatsApp│────▶│ Webhook cria        │
                   │ para clínica  │     │ paciente + PENDING  │
                   └──────┬───────┘     └──────────┬──────────┘
                          │                        │
                          ▼                        ▼
                   ┌──────────────┐     ┌─────────────────────┐
                   │ Link enviado │────▶│ Passo 1: Escolhe    │
                   │ no WhatsApp  │     │ data                │
                   └──────────────┘     └──────────┬──────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │ Passo 2:      │
                                            │ Escolhe hora  │
                                            └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │ Passo 3:      │
                                            │ Confirma nome │
                                            └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │ Passo 4:      │
                                            │ Sucesso       │
                                            └──────┬───────┘
                                                   │
                                                   ▼
                                   ┌──────────────────────────┐
                                   │ WhatsApp: confirmação     │
                                   │ enviada automaticamente   │
                                   └────────────┬─────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                  ▼
                      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                      │ 24h antes:   │  │ Paciente     │  │ Consulta     │
                      │ Lembrete     │  │ comparece    │  │ realizada    │
                      │ WhatsApp     │  │              │  │              │
                      └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 4. Funcionalidades

### 4.1 MVP (v1.0)

| ID | Funcionalidade | Descrição | Prioridade |
|---|---|---|---|
| F-01 | **Webhook WhatsApp** | Recebe mensagens via Evolution API e processa agendamento | P0 |
| F-02 | **Agendamento 4 passos** | Wizard: selecionar data → horário → confirmar dados → sucesso | P0 |
| F-03 | **Gestão de disponibilidade** | Horários semanais configuráveis (dias/horários) | P0 |
| F-04 | **Exceções de agenda** | Bloquear datas específicas (feriados) ou horários customizados | P0 |
| F-05 | **Confirmação automática** | WhatsApp enviado ao paciente após confirmação | P0 |
| F-06 | **Lembrete automático** | WhatsApp enviado X horas antes (configurável) | P0 |
| F-07 | **Dashboard de agendamentos** | Lista + calendário, filtra por status | P0 |
| F-08 | **Cancelamento** | Cancelar consulta pelo dashboard | P0 |
| F-09 | **Reagendamento** | Cancelar + criar novo link via dashboard | P0 |
| F-10 | **Conexão WhatsApp** | QR code para conectar instância Evolution | P0 |
| F-11 | **Autenticação** | Login/registro com email e senha (Auth.js) | P0 |
| F-12 | **Anti-flood** | Rate limiting via Redis para evitar spam | P0 |

### 4.2 Pós-MVP (v1.1 — v2.0)

| ID | Funcionalidade | Descrição | Prioridade |
|---|---|---|---|
| F-13 | **Mensagens customizáveis** | Templates editáveis para confirmação, lembrete, cancelamento | P1 |
| F-14 | **CRM de pacientes** | Histórico de consultas por paciente, notas internas | P1 |
| F-15 | **Analytics** | Gráficos de distribuição e tendência de agendamentos | P1 |
| F-16 | **Multi-profissional** | Uma clínica com múltiplos profissionais e agendas independentes | P1 |
| F-17 | **Agendamento manual** | Criar consulta pelo dashboard para atendimento presencial/telefônico | P1 |
| F-18 | **Human-takeover** | Se a secretária responde, bot para de responder por 1h | P1 |
| F-19 | **Notificações Push** | Som no dashboard quando novo agendamento chegar | P2 |
| F-20 | **WhatsApp Business API** | Suporte a mensagens template aprovadas pelo Meta | P2 |
| F-21 | **Pagamento online** | Link de pagamento na confirmação | P2 |
| F-22 | **Multi-idioma** | Suporte a templates em inglês/espanhol | P2 |
| F-23 | **Relatórios exportáveis** | CSV/PDF de agendamentos e métricas | P2 |
| F-24 | **Integração Google Agenda** | Sincronizar agenda com Google Calendar | P2 |

### 4.3 Roadmap (Multitenancy — v3.0)

| ID | Funcionalidade | Descrição | Prioridade |
|---|---|---|---|
| F-25 | **Multi-tenancy** | Uma instância servindo múltiplas clínicas | P0 (v3) |
| F-26 | **Onboarding self-service** | Cadastro e configuração 100% autônomos | P0 (v3) |
| F-27 | **Planos de assinatura** | Diferenciação por número de pacientes, profissionais, funcionalidades | P0 (v3) |
| F-28 | **White-label** | Personalização visual para cada clínica | P1 (v3) |
| F-29 | **API pública** | API REST para integração com sistemas parceiros | P1 (v3) |

---

## 5. Requisitos Não Funcionais

### 5.1 Disponibilidade e Uptime

| Requisito | Meta |
|---|---|
| Uptime da plataforma | 99.5% (exceto manutenção programada) |
| Uptime do webhook | 99.9% (impacto direto no paciente) |
| Manutenção programada | Máximo 2h/mês, comunicada com 7 dias de antecedência |
| Cron de lembretes | Executar a cada 1 hora, processar em < 30s |

### 5.2 Segurança

| Requisito | Especificação |
|---|---|
| Autenticação | JWT via Auth.js v5, sessão com HttpOnly cookies |
| Senhas | Hash com bcryptjs (cost factor 10+) |
| Dados em trânsito | TLS 1.2+ em produção |
| Webhook | Não expõe dados sensíveis; valida estrutura antes de processar |
| Redis | TTL em todas as chaves (nada persiste indefinidamente) |
| API Key Evolution | Armazenada em variável de ambiente, nunca no banco |
| CRON_SECRET | Proteção do endpoint de cron via Bearer token opcional |
| Rate limiting | Anti-flood de 15 minutos para evitar abuso no webhook |

### 5.3 Performance

| Requisito | Meta |
|---|---|
| Tempo de resposta do webhook | < 500ms (ideal) / < 2s (máximo) |
| Carregamento da página de agendamento | < 1.5s (First Contentful Paint) |
| Tela de login/dashboard | < 2s (Total Blocking Time < 200ms) |
| Disponibilidade de slots | < 300ms |
| Confirmação de agendamento | < 1s (incluindo envio do WhatsApp) |
| Envio de lembretes (cron) | 1000 lembretes processados em < 10s |

### 5.4 Escalabilidade

| Requisito | Estratégia |
|---|---|
| Escala horizontal | Aplicação stateless → múltiplas instâncias Next.js |
| Banco de dados | PostgreSQL com índices nos campos mais consultados (token, phone + userId, appointmentDate) |
| Cache distribuído | Redis para locks e anti-flood |
| Webhook | Design idempotente; Evolution API pode reenviar eventos |

### 5.5 Manutenibilidade

- Código-fonte com TypeScript estrito
- ESLint flat config
- Componentes React modulares (Server Components + Client)
- Prisma ORM com migrations versionadas
- Logs estruturados em todas as operações críticas

---

## 6. Métricas de Sucesso

### 6.1 Métricas de Negócio

| Métrica | Definição | Meta (3 meses) |
|---|---|---|
| **Agendamentos/mês** | Número total de consultas agendadas via plataforma | 500/clínica |
| **Taxa de conversão** | % de pacientes que recebem o link e concluem o agendamento | > 65% |
| **Redução de no-show** | Comparação de faltas antes/depois do ClinikZap | Redução de 50% |
| **Tempo de agendamento** | Tempo entre envio do WhatsApp e confirmação | < 3 minutos |
| **NPS** | Pesquisa de satisfação com clínicas | > 40 |

### 6.2 Métricas Técnicas

| Métrica | Meta |
|---|---|
| Uptime do webhook | 99.9% |
| Tempo médio de resposta do webhook | < 800ms |
| Taxa de erro do webhook | < 1% |
| Sucesso no envio de WhatsApp | > 98% |
| Lembretes enviados com sucesso | > 99% |

---

## 7. Cenário Competitivo

| Concorrente | Tipo | Forças | Fraquezas | Diferença do ClinikZap |
|---|---|---|---|---|
| **Reserva MK** | Agenda odontológica | Consolidado no mercado, suporte | Custo alto, interface datada | ClinikZap é mais simples e barato, foco em WhatsApp |
| **ClinicWeb** | Gestão de clínicas | Completo (financeiro, prontuário) | Curva de aprendizado alta, caro | ClinikZap é nichado em agendamento via WhatsApp |
| **ZapAgenda** | Agendamento WhatsApp | Concorrente direto | Menos robusto, sem CRM | ClinikZap oferece analytics, dashboard e templates |
| **WhatsApp Business** | Meta | Gratuito, alcance | Sem automatização de fluxo | ClinikZap automatiza o ciclo completo |
| **Calendly + WhatsApp** | Agendamento + Zap | Popular, integrações | Experiência quebrada (links externos) | ClinikZap é 100% WhatsApp nativo |
| **Bot conversacional** | Chatbot | Personalizável | Caro de implementar, complexo | ClinikZap é plug-and-play, sem programação |
| **Google Agenda** | Google | Gratuito, conhecido | Sem envio de lembrete por WhatsApp | ClinikZap usa o canal que o brasileiro mais usa |

### Diferenciais Competitivos do ClinikZap

1. **Jornada 100% WhatsApp** — paciente nunca sai do WhatsApp (link abre no próprio navegador do celular, mas a comunicação integral é via WhatsApp)
2. **Anti-flood inteligente** — impede que um mesmo paciente receba múltiplos links
3. **Human-takeover** — se a secretária responde, o bot cede lugar automaticamente
4. **Setup em minutos** — conecte o QR code do WhatsApp e configure horários
5. **Custo acessível** — SaaS com planos para todos os portes de clínica

---

## 8. Estratégia de Monetização

### 8.1 Modelo de Precificação (SaaS)

| Plano | Preço Mensal | Profissionais | Pacientes | Funcionalidades |
|---|---|---|---|---|
| **Starter** | R$ 49,90 | 1 | 100 ativos | Agendamento, lembretes, dashboard básico |
| **Profissional** | R$ 99,90 | 3 | 500 ativos | Tudo do Starter + CRM, analytics, templates |
| **Clínica** | R$ 199,90 | 10+ | Ilimitados | Tudo do Profissional + multi-profissional, suporte prioritário |
| **Enterprise** | Sob consulta | Ilimitados | Ilimitados | White-label, API, SLA dedicado |

### 8.2 Upsell Path

```
Starter ──▶ Profissional ──▶ Clínica ──▶ Enterprise
    │             │              │
    ├ Grátis      ├ Analytics    ├ Multi-profissional
    ├ 1 prof.     ├ CRM          ├ Suporte VIP
    └ 100 pac.    ├ Templates    └ Ilimitado
                   └ 500 pac.
```

### 8.3 Ciclo de Faturamento

- Cobrança mensal (cartão de crédito ou PIX via gateway)
- Teste grátis de 7 dias (sem cartão)
- Desconto de 10% no plano anual

---

## 9. Premissas e Restrições

### 9.1 Premissas

- O paciente tem WhatsApp e sabe enviar mensagens de texto
- A clínica possui um número de WhatsApp dedicado (ou linha telefônica com WhatsApp)
- A Evolution API consegue manter a conexão WhatsApp ativa 24/7
- O paciente clicará no link recebido via WhatsApp (CTR estimado: 70%+)
- O ambiente de produção será um VPS Linux com Docker

### 9.2 Restrições

- Atualmente single-clinic (um User = uma clínica)
- Sem suporte a grupos no WhatsApp (@g.us)
- Sem armazenamento de mensagens WhatsApp (apenas processamento)
- Sem prontuário eletrônico ou financeiro (foco exclusivo em agendamento)
- Dependência da Evolution API v2 para funcionamento do WhatsApp
- Redis necessário apenas em produção (desenvolvimento usa local)

---

## 10. Glossário

| Termo | Definição |
|---|---|
| **Token** | Identificador único UUID gerado para cada agendamento PENDING, usado no link público |
| **PENDING** | Status inicial — paciente recebeu link mas ainda não escolheu horário |
| **CONFIRMED** | Paciente concluiu as 4 etapas e confirmou o horário |
| **CANCELED** | Agendamento cancelado pelo profissional ou paciente |
| **Evolution API** | Serviço open-source que atua como ponte entre o WhatsApp e a aplicação |
| **Anti-flood** | Mecanismo de rate limiting que impede spam de mensagens no webhook |
| **Human-takeover** | Modo silêncio ativado quando a secretária responde o paciente diretamente |
| **Remote JID** | Identificador único do remetente no formato `5511999999999@s.whatsapp.net` |
| **Instance** | Conexão ativa do WhatsApp via Evolution API |
| **No-show** | Paciente que não comparece à consulta sem aviso prévio |

---

## 11. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Conexão WhatsApp cair | Alto | Média | Monitoramento de status, reconexão automática, notificação ao admin |
| Paciente não clicar no link | Médio | Média | Templates otimizados, CTAs claros, reenvio programado |
| Bloqueio WhatsApp (Meta) | Alto | Baixa | Usar Evolution API (não oficial); ter plano de migração para Business API |
| Concorrência copiar funcionalidades | Médio | Alta | Foco em UX, suporte humanizado, integração contínua |
| Inadimplência | Médio | Baixa | Bloqueio automático após 7 dias de atraso, retenção de dados |

---

## 12. Próximos Passos

1. ✅ **v0.1** — MVP funcional com webhook, agendamento, dashboard, CRM, analytics, conexão WhatsApp
2. 🔄 **v1.0** — Polimento de UX, templates customizáveis, testes de usabilidade com clínicas reais
3. 📅 **v1.5** — Multi-profissional por clínica, notificações push, melhorias de performance
4. 📅 **v2.0** — Relatórios, exportação, integração Google Agenda
5. 📅 **v3.0** — Multitenancy completo, onboarding self-service, planos de assinatura
