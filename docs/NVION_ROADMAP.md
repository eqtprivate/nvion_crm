# NVION CRM — Roadmap Técnico e Funcional

## 1. Objetivo do Produto

O NVION CRM é uma plataforma B2B para empresas que vendem consórcios. O objetivo é estruturar a operação comercial e financeira desde a prospecção até a venda, comissão, conciliação, formação de recebíveis e futura antecipação parcial.

Fluxo-alvo:

Lead → Oportunidade → Venda de Consórcio → Conciliação com Administradora → Comissão Confirmada → Recebível Futuro → Limite Antecipável → Solicitação de Antecipação Parcial

## 1.1 Estado real (atualizado em 2026-07)

> Este bloco reflete o estado atual do código, que evoluiu além da redação
> original das seções abaixo (que descrevem a fase Base44/localStorage).

- **Backend migrado para Supabase**: Auth nativo, RLS multiempresa, Edge
  Functions (criação de usuário, reset de senha, e-mails, backup) e RPCs.
- **Segurança (Sprint 7) muito avançada**: política de senha forte + reset
  obrigatório, senha temporária protegida, recuperação por e-mail, trilha de
  auditoria, isolamento por empresa via RLS, expurgo de PII do Base44
  (ver `SECURITY_AUDIT.md`).
- **Backup diário por empresa**: snapshot em bucket privado
  `backups/{empresa_id}/{data}.json`, retenção de 7 dias, agendado por
  `pg_cron` (ver `docs/nvion-backup.md`).
- **Distribuição round-robin de leads**: presença por heartbeat + trigger
  `assign_lead_round_robin`; vendedor logado entra no rodízio, deslogado sai.
- **Sprint 1 (core comercial)**: implementado (lead → oportunidade → venda).
- **Sprint 2 (comissões)**: implementado — engine `src/lib/comissao.js`,
  geração a partir da venda + parcelas (`VendasConsorcio.jsx`), página
  `Comissoes.jsx` com KPIs/filtros/status/CSV. **Pendências de robustez**:
  ver seção 3.7.
- **Sprints 3–5 (conciliação, recebíveis, antecipação)**: existem entidades e
  esqueleto parcial (`RecebiveisConsorcio`, `conciliacao_vendas`), mas os
  módulos ainda não estão completos.

## 2. Estado Atual do Projeto

### 2.1 Stack

- React 18
- Vite
- React Router
- TanStack Query
- Tailwind
- Radix UI
- Recharts
- Supabase (Auth, Postgres/RLS, Edge Functions) — camada `src/api/db` ainda
  expõe entidades no estilo Base44 por compatibilidade

### 2.2 Repositório

- Repositório: `eqtprivate/nvion_crm`
- Branch principal: `main`
- App Base44: `6a408d646f21968247407e53`
- Public URL: `nvion.base44.app`
- Observação crítica: o app Base44 está com `git_remote_source: s3`, portanto o domínio publicado pode não refletir automaticamente o GitHub.

### 2.3 Páginas registradas

O arquivo `src/pages.config.js` registra:

- Dashboard
- Leads
- Oportunidades
- Contacts
- Accounts
- ProdutoConsorcio
- EquipeComercial
- Vendedores
- VendasConsorcio
- RegrasComissao
- Reports
- Settings
- DadosTeste
- GestaoAcessos
- Profile

### 2.4 Funcionalidades já implementadas

#### Autenticação customizada

- Login próprio via entidade `UsuarioAcesso`.
- Sessão local em `localStorage`.
- Hash SHA-256 com fallback JS.
- Controle de acesso interno por `AuthProvider`.

#### Controle de acesso por papel

Arquivo: `src/lib/accessControl.js`

- `super_admin`: vê todos os registros.
- Admins e gestores: veem registros da empresa vinculada.
- Líder comercial: vê registros em que aparece como líder ou registros dos vendedores da equipe.
- Vendedor: vê registros em que aparece como vendedor responsável.

#### Módulos operacionais

- Painel Geral
- Prospecção
- Oportunidades
- Clientes
- Administradoras
- Produtos de Consórcio
- Equipes Comerciais
- Vendedores
- Vendas de Consórcio
- Regras de Comissão
- Relatórios Gerenciais
- Gestão de Acessos
- Dados de Teste

#### Dados de teste

A página `DadosTeste` possui seed controlado para:

- Administradoras
- Produtos
- Equipes
- Vendedores
- Clientes
- Leads
- Oportunidades
- Vendas
- Regras de Comissão

## 3. Principais Lacunas Encontradas

### 3.1 Sincronização GitHub x Base44

O GitHub está mais avançado que o build publicado. O Base44 ainda usa `git_remote_source: s3`, o que pode causar divergência entre:

- código do repositório;
- preview do editor;
- domínio público.

Risco: alterações feitas no GitHub não aparecerem no domínio.

### 3.2 Tela de login legada

O domínio público ainda exibiu a tela legada com `Nvision CRM`, apesar do GitHub já conter correções para `NVION CRM`.

Prioridade: alta.

### 3.3 Módulos/permissões desatualizados

`src/pages.config.js` contém os módulos novos, mas `src/lib/modules.js` ainda lista apenas os módulos antigos.

Impactos:

- Gestão de Acessos não lista todos os módulos.
- Usuários não conseguem receber permissões para Produtos, Vendedores, Vendas, Regras e Dados de Teste.
- Admins podem não ver todo o menu.

Prioridade: crítica.

### 3.4 Comissões ainda não são entidade operacional própria

Existe `RegrasComissao` e `VendasConsorcio`, mas ainda falta a entidade/página `Comissoes` para materializar a comissão gerada por venda.

### 3.5 Conciliação ainda não implementada

Ainda não há módulo de upload/importação de relatório de administradora, comparação com vendas internas e tratamento de divergências.

### 3.6 Recebíveis e antecipação ainda não implementados

A tese central do produto depende de converter vendas conciliadas em recebíveis futuros elegíveis. Essa camada ainda não existe.

### 3.7 Pendências de robustez da Sprint 2 (Comissões)

O fluxo funciona, mas a auditoria identificou pontos a endurecer:

1. **Recebíveis com valor zerado no caminho novo**: `gerarRecebiveis` usa
   `data.valor_comissao_prevista` como total; com a engine nova de regras esse
   campo pode vir vazio, gerando recebíveis com `valor_recebivel = 0`. Deveria
   usar `calc.valorComissaoTotal` (ou a soma das parcelas).
2. **Risco de comissão duplicada por venda**: o backfill retroativo é guardado
   apenas por `backfillKeyRef` no cliente. Com dois admins simultâneos (ou
   corrida entre leitura e escrita) pode criar mais de uma `Comissoes` para a
   mesma venda. Recomenda-se índice único parcial em
   `comissoes(venda_vinculada)` no Supabase.
3. **Backfill não materializa parcelas**: `gerarComissao(venda, venda)` roda com
   `comParcelas = false`, então comissões retroativas ficam sem
   `ParcelasComissao` — inconsistente com o cadastro normal.
4. **Consistência de status**: a UI de `Comissoes` altera `status_comissao`, mas
   não propaga o status às `ParcelasComissao` vinculadas (estorno/cancelamento).

## 4. Roadmap por Sprints

## Sprint 0 — Estabilização, publicação e permissões

Objetivo: garantir que o app publicado corresponda ao código correto e que todos os módulos estejam acessíveis.

### Entregas

1. Resolver divergência GitHub x Base44/S3.
2. Garantir que o domínio público carregue o build mais recente.
3. Corrigir tela de login legada.
4. Atualizar `src/lib/modules.js` para incluir todos os módulos.
5. Garantir que `admin_empresa` e `super_admin` vejam todos os módulos administrativos.
6. Validar login em domínio público.
7. Rodar seed em `DadosTeste`.
8. Validar navegação completa com usuário de teste.

### Critério de aceite

- Domínio público não exibe mais `Nvision`.
- Menu lateral mostra módulos conforme perfil.
- Usuário admin consegue acessar todas as telas.
- Gestão de Acessos lista os módulos novos.
- Dados de teste populam vendas e regras.

## Sprint 1 — Consolidação do Core Comercial

Objetivo: deixar a jornada comercial usável do lead à venda.

### Entregas

1. Revisar Prospecção.
2. Revisar Oportunidades.
3. Revisar Clientes.
4. Revisar Administradoras.
5. Revisar Produtos de Consórcio.
6. Melhorar vínculo entre lead, oportunidade, cliente e venda.
7. Padronizar campos de status.
8. Criar validações mínimas de dados.
9. Melhorar filtros por vendedor, líder, administradora e status.

### Critério de aceite

- Um lead pode evoluir para oportunidade.
- Uma oportunidade pode gerar venda.
- Uma venda herda cliente, vendedor, líder, produto, administradora e valor da carta.

## Sprint 2 — Comissões Operacionais

Objetivo: transformar regras e vendas em comissões calculadas.

### Nova entidade sugerida: `Comissoes`

Campos sugeridos:

- empresa_vinculada
- venda_vinculada
- cliente
- administradora
- produto
- vendedor
- lider
- equipe
- valor_carta
- regra_comissao
- percentual_base
- valor_comissao_total
- percentual_vendedor
- valor_comissao_vendedor
- percentual_lider
- valor_comissao_lider
- data_prevista_pagamento
- data_confirmacao
- data_pagamento
- status_comissao
- origem
- observacoes

Status sugeridos:

- prevista
- confirmada
- liberada
- paga
- bloqueada
- estornada
- cancelada

### Entregas

1. Criar página `Comissoes`.
2. Gerar comissão a partir de venda.
3. Buscar regra por produto/administradora.
4. Calcular comissão total, vendedor e líder.
5. Filtros por período, vendedor, líder, administradora e status.
6. KPIs de comissão prevista, confirmada, paga, bloqueada e estornada.
7. Exportação CSV.

## Sprint 3 — Conciliação com Administradoras

Objetivo: comparar vendas internas com relatórios de administradoras.

### Entidades sugeridas

#### `ImportacaoRelatorioAdministradora`

- empresa_vinculada
- administradora
- arquivo_nome
- data_importacao
- competencia
- total_linhas
- total_conciliado
- total_divergente
- status_importacao

#### `ConciliacaoVenda`

- empresa_vinculada
- venda_vinculada
- importacao_vinculada
- administradora
- cliente
- grupo
- cota
- valor_carta_interno
- valor_carta_relatorio
- comissao_interna
- comissao_relatorio
- status_conciliacao
- divergencia_tipo
- observacoes

### Entregas

1. Upload/importação CSV/XLSX.
2. Mapeamento de colunas por administradora.
3. Matching por grupo/cota/cliente/valor.
4. Status: conciliada, divergente, não encontrada, pendente.
5. Tela de divergências.
6. Atualização de status em `VendasConsorcio`.

## Sprint 4 — Recebíveis

Objetivo: transformar comissões confirmadas em recebíveis futuros.

### Entidade sugerida: `RecebiveisConsorcio`

- empresa_vinculada
- venda_vinculada
- comissao_vinculada
- administradora
- cliente
- vendedor
- valor_recebivel
- data_prevista_recebimento
- status_recebivel
- elegivel_antecipacao
- motivo_inelegibilidade
- aging

### Entregas

1. Criar carteira de recebíveis.
2. Classificar status: previsto, confirmado, recebido, atrasado, cancelado.
3. Aging por data prevista.
4. KPIs de carteira futura.
5. Exportação CSV.

## Sprint 4.5 — Inteligência de Recebíveis (KPIs, dados e dashboards)

Objetivo: consolidar e derivar indicadores da carteira de recebíveis, criando a camada de dados que alimenta o cálculo de margem/limite de antecipação (Sprint 5). Não implementa antecipação; apenas prepara e concatena as informações que a antecipação vai consumir.

### Camada de dados (reutilizável)

- `src/lib/recebiveisMetrics.js`: funções puras que agregam `recebiveis_consorcio` (+ `comissoes` / `vendas_consorcio`) em métricas, reutilizáveis tanto pelo dashboard quanto pelo futuro motor de limite.

### Indicadores / KPIs

1. Carteira futura por competência (fluxo previsto mês a mês) — projeção de caixa.
2. Aging buckets: a vencer (0–30, 31–60, 61–90, +90 dias) e vencidos.
3. Elegível vs inelegível para antecipação (valor e %), com quebra por motivo de inelegibilidade.
4. Concentração de risco: por administradora, por vendedor/equipe e por produto.
5. Prazo médio de recebimento (previsto) e realizado.
6. Realizado x Previsto (histórico): taxa de conversão de recebível previsto → recebido.
7. Índice de atraso/inadimplência (valor vencido / carteira ativa).
8. Base de histórico da empresa: meses de operação e volume recebido acumulado — insumo direto das faixas de histórico do Sprint 5.

### Entregas

1. Dashboard de Recebíveis (página dedicada ou aba) com os KPIs acima.
2. Gráficos: curva de vencimentos futuros, aging, concentração por administradora/vendedor.
3. Filtros por período, administradora, vendedor, status e elegibilidade.
4. Exportação dos agregados.
5. Documentar os indicadores que serão consumidos pelo motor de limite.

### Critério de aceite

- É possível visualizar quanto da carteira é elegível para antecipação, com seu vencimento e concentração.
- Existe uma base histórica (meses de operação + volume recebido) pronta para parametrizar a política de antecipação.
- As métricas ficam em uma camada reutilizável (`recebiveisMetrics.js`), não presas à tela.

## Sprint 5 — Limite de Antecipação Parcial

Objetivo: calcular limite inteligente baseado no histórico da empresa.

Depende diretamente da camada de dados e da base histórica produzidas no Sprint 4.5.

### Regras MVP sugeridas

- Menos de 90 dias de histórico: sem limite.
- 90 a 179 dias: até 30% da próxima parcela elegível.
- 180 a 359 dias: até 50%.
- Acima de 360 dias: até 70%.

### Entidades sugeridas

#### `PoliticaAntecipacao`

- empresa_vinculada
- faixa_historico_inicio
- faixa_historico_fim
- percentual_limite
- status

#### `LimiteAntecipacao`

- empresa_vinculada
- periodo_referencia
- valor_recebiveis_elegiveis
- percentual_limite_aplicado
- limite_disponivel
- limite_utilizado
- limite_remanescente
- status

#### `SolicitacaoAntecipacao`

- empresa_vinculada
- valor_solicitado
- limite_disponivel_no_momento
- status_solicitacao
- aprovador
- data_solicitacao
- data_aprovacao
- observacoes

### Entregas

1. Cálculo do limite disponível.
2. Tela de solicitação de antecipação.
3. Aprovação manual por superadmin/analista.
4. Histórico de solicitações.
5. Status: solicitada, em análise, aprovada, recusada, liquidada, cancelada.

## Sprint 6 — Dashboards Executivos e Governança

Objetivo: consolidar visão gerencial para empresa e plataforma.

### Entregas

1. Dashboard comercial.
2. Dashboard financeiro.
3. Dashboard de comissões.
4. Dashboard de recebíveis.
5. Dashboard de antecipação.
6. Ranking de vendedores/líderes.
7. Indicadores de qualidade da carteira.
8. Logs de auditoria.
9. Exportações gerenciais.

## Sprint 7 — Segurança e Produção

Objetivo: preparar o produto para operação real.

### Entregas

1. Revisar autenticação customizada.
2. Avaliar migração para autenticação server-side/nativa.
3. Remover senha temporária visível após criação.
4. Criar fluxo de redefinição de senha.
5. Criar trilha de auditoria.
6. Melhorar isolamento multiempresa.
7. Revisar LGPD: mascaramento, logs e minimização de dados.
8. Revisar permissões por papel e por ação.

## 5. Priorização Recomendada

### Crítico imediato

1. Sincronização publicação/Base44.
2. Login público correto.
3. Atualização de módulos/permissões.
4. Seed e dados demonstráveis.

### MVP comercial

1. Leads.
2. Oportunidades.
3. Produtos.
4. Vendedores.
5. Vendas.
6. Regras.
7. Comissões.

### MVP financeiro

1. Conciliação.
2. Recebíveis.
3. Limite antecipável.
4. Solicitação de antecipação.

## 6. Definição de MVP Demonstrável

O MVP demonstrável deve permitir:

1. Cadastrar administradora.
2. Cadastrar produto de consórcio.
3. Cadastrar equipe e vendedor.
4. Registrar lead.
5. Criar oportunidade.
6. Registrar venda.
7. Aplicar regra de comissão.
8. Gerar comissão prevista.
9. Conciliar venda com relatório da administradora.
10. Formar recebível futuro.
11. Calcular limite de antecipação parcial.

## 7. Observações Técnicas

- Evitar criar novas páginas antes de estabilizar publicação e permissões.
- Evitar duplicidade de nomes de administradoras.
- Padronizar status entre entidades.
- Garantir que todos os registros tenham `empresa_vinculada`.
- Evitar depender exclusivamente de `localStorage` em produção.
- Documentar cada entidade com campos, status e regras de negócio.
