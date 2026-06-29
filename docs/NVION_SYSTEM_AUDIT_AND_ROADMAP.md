# NVION CRM — Auditoria do Sistema e Roadmap de Implementação

## 1. Objetivo Executivo

O NVION CRM deve evoluir de um CRM comercial de consórcios para uma plataforma operacional e financeira completa para empresas que vendem consórcios.

A tese central do produto é controlar a operação desde a origem comercial até a formação de recebíveis e a possibilidade futura de antecipação parcial.

Fluxo-alvo:

```text
Lead → Oportunidade → Venda de Consórcio → Comissão Prevista → Conciliação com Administradora → Comissão Confirmada → Recebível Futuro → Limite Antecipável → Solicitação de Antecipação Parcial
```

## 2. Leitura Técnica do Sistema Atual

### 2.1 Stack

O projeto atual utiliza:

- React 18
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Radix UI
- Lucide React
- Recharts
- SDK Base44

Scripts principais:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### 2.2 Aplicação Base44

- App: `nvion crm`
- App ID: `6a408d646f21968247407e53`
- Domínio público: `nvion.base44.app`
- Repositório GitHub: `eqtprivate/nvion_crm`
- Branch principal: `main`

Ponto crítico: o app Base44 ainda aparece com origem `s3`. Na prática, isso pode significar que o build publicado não reflete automaticamente o repositório, mesmo quando o GitHub está público e atualizado.

## 3. Estrutura de Rotas e Páginas

O arquivo `src/pages.config.js` registra as seguintes páginas:

- Accounts
- Contacts
- Dashboard
- DadosTeste
- EquipeComercial
- Leads
- Oportunidades
- ProdutoConsorcio
- RegrasComissao
- VendasConsorcio
- Vendedores
- Profile
- Reports
- Settings
- GestaoAcessos

### Diagnóstico

A estrutura de páginas já cobre o núcleo comercial mínimo. O sistema já consegue representar administradoras, clientes, leads, oportunidades, produtos, equipes, vendedores, vendas de consórcio e regras de comissão.

A lacuna não está na existência das telas comerciais básicas, mas na ausência dos módulos financeiros posteriores: comissão materializada, conciliação, recebíveis e antecipação.

## 4. Entidades Base44 Atuais

Foram identificadas 13 entidades no Base44:

1. DefaultSettings
2. Lead
3. Account
4. UsuarioAcesso
5. Contact
6. ProdutoConsorcio
7. EquipeComercial
8. Opportunity
9. Empresa
10. VendasConsorcio
11. RegrasComissao
12. Vendedores
13. User

## 5. Avaliação dos Módulos Atuais

## 5.1 Autenticação

### Implementado

- Login customizado via `UsuarioAcesso`.
- Hash SHA-256 de senha.
- Sessão local em `localStorage`.
- Recuperação de senha com geração de senha temporária.
- Exibição de build marker no login.

### Pontos de atenção

- A autenticação ainda é client-side.
- A entidade `UsuarioAcesso` não possui RLS explícito.
- A senha temporária é persistida em campo próprio.
- Em produção, o ideal é evoluir para autenticação server-side ou fluxo seguro com função backend.

### Prioridade

Alta para produção, média para MVP demonstrável.

## 5.2 Gestão de Acessos

### Implementado

- Cadastro de usuários.
- Edição de usuários.
- Ativação/suspensão.
- Reset de senha.
- Gestão de módulos.
- Gestão de empresas para super_admin.

### Problema crítico

`src/lib/modules.js` está defasado em relação às páginas existentes.

Impacto:

- Gestão de Acessos pode não listar todos os módulos.
- Usuários podem não receber permissão para ProdutoConsorcio, Vendedores, VendasConsorcio, RegrasComissao e DadosTeste.
- Admins podem não ver todas as telas.

### Correção necessária

Atualizar `AVAILABLE_MODULES`, `MODULE_LABELS` e `ROLE_MODULE_DEFAULTS` para refletir todas as páginas atuais.

## 5.3 Dashboard

### Implementado

- KPIs de leads.
- KPIs de oportunidades.
- Pipeline aberto.
- Valor ganho.
- Oportunidades recentes.
- Filtro por empresa e papel via `applyAccessFilter`.

### Limitações

- Não inclui ainda vendas, comissões confirmadas, conciliações, recebíveis ou antecipações.
- Dashboard ainda é predominantemente comercial.

## 5.4 Leads / Prospecção

### Implementado

- CRUD de leads.
- Importação CSV.
- Filtros por status, origem e temperatura.
- Busca.
- Exportação CSV.
- KPIs.
- Controle de acesso por papel.

### Lacunas

- Conversão automática de lead em oportunidade ainda precisa ser consolidada como ação explícita.
- Deduplicação por email/telefone deve ser reforçada.
- Histórico de interações ainda não existe.

## 5.5 Oportunidades

### Implementado

- CRUD de oportunidades.
- Pipeline por status e etapa.
- Atualização rápida de stage.
- Ordenação.
- Exportação CSV.
- KPIs de pipeline.

### Lacunas

- Ação explícita de gerar venda a partir da oportunidade ainda deve ser reforçada.
- Oportunidade ganha deveria disparar criação de venda ou sugerir criação.

## 5.6 Clientes / Contacts

### Implementado

- Cadastro de clientes.
- Campos de contato, origem, vendedor responsável e status.

### Lacunas

- Customer 360 ainda incompleto.
- Histórico de leads, oportunidades, vendas e documentos do cliente deve ser consolidado em uma visão única.

## 5.7 Administradoras / Accounts

### Implementado

- Cadastro de administradoras.
- Campos operacionais: prazo médio de pagamento, formato de relatório, status.

### Lacunas

- Falta configuração de layout de relatório por administradora.
- Falta mapeamento de colunas para conciliação.

## 5.8 Produtos de Consórcio

### Implementado

- CRUD de produtos.
- Associação com administradora.
- Categoria.
- Comissão padrão.
- Prazo médio de pagamento.
- KPIs.
- Busca.
- Exportação CSV.

### Lacunas

- Regras comerciais avançadas por faixa, produto, administradora e vendedor ainda não existem.
- Produto deve futuramente alimentar regras de comissão e conciliação.

## 5.9 Equipes Comerciais

### Implementado

- Cadastro de equipes.
- Líder responsável.
- Vendedores vinculados.
- Meta mensal.

### Lacunas

- Sincronização bidirecional entre equipe e vendedor precisa ser robustecida.
- Se vendedor muda de equipe, a equipe deveria refletir automaticamente.

## 5.10 Vendedores

### Implementado

- CRUD de vendedores.
- Tipo: interno, parceiro, corban, líder.
- Equipe e líder.
- Meta mensal.
- Status.
- KPIs.
- Exportação CSV.

### Lacunas

- Vendedor ainda não está necessariamente vinculado a usuário de acesso.
- Pode haver divergência entre `UsuarioAcesso.display_name` e `Vendedores.nome`.

## 5.11 Vendas de Consórcio

### Implementado

- CRUD de vendas.
- Vínculo com oportunidade.
- Cliente, vendedor, líder, equipe, administradora e produto.
- Grupo e cota.
- Valor da carta.
- Comissão prevista.
- Status operacional.
- Status de conciliação.
- Status financeiro.
- KPIs.
- Exportação CSV.

### Lacunas

- Venda ainda mistura comissão prevista com lógica de comissão.
- Falta entidade própria `Comissoes`.
- Falta conciliação com arquivo de administradora.
- Falta trilha de mudança de status.

## 5.12 Regras de Comissão

### Implementado

- CRUD de regras.
- Administradora.
- Produto.
- Tipo de comissão.
- Percentual base.
- Percentual vendedor.
- Percentual líder.
- Prazo de pagamento.
- Status.

### Lacunas

- A regra não é automaticamente aplicada para materializar comissões em uma entidade própria.
- Falta versionamento de regras.
- Falta regra por exceção: vendedor, equipe, campanha, produto específico, administradora específica.

## 5.13 Relatórios

### Implementado

- Indicadores comerciais.
- Ranking de vendedores.
- Ranking de administradoras.
- Funil de conversão.
- Comissão por vendedor a partir de vendas.
- Exportação de oportunidades.

### Lacunas

- Relatórios financeiros ainda são placeholders.
- Falta visão de comissão confirmada, recebíveis e antecipação.

## 5.14 Dados de Teste

### Implementado

A tela cria dados mínimos para:

- Administradoras
- Produtos
- Equipes
- Vendedores
- Clientes
- Leads
- Oportunidades
- Vendas
- Regras de Comissão

### Diagnóstico

É essencial para QA e demonstração. Deve permanecer disponível apenas para super_admin/admin_empresa.

## 6. Problemas Estruturais Prioritários

## 6.1 Publicação Base44 x GitHub

O GitHub está público e atualizado, mas o Base44 ainda aparece com origem `s3`. É preciso validar se atualizar/recarregar a página do Base44 realmente sincroniza e gera novo build.

### Critério de aceite

- O hash JS do domínio público muda após sincronização.
- A tela de login exibe `NVION`, não `Nvision`.
- O build marker do login aparece.
- O menu lateral reflete o código novo.

## 6.2 Módulos e Permissões

Atualizar `src/lib/modules.js` é o item técnico mais crítico do código.

Módulos esperados:

```js
[
  'Dashboard',
  'Leads',
  'Oportunidades',
  'Contacts',
  'Accounts',
  'ProdutoConsorcio',
  'EquipeComercial',
  'Vendedores',
  'VendasConsorcio',
  'RegrasComissao',
  'Reports',
  'Settings',
  'DadosTeste',
  'GestaoAcessos'
]
```

## 6.3 Multiempresa

A maior parte das entidades tem `empresa_vinculada`, mas algumas RLS usam padrão diferente:

- Algumas usam `empresa_vinculada`.
- Outras usam `data.empresa_vinculada`.
- `Empresa` não possui RLS.
- `UsuarioAcesso` não possui RLS.

### Diretriz

Manter controle de acesso no front para MVP, mas revisar RLS/backend antes de produção.

## 6.4 Segurança

Riscos:

- Autenticação client-side.
- Senha temporária persistida.
- Consulta listando todos os usuários em login.
- `UsuarioAcesso` sem RLS.

### Diretriz

Aceitável para MVP controlado, não aceitável para produção aberta sem revisão.

## 7. Roadmap Reestruturado

# Fase 0 — Estabilização Técnica e Publicação

## Objetivo

Garantir que o app publicado esteja usando o código correto e que os módulos estejam visíveis conforme perfil.

## Entregas

1. Validar sincronização GitHub → Base44.
2. Confirmar novo hash do bundle publicado.
3. Corrigir definitivamente login legado.
4. Atualizar `modules.js`.
5. Validar Gestão de Acessos.
6. Validar usuário admin_empresa.
7. Validar super_admin.
8. Rodar Dados de Teste.
9. Validar navegação completa.

## Critérios de aceite

- Não existe mais `Nvision` no domínio publicado.
- `Gestão de Acessos` lista todos os módulos.
- Admin consegue liberar e retirar módulos novos.
- Usuário admin vê Produtos, Vendedores, Vendas, Regras e Dados de Teste.
- Superadmin vê `SUPERADMIN (acesso a todas)` no topo do menu.

# Fase 1 — MVP Comercial Completo

## Objetivo

Consolidar a jornada comercial de ponta a ponta.

## Entregas

1. Lead importado ou criado manualmente.
2. Conversão de lead em oportunidade.
3. Evolução de oportunidade por stage.
4. Oportunidade ganha gera venda.
5. Venda herda dados da oportunidade.
6. Produto alimenta comissão prevista.
7. Vendedor/líder/equipe são preservados no fluxo.
8. Relatório comercial mostra funil e rankings.

## Critérios de aceite

- É possível demonstrar uma venda saindo de um lead.
- Os dados não precisam ser digitados repetidamente em cada etapa.
- O dashboard reflete leads, oportunidades e vendas.

# Fase 2 — Comissões Operacionais

## Objetivo

Separar comissão da venda, criando entidade própria de comissões.

## Nova entidade: `Comissoes`

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

## Entregas

1. Criar schema `Comissoes`.
2. Criar página `Comissoes`.
3. Gerar comissão prevista a partir de venda.
4. Aplicar regra de comissão automaticamente.
5. Atualizar status de comissão.
6. Criar KPIs de comissão prevista, confirmada, paga, bloqueada e estornada.
7. Exportar CSV.

# Fase 3 — Conciliação com Administradoras

## Objetivo

Importar relatórios das administradoras e conciliar com vendas internas.

## Novas entidades

### `ImportacaoRelatorioAdministradora`

- empresa_vinculada
- administradora
- arquivo_nome
- data_importacao
- competencia
- total_linhas
- total_conciliado
- total_divergente
- status_importacao

### `ConciliacaoVenda`

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

## Entregas

1. Upload CSV/XLSX.
2. Mapeamento de colunas por administradora.
3. Matching por grupo, cota, cliente, CPF/CNPJ e valor.
4. Tela de divergências.
5. Atualização de venda conciliada.
6. Atualização de comissão confirmada.

# Fase 4 — Recebíveis

## Objetivo

Transformar comissões confirmadas em recebíveis futuros.

## Nova entidade: `RecebiveisConsorcio`

Campos sugeridos:

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

## Entregas

1. Gerar recebível a partir de comissão confirmada.
2. Classificar status: previsto, confirmado, recebido, atrasado, cancelado.
3. Criar aging.
4. Criar carteira de recebíveis.
5. Criar dashboard financeiro.

# Fase 5 — Antecipação Parcial

## Objetivo

Permitir que empresas solicitem antecipação parcial com base em recebíveis elegíveis e histórico.

## Novas entidades

### `PoliticaAntecipacao`

- empresa_vinculada
- faixa_historico_inicio
- faixa_historico_fim
- percentual_limite
- status

### `LimiteAntecipacao`

- empresa_vinculada
- periodo_referencia
- valor_recebiveis_elegiveis
- percentual_limite_aplicado
- limite_disponivel
- limite_utilizado
- limite_remanescente
- status

### `SolicitacaoAntecipacao`

- empresa_vinculada
- valor_solicitado
- limite_disponivel_no_momento
- status_solicitacao
- aprovador
- data_solicitacao
- data_aprovacao
- observacoes

## Regra MVP sugerida

- Menos de 90 dias de histórico: sem limite.
- 90 a 179 dias: até 30% do recebível elegível.
- 180 a 359 dias: até 50%.
- 360 dias ou mais: até 70%.

## Entregas

1. Calcular recebíveis elegíveis.
2. Aplicar política por empresa.
3. Criar limite disponível.
4. Criar solicitação de antecipação.
5. Criar aprovação manual.
6. Atualizar limite utilizado e remanescente.

# Fase 6 — Dashboards Executivos

## Objetivo

Consolidar indicadores para operação, comercial, financeiro e plataforma.

## Entregas

1. Dashboard comercial.
2. Dashboard de vendas.
3. Dashboard de comissões.
4. Dashboard de conciliação.
5. Dashboard de recebíveis.
6. Dashboard de antecipação.
7. Ranking por vendedor, líder, equipe e administradora.
8. Exportações gerenciais.

# Fase 7 — Segurança, Auditoria e Produção

## Objetivo

Preparar o sistema para produção real.

## Entregas

1. Revisar autenticação.
2. Remover persistência de senha temporária.
3. Criar reset de senha seguro.
4. Criar logs de auditoria.
5. Criar controle de permissão por ação.
6. Revisar RLS de todas as entidades.
7. Revisar isolamento multiempresa.
8. Revisar LGPD.
9. Criar política de backup/exportação.

## 8. Ordem Recomendada de Implementação Imediata

1. Corrigir `modules.js`.
2. Atualizar/publish Base44 e validar hash novo.
3. Validar login novo.
4. Validar Gestão de Acessos.
5. Rodar Dados de Teste.
6. Validar fluxo Lead → Oportunidade → Venda.
7. Criar entidade/página `Comissoes`.
8. Criar conciliação.
9. Criar recebíveis.
10. Criar antecipação parcial.

## 9. Definição de MVP Demonstrável

O MVP demonstrável deve permitir:

1. Criar empresa.
2. Criar usuários por empresa.
3. Configurar módulos por usuário.
4. Cadastrar administradoras.
5. Cadastrar produtos.
6. Cadastrar vendedores e equipes.
7. Importar leads.
8. Criar oportunidade.
9. Registrar venda.
10. Aplicar regra de comissão.
11. Gerar comissão prevista.
12. Conciliar venda com administradora.
13. Confirmar comissão.
14. Gerar recebível.
15. Calcular limite de antecipação.
16. Solicitar antecipação parcial.

## 10. Conclusão

O sistema já possui um bom núcleo comercial e estrutura multiempresa inicial. A prioridade não é criar mais telas comerciais isoladas, mas fechar a cadeia operacional-financeira que diferencia o produto:

```text
Venda → Comissão → Conciliação → Recebível → Antecipação
```

Antes disso, é indispensável estabilizar publicação, permissões e sincronização Base44/GitHub.
