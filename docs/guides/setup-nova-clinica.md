# Guia de Configuração — Nova Clínica

**Versão:** 1.0
**Última atualização:** Maio/2026
**Público-alvo:** Administradores de clínica / Equipe de onboarding
**Tempo estimado:** 15-30 minutos

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Passo a Passo](#3-passo-a-passo)
   - [Passo 1: Criar Conta de Administrador](#passo-1-criar-conta-de-administrador)
   - [Passo 2: Conectar WhatsApp (Evolution API)](#passo-2-conectar-whatsapp-evolution-api)
   - [Passo 3: Configurar Horários de Funcionamento](#passo-3-configurar-horários-de-funcionamento)
   - [Passo 4: Definir Duração da Consulta](#passo-4-definir-duração-da-consulta)
   - [Passo 5: Customizar Templates de WhatsApp](#passo-5-customizar-templates-de-whatsapp)
   - [Passo 6: Ajustar Configuração de Lembretes](#passo-6-ajustar-configuração-de-lembretes)
   - [Passo 7: Testar o Fluxo Completo](#passo-7-testar-o-fluxo-completo)
   - [Passo 8: Checklist de Go Live](#passo-8-checklist-de-go-live)
4. [Troubleshooting](#4-troubleshooting)
5. [Pós-Go Live](#5-pós-go-live)

---

## 1. Visão Geral

Este guia descreve o processo completo de onboarding de uma nova clínica no ClinikZap. O objetivo é ter a clínica operacional — com WhatsApp conectado, horários configurados e agendamentos funcionando — em menos de 30 minutos.

### O que a clínica vai ganhar

- ✅ Pacientes agendam 100% pelo WhatsApp, sem intervenção humana
- ✅ Lembretes automáticos reduzem faltas (no-show)
- ✅ Dashboard para gerenciar agenda, pacientes e relatórios
- ✅ Agendamento disponível 24 horas por dia, 7 dias por semana

---

## 2. Pré-requisitos

### O que a clínica precisa ter

| Item | Detalhe | Obrigatório? |
|------|---------|:------------:|
| **Número de WhatsApp ativo** | Linha telefônica com WhatsApp instalado | ✅ Sim |
| **Smartphone com WhatsApp** | Para escanear o QR Code de conexão | ✅ Sim |
| **Email corporativo válido** | Para criar a conta de administrador | ✅ Sim |
| **Nome da clínica** | Nome fantasia ou razão social | ✅ Sim |
| **Horários de funcionamento** | Dias da semana e horários de atendimento | ✅ Sim |
| **Duração das consultas** | Tempo padrão de cada consulta (30, 45 ou 60 min) | ✅ Sim |
| **Internet estável** | Para manter a conexão WhatsApp ativa | ✅ Sim |

### O que NÓS (equipe ClinikZap) precisamos ter

- [ ] Ambiente de produção operacional (VPS, banco, Redis)
- [ ] Instância Evolution API rodando e funcionando
- [ ] Domínio com SSL configurado (`https://clinikzap.mariotech.com.br`)
- [ ] Acesso ao painel administrativo (se necessário, criar conta superadmin)

---

## 3. Passo a Passo

### Passo 1: Criar Conta de Administrador

**O quê:** Criar o usuário administrador da clínica no sistema.

**Quem faz:** Administrador da clínica.

**Tempo:** 2 minutos.

**Instruções:**

1. Abra o navegador e acesse: **`https://clinikzap.mariotech.com.br/login`**

2. Clique no link **"Criar conta"** ou **"Registrar"** (abaixo do formulário de login).

3. Preencha os campos:
   - **Nome:** Nome da clínica ou do profissional (ex: "Clínica Odontológica Sorriso")
   - **Email:** Email corporativo (ex: `contato@sorriso.com.br`)
   - **Senha:** Mínimo 8 caracteres, com letra maiúscula e número

4. Clique em **"Criar conta"**.

5. Você será redirecionado automaticamente ao **Dashboard**.

6. ✅ **Verificação:** Na barra lateral, deve aparecer o nome da clínica no canto superior direito.

> **⚠️ Importante:** Guarde o email e a senha em local seguro. Não há recuperação de senha automática atualmente — entre em contato com o suporte se precisar redefinir.

---

### Passo 2: Conectar WhatsApp (Evolution API)

**O quê:** Conectar o número de WhatsApp da clínica à plataforma via QR Code.

**Quem faz:** Administrador da clínica (com o smartphone da clínica em mãos).

**Tempo:** 3-5 minutos.

**Instruções:**

1. No Dashboard, vá em **"Configurações"** → **"Conexão WhatsApp"**.

2. Clique em **"Conectar WhatsApp"**.

3. Um **QR Code** será exibido na tela.

4. **No smartphone da clínica:**
   - Abra o **WhatsApp**
   - Toque nos **três pontos** (⋮) no canto superior direito (Android) ou **Configurações** (iPhone)
   - Vá em **"Aparelhos conectados"** → **"Conectar um dispositivo"**
   - Escaneie o QR Code exibido no dashboard do ClinikZap

5. Após escanear, a tela do dashboard mostrará **"WhatsApp Conectado ✅"**.

6. O status da conexão aparecerá como **"Conectado"** e o número do telefone será exibido.

**Verificação:**

```bash
# Pela equipe de operações — confirmar conexão no servidor:
curl -s http://localhost:8080/instance/connectionState/clinikzap \
  -H "apikey: $EVOLUTION_API_KEY" | jq .
# Resposta esperada: { "state": "open", "status": "connected" }
```

> **❓ Problemas?** Se o QR Code expirar antes de escanear, clique em **"Atualizar QR Code"**. Se a conexão cair depois, a Evolution API tenta reconectar automaticamente (até 5 tentativas). Se falhar, repita o processo de escaneamento.

---

### Passo 3: Configurar Horários de Funcionamento

**O quê:** Definir os dias da semana e horários em que a clínica atende.

**Quem faz:** Administrador da clínica.

**Tempo:** 5 minutos.

**Instruções:**

1. No Dashboard, vá em **"Configurações"** → **"Horários"**.

2. Você verá uma grade com os 7 dias da semana (domingo a sábado).

3. Para cada dia da semana:
   - **Dia fechado:** Deixe o dia desmarcado (ex: domingo)
   - **Dia aberto:** Marque o dia e adicione os horários no formato `HH:MM`

4. **Horário padrão (se não configurar nada):**
   - Manhã: 08:00 às 12:00
   - Tarde: 13:00 às 18:00
   - Intervalos a cada 30 minutos

5. Para configurar um dia específico, clique em **"Adicionar horário"** e digite o horário de início (ex: `08:00`, `14:30`).

6. Repita para todos os dias da semana que a clínica atende.

**Exemplo de configuração típica:**

| Dia | Atende? | Horários |
|-----|:-------:|----------|
| Domingo | ❌ | — |
| Segunda | ✅ | 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30 |
| Terça | ✅ | (mesmo da segunda) |
| Quarta | ✅ | (mesmo da segunda) |
| Quinta | ✅ | (mesmo da segunda) |
| Sexta | ✅ | 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 |
| Sábado | ✅ | 08:00, 08:30, 09:00, 09:30, 10:00 |

> **💡 Dica:** Defina os horários de início de cada consulta. O sistema calcula automaticamente os intervalos com base na duração configurada no Passo 4.

**Exceções (feriados/datas especiais):**

Para bloquear um dia específico (feriado) ou criar horário especial:

1. No Dashboard, vá em **"Configurações"** → **"Exceções de Agenda"**.
2. Clique em **"Adicionar Exceção"**.
3. Selecione a data e:
   - **Bloquear dia inteiro:** Deixe a lista de horários vazia
   - **Horário especial:** Adicione apenas os horários desejados
4. Clique em **"Salvar"**.

---

### Passo 4: Definir Duração da Consulta

**O quê:** Configurar o tempo padrão de cada consulta.

**Quem faz:** Administrador da clínica.

**Tempo:** 1 minuto.

**Instruções:**

1. No Dashboard, vá em **"Configurações"** → **"Duração da Consulta"**.

2. Selecione uma das opções:
   - **30 minutos** (padrão) — ideal para consultas rápidas
   - **45 minutos** — ideal para atendimentos de média complexidade
   - **60 minutos** — ideal para consultas mais longas

3. Clique em **"Salvar"**.

**Impacto:**

- A duração define o espaçamento entre os slots de horário disponíveis
- Exemplo: se a clínica abre das 08:00 às 12:00 com duração de 30 min → slots: 08:00, 08:30, 09:00, 09:30...
- Se a duração for 60 min → slots: 08:00, 09:00, 10:00, 11:00...

> **⚠️ Nota:** A duração é global para a clínica. Se você precisa de durações diferentes para diferentes tipos de consulta, isso será suportado em versões futuras (multi-profissional).

---

### Passo 5: Customizar Templates de WhatsApp

**O quê:** Personalizar as mensagens que os pacientes recebem automaticamente.

**Quem faz:** Administrador da clínica.

**Tempo:** 5 minutos.

**Instruções:**

1. No Dashboard, vá em **"Configurações"** → **"Mensagens WhatsApp"**.

2. Você verá 3 campos de texto para editar:

   **a) Template de Confirmação**
   Enviado após o paciente confirmar o agendamento.
   ```
   Olá, *{nome_paciente}*!

   Confirmamos seu agendamento na clínica *{nome_clinica}*:

   📅 Data: *{data_consulta}*
   ⏰ Horário: *{hora_consulta}*

   Seu agendamento foi salvo com sucesso!
   ```

   **b) Template de Cancelamento**
   Enviado quando um agendamento é cancelado.
   ```
   Olá, *{nome_paciente}*.

   Sua consulta na clínica *{nome_clinica}* agendada para *{data_consulta}* às *{hora_consulta}* foi cancelada.
   ```

   **c) Template de Lembrete**
   Enviado automaticamente antes da consulta.
   ```
   Olá, *{nome_paciente}*!

   Este é um lembrete da sua consulta marcada na clínica *{nome_clinica}* para o dia *{data_consulta}* às *{hora_consulta}*.

   Contamos com a sua presença! Se precisar reagendar ou cancelar, entre em contato.
   ```

3. Edite os templates conforme preferir. **Mantenha as variáveis** entre chaves `{ }` — elas são substituídas automaticamente.

4. Clique em **"Salvar Templates"** no final da página.

**Variáveis disponíveis:**

| Variável | Substituído por | Exemplo |
|----------|----------------|---------|
| `{nome_paciente}` | Nome do paciente | João Silva |
| `{nome_clinica}` | Nome da clínica | Clínica Sorriso |
| `{data_consulta}` | Data formatada (pt-BR) | 25/05/2026 |
| `{hora_consulta}` | Horário formatado | 14:30 |
| `{link_consulta}` | Link de agendamento | (apenas para templates de PENDING) |

> **💡 Dicas de templates:**
> - Use *asteriscos* para **negrito** no WhatsApp
> - Seja breve — mensagens muito longas podem ter baixa taxa de leitura
> - Inclua instruções claras: "Se precisar reagendar, responda esta mensagem"
> - Personalize com o nome do paciente para aumentar engajamento

---

### Passo 6: Ajustar Configuração de Lembretes

**O quê:** Definir com quantas horas de antecedência o lembrete será enviado.

**Quem faz:** Administrador da clínica.

**Tempo:** 1 minuto.

**Instruções:**

1. No Dashboard, vá em **"Configurações"** → **"Lembretes"**.

2. Defina **"Enviar lembrete X horas antes"**:
   - **24 horas** (padrão) — Recomendado para consultas no dia seguinte
   - **12 horas** — Para consultas no mesmo dia (período da tarde)
   - **6 horas** — Para clínicas com alta taxa de no-show
   - **48 horas** — Para procedimentos que exigem preparação

3. Clique em **"Salvar"**.

> **ℹ️ Como funciona:** O sistema executa um cron a cada 1 hora que verifica se há consultas dentro da janela de disparo. A janela começa `reminderHours - 1h` e termina `reminderHours + 1.5h` antes da consulta. Isso garante que o lembrete seja enviado mesmo se o cron atrasar um pouco.

---

### Passo 7: Testar o Fluxo Completo

**O quê:** Validar que todo o fluxo de agendamento está funcionando corretamente.

**Quem faz:** Administrador da clínica (com um celular pessoal para teste).

**Tempo:** 5 minutos.

**Instruções:**

#### Teste 1: Paciente envia mensagem

1. De um **outro celular** (não o da clínica), envie uma mensagem para o **número de WhatsApp da clínica**.
2. A mensagem pode ser qualquer coisa: "Olá", "Quero agendar", "Bom dia".

**Resultado esperado:**
- Você receberá uma resposta automática com um link de agendamento
- A mensagem será algo como: "Olá! Para realizar o agendamento da sua consulta na clínica [nome], escolha o seu horário clicando no link abaixo:"
- O link terá o formato: `https://clinikzap.mariotech.com.br/schedule/[token]`

#### Teste 2: Agendar consulta

1. Clique no link recebido.
2. **Passo 1:** Selecione uma data disponível (próximos 10 dias úteis).
3. **Passo 2:** Selecione um horário disponível.
4. **Passo 3:** Confirme o nome do paciente (pode editar).
5. **Passo 4:** Tela de sucesso.

**Resultado esperado:**
- Tela de sucesso com confirmação
- Mensagem de confirmação no WhatsApp: "Confirmamos seu agendamento..."

#### Teste 3: Verificar no Dashboard

1. Faça login no Dashboard da clínica.
2. Vá em **"Agendamentos"**.
3. O agendamento recém-criado deve aparecer com status **CONFIRMED**.
4. Os dados (paciente, data, horário) devem estar corretos.

#### Teste 4: Verificar histórico do paciente

1. No Dashboard, vá em **"Pacientes"**.
2. Busque pelo telefone ou nome usado no teste.
3. O paciente deve aparecer com o histórico do agendamento.

#### Teste 5: Anti-flood

1. Envie **duas mensagens seguidas** (intervalo de 1 minuto) do mesmo celular para o WhatsApp da clínica.
2. Apenas a **primeira mensagem** deve gerar resposta com link.
3. A **segunda mensagem** deve ser ignorada (anti-flood de 15 minutos).

#### Teste 6: Reagendamento (opcional)

1. No Dashboard, localize o agendamento de teste.
2. Clique em **"Reagendar"**.
3. Confirme o reagendamento.
4. O paciente deve receber um novo link no WhatsApp.

> **❓ Se algo falhar:** Consulte a seção de [Troubleshooting](#4-troubleshooting) abaixo.

---

### Passo 8: Checklist de Go Live

**Antes de liberar a clínica para operação real**, verifique cada item:

#### Configurações Básicas

- [ ] Conta de administrador criada com email válido
- [ ] WhatsApp conectado e status "Conectado" confirmado
- [ ] Horários de funcionamento configurados para todos os dias da semana
- [ ] Duração da consulta definida (30, 45 ou 60 min)
- [ ] Templates de WhatsApp revisados e personalizados (opcional)
- [ ] Configuração de lembretes ajustada (padrão 24h)

#### Testes Realizados

- [ ] **Fluxo completo:** Paciente envia WhatsApp → recebe link → agenda → confirmação enviada
- [ ] **Dashboard:** Agendamento aparece corretamente no painel
- [ ] **Anti-flood:** Múltiplas mensagens do mesmo paciente são bloqueadas
- [ ] **Lembrete:** Verificar se o cron está configurado no servidor

#### Comunicação com a Clínica

- [ ] A clínica foi orientada sobre como funciona o fluxo
- [ ] A clínica sabe que o bot responde automaticamente às mensagens
- [ ] A clínica sabe que se um atendente responder manualmente, o bot para por 1h (human-takeover)
- [ ] A clínica foi informada sobre o período de teste (recomendado: 1 semana monitorada)
- [ ] Contato de suporte compartilhado com a clínica

#### Checklist Técnico (equipe de operações)

- [ ] Evolution API conectada e estável
- [ ] Redis operacional (verificar no servidor)
- [ ] PostgreSQL com backup automático configurado
- [ ] SSL válido (Let's Encrypt)
- [ ] Espaço em disco suficiente (> 20% livre)
- [ ] Logs do webhook sem erros após testes

---

## 4. Troubleshooting

### 4.1 Não consigo criar a conta

**Problema:** A página de login não mostra opção de criar conta.

**Possíveis causas e soluções:**
- Atualmente o registro pode estar desabilitado na interface. Contate o suporte para criar a conta manualmente.
- Verifique se o email já não está cadastrado.
- Se o erro for de conexão, verifique se o servidor está online.

### 4.2 QR Code não aparece ou expirou

**Problema:** A tela de conexão não exibe o QR Code.

**Soluções:**
1. Clique em **"Atualizar QR Code"** para gerar um novo.
2. Verifique se a Evolution API está rodando (contate a equipe de operações).
3. Limpe o cache do navegador e tente novamente.
4. Se o problema persistir, a instância pode precisar ser recriada (operação interna).

### 4.3 WhatsApp desconecta com frequência

**Problema:** A conexão cai várias vezes ao dia.

**Possíveis causas:**
- Smartphone da clínica perde conexão com a internet
- WhatsApp Web desconecta por inatividade (embora a Evolution API tente manter ativa)
- Problemas de rede no servidor
- Múltiplos dispositivos conectados ao WhatsApp Web

**Soluções:**
1. Verificar se o smartphone da clínica tem internet estável (Wi-Fi ou 4G).
2. Manter o WhatsApp do smartphone ativo (não desinstalar, não limpar dados).
3. Se o problema persistir, verificar conectividade de rede do servidor.
4. Considerar usar um número dedicado apenas para o ClinikZap (recomendado em vez do celular pessoal).

### 4.4 Paciente não recebe resposta no WhatsApp

**Problema:** Paciente envia mensagem mas não recebe o link.

**Checklist:**
1. ✅ O WhatsApp da clínica está conectado? (verificar no Dashboard)
2. ✅ A Evolution API está rodando? (operação interna)
3. ✅ O webhook está configurado? (operação interna)
4. ✅ Existe pelo menos uma clínica cadastrada? (verificar com operações)

**Solução rápida:**
- Pedir para a clínica reiniciar o WhatsApp ou o celular
- Se o status no Dashboard mostrar "Conectado", o problema pode ser no webhook — contatar operações

### 4.5 Anti-flood bloqueando paciente "legítimo"

**Problema:** Um paciente enviou uma mensagem, mas depois de alguns minutos enviou outra e não recebeu resposta.

**Solução:** É comportamento esperado. O anti-flood bloqueia por 15 minutos. Após esse período, uma nova mensagem receberá resposta normalmente. Oriente a clínica a informar o paciente para aguardar ou usar o link que já foi enviado.

### 4.6 Bot não para de responder mesmo com secretária ativa

**Problema:** A secretária atendeu o paciente, mas o bot continua enviando mensagens.

**Possíveis causas:**
- A secretária não usou o WhatsApp da clínica para responder (pode ter usado outro número)
- O human-takeover depende de `fromMe: true`, que só funciona se a mensagem sair do mesmo número conectado
- Redis pode estar offline (o silence mode não funciona sem Redis)

**Soluções:**
1. Verificar se a secretária respondeu do número correto (o mesmo que está conectado ao ClinikZap)
2. Verificar status do Redis (contatar operações)
3. Em último caso, desativar temporariamente o anti-flood (não recomendado)

### 4.7 Agendamento criado mas não aparece no Dashboard

**Problema:** Após teste, o agendamento não aparece na lista.

**Soluções:**
1. Verificar o filtro de data no Dashboard (pode estar mostrando apenas "Hoje")
2. Verificar o status do agendamento (se foi cancelado ou está pendente)
3. Atualizar a página
4. Verificar no banco de dados (contatar operações):
   ```sql
   SELECT * FROM "Appointment" WHERE "userId" = '<id-da-clinica>' ORDER BY "createdAt" DESC LIMIT 5;
   ```

### 4.8 Template de WhatsApp com erro

**Problema:** A mensagem enviada ao paciente contém `{variavel}` literal, não substituída.

**Causa e solução:**
- Verifique se escreveu a variável **exatamente** como documentado: `{nome_paciente}` e não `{nome}` ou `[nome]`
- Corrija no template e salve novamente
- Se o erro persistir, redefina para o template padrão (deixe em branco)

---

## 5. Pós-Go Live

### Monitoramento Inicial (primeira semana)

| O que monitorar | Frequência | Como |
|----------------|-----------|------|
| Agendamentos sendo criados | Diário | Dashboard → Agendamentos |
| Pacientes reclamando | Contínuo | Clínica reporta ao suporte |
| Conexão WhatsApp | Diário | Dashboard → Conexão WhatsApp |
| Erros no webhook | Diário | Logs do servidor |
| Lembretes sendo enviados | Após 24h | Perguntar ao paciente se recebeu |

### Métricas de Sucesso (primeiro mês)

| Métrica | Meta | Como medir |
|---------|:----:|------------|
| Taxa de conversão (link → agendamento) | > 65% | (Appointments CONFIRMED / Links enviados) × 100 |
| Agendamentos criados | > 30/mês | Dashboard → Agendamentos |
| Redução de ligações telefônicas | Relato da clínica | Perguntar à clínica |
| NPS (Net Promoter Score) | > 40 | Pesquisa com a clínica |

### Próximos Passos

- [ ] Agendar treinamento com a equipe da clínica (secretárias)
- [ ] Acompanhar primeiros agendamentos reais
- [ ] Ajustar templates baseado no feedback da clínica
- [ ] Revisar métricas após 30 dias

---

> **Documento mantido por:** John, Product Manager
> **Última atualização:** Maio/2026
> **Próxima revisão:** Agosto/2026
