# NVION CRM

**Plataforma B2B de gestão comercial e financeira para empresas que vendem consórcios.**

O NVION estrutura toda a operação — da prospecção do lead à antecipação de
recebíveis — em um único fluxo integrado, com isolamento por empresa
(multi-tenant), controle de acesso por papel e trilha de auditoria.

```
Lead → Oportunidade → Venda de Consórcio → Conciliação com Administradora
     → Comissão → Recebível Futuro → Limite Antecipável → Antecipação Parcial
```

> Versão atual: **1.16.3** (ver `src/lib/version.js`).

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Módulos e funcionalidades](#módulos-e-funcionalidades)
- [Papéis de acesso](#papéis-de-acesso)
- [Segurança](#segurança)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Ambiente de desenvolvimento](#ambiente-de-desenvolvimento)
- [Banco de dados e migrações](#banco-de-dados-e-migrações)
- [Edge Functions](#edge-functions)
- [Backup diário](#backup-diário)
- [Roadmap](#roadmap)
- [Documentação](#documentação)

---

## Visão geral

O NVION resolve a operação de revendas/assessorias de consórcio que hoje vivem
em planilhas: cadastro de administradoras e produtos, gestão de equipes e
vendedores, funil de prospecção e oportunidades, registro de vendas, cálculo
automático de comissões (com cronograma de parcelas e estorno), conciliação
com o relatório da administradora e formação da carteira de recebíveis — base
para a tese de **antecipação parcial de comissões**.

Cada empresa cliente opera isolada (multi-tenant via RLS no Postgres), e uma
camada de **super admin** administra empresas, planos e a plataforma.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Front-end | React 18 + Vite |
| Roteamento | React Router |
| Estado servidor | TanStack Query |
| UI | Tailwind CSS + Radix UI (shadcn) + framer-motion |
| Gráficos | Recharts |
| Backend | Supabase — Postgres + RLS, Auth, Edge Functions (Deno), Storage |
| E-mail | Supabase Auth Hook + Edge Functions (SMTP/Resend) |
| Agendamento | pg_cron + pg_net |

A camada `src/api/db.js` expõe as entidades no mesmo formato do antigo SDK
Base44 (`db.Lead.list()`, `db.Lead.create()`…) sobre o Supabase, com injeção
automática de `empresa_id`/`empresa_vinculada`/`created_by` e whitelist de
colunas por tabela.

## Arquitetura

```
React (Vite) ──► src/api/db.js ──► Supabase JS Client ──► Postgres (RLS)
      │                                     │
      │                                     ├─► Auth (JWT, papéis em profiles)
      │                                     ├─► Storage (bucket privado backups)
      └─► AuthContext (sessão + presença)   └─► Edge Functions (admin/e-mail/backup)
                                                     │
                                              pg_cron ┘ (backup diário)
```

- **Isolamento multiempresa**: RLS em todas as tabelas de negócio por
  `empresa_id`; políticas específicas para super_admin.
- **Controle de acesso**: papel em `profiles.role` + módulos liberados em
  `user_modules`; o front aplica filtros adicionais por líder/vendedor
  (`src/lib/accessControl.js`).
- **Presença/round-robin**: heartbeat de `last_seen_at`; trigger distribui leads
  novos entre vendedores online.

## Módulos e funcionalidades

### Comercial
- **Painel Geral** (`Dashboard`) — KPIs animados, gráficos e indicadores.
- **Prospecção** (`Leads`) — funil de leads, temperatura, próximas ações,
  **distribuição round-robin** entre vendedores online.
- **Campanhas Comerciais** (`Campanhas`) — metas, orçamento, UTM, resultados.
- **Oportunidades** — pipeline com estágios e probabilidade.
- **Clientes** (`Contacts`) e **Administradoras** (`Accounts`).
- **Produtos de Consórcio** — catálogo por administradora.
- **Equipe Comercial** e **Vendedores** — metas, líderes, vínculos.

### Vendas e Comissões
- **Vendas de Consórcio** — registro da venda; ao salvar, gera comissão e
  recebíveis e conclui a oportunidade/lead vinculados.
- **Regras de Comissão** — engine flexível (`src/lib/comissao.js`): percentual
  fixo/parcelado, valor fixo, híbrido, faixa variável; base de cálculo
  configurável; cronograma de parcelas; rateio vendedor/líder/empresa;
  política de estorno; templates prontos.
- **Comissões** — comissões geradas por venda, com parcelas materializadas,
  KPIs (prevista/confirmada/paga/bloqueada), filtros e exportação CSV.

### Financeiro
- **Conciliação Administradora** — importação do relatório da administradora e
  matching com as vendas internas (tratamento de divergências).
- **Recebíveis** e **Painel de Recebíveis** — carteira futura, aging,
  elegibilidade para antecipação e indicadores.

### Administração e plataforma
- **Gestão de Acessos** — usuários, papéis, módulos, empresas; round-robin.
- **Gestão de Empresas** e **Gestão de Planos** (super admin).
- **Templates de E-mail** — e-mails de autenticação e transacionais.
- **Logs de Auditoria** — trilha de ações.
- **Backups** — snapshots diários por empresa (download).
- **Configurações** e **Perfil**.

## Papéis de acesso

| Papel | Escopo |
|-------|--------|
| `super_admin` | Toda a plataforma: empresas, planos, todos os registros |
| `admin_empresa` | Todos os módulos da própria empresa |
| `gestor_comercial` | Comercial + relatórios da empresa |
| `lider_comercial` | Registros da própria equipe/liderados |
| `gestor_financeiro` | Dashboard, relatórios, recebíveis |
| `vendedor` | Seus próprios leads/oportunidades/clientes |
| `analista_plataforma` | Leitura analítica (dashboard/relatórios) |

Os módulos padrão por papel estão em `src/lib/modules.js`.

## Segurança

- **Autenticação Supabase** (JWT), sem senha em `localStorage`.
- **Política de senha forte** (mín. 8 caracteres com maiúscula/minúscula/
  dígito/especial) e **troca obrigatória** para senhas legadas no login.
- **RLS multiempresa** em todas as tabelas de negócio; guarda de privilégio em
  `profiles` (usuário não escala o próprio papel).
- **Senha temporária** exibida uma única vez na criação; reset por Edge Function.
- **Trilha de auditoria** (`logAudit`) e **expurgo de PII** do legado Base44.

Detalhes e histórico de correções em `SECURITY_AUDIT.md`.

## Estrutura do projeto

```
src/
  api/db.js            # camada de dados sobre o Supabase (estilo Base44)
  lib/                 # AuthContext, accessControl, comissao, modules, motion…
  pages/               # uma tela por módulo
  components/          # ui (shadcn), forms, shared, reports
supabase/
  migrations/          # schema, RLS, funções, triggers, seeds
  functions/           # Edge Functions (Deno)
docs/                  # roadmap, backup, e-mail, QA, auditoria
base44/entities/       # esquemas das entidades (compatibilidade)
```

## Ambiente de desenvolvimento

**Pré-requisitos:** Node 18+ e uma instância Supabase.

```bash
git clone <repo-url>
cd nvion_crm
npm install
cp .env.local.example .env.local   # se existir; senão crie conforme abaixo
npm run dev
```

Variáveis de ambiente (`.env.local`):

```
VITE_SUPABASE_URL=<url-do-projeto-supabase>
VITE_SUPABASE_ANON_KEY=<publishable/anon key>
VITE_PUBLIC_APP_URL=<url-pública-do-app>
```

> Use sempre a chave **publishable/anon** no front-end — nunca a `service_role`.

Scripts:

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run lint       # eslint
npm run preview    # pré-visualização do build
```

## Banco de dados e migrações

As migrações versionam schema, RLS, funções e seeds em
`supabase/migrations/`. Destaques:

- `..._create_nvion_auth_core` — perfis, papéis, módulos.
- `..._create_business_entities` — tabelas de negócio.
- `..._rls_isolamento_vendedor` / `..._empresas_rls_update_rules` — isolamento.
- `..._transactional_email` / `..._email_templates` — e-mails.
- `..._backups` — bucket + metadados de backup.
- `..._lead_round_robin` — presença + distribuição de leads.
- `..._comissoes_unique` — índice único (uma comissão por venda).

Aplique via Supabase CLI (`supabase db push`) ou colando no SQL Editor.

## Edge Functions

| Função | Papel |
|--------|-------|
| `admin-create-user` | Cria usuário no Auth + perfil + módulos (senha temporária) |
| `admin-reset-temp-password` | Gera nova senha temporária |
| `auth-email-hook` | Personaliza e-mails de autenticação |
| `send-email` | Envio de e-mails transacionais |
| `daily-backup` | Snapshot diário por empresa (agendado por cron) |
| `backup-download` | URL assinada para download de backup |

Deploy: `supabase functions deploy <nome>`.

## Backup diário

Snapshot lógico por empresa em `backups/{empresa_id}/{data}.json` (bucket
privado), **retenção de 7 dias**, agendado em loop por `pg_cron`. Setup completo
em [`docs/nvion-backup.md`](docs/nvion-backup.md).

## Roadmap

Estado por etapa e próximos passos em
[`docs/NVION_ROADMAP.md`](docs/NVION_ROADMAP.md). Resumo:

- ✅ Sprint 0–2 (estabilização, core comercial, comissões)
- 🚧 Sprint 3–4.5 (conciliação, recebíveis e inteligência — em consolidação)
- ⏳ Sprint 5 (limite/antecipação parcial)
- ✅ Sprint 7 (segurança) em estágio avançado

## Documentação

- [`docs/NVION_ROADMAP.md`](docs/NVION_ROADMAP.md) — roadmap e etapas
- [`docs/nvion-backup.md`](docs/nvion-backup.md) — backup diário
- [`docs/supabase-password-recovery-email.md`](docs/supabase-password-recovery-email.md) — e-mail de recuperação
- [`docs/NVION_MVP_READINESS.md`](docs/NVION_MVP_READINESS.md) — prontidão do MVP
- [`docs/NVION_QA_MVP.md`](docs/NVION_QA_MVP.md) — QA
- [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) — auditoria de segurança

## Licença

Software proprietário. Copyright © 2026 **SmartX Ventures Ltda.** Todos os
direitos reservados. O uso, cópia, modificação ou distribuição sem autorização
prévia e por escrito do titular é proibido. Ver [`LICENSE`](LICENSE).
