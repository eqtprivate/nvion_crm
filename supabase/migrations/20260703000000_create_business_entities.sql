-- NVION CRM — business entities on Supabase (fresh, no data migration)
-- Generated from base44/entities/*.jsonc
create extension if not exists pgcrypto;

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- helper: current user's empresa_id (from profiles)
create or replace function public.current_empresa_id()
returns uuid language sql stable as $$
  select empresa_id from public.profiles where id = auth.uid();
$$;
-- helper: is super_admin
create or replace function public.is_super_admin()
returns boolean language sql stable as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text,
  cnpj text,
  contato text,
  email text,
  telefone text,
  prazo_medio_pagamento numeric,
  formato_relatorio text,
  status text default 'ativa',
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_accounts_empresa on public.accounts(empresa_id);
create index if not exists idx_accounts_created on public.accounts(created_at desc);
drop trigger if exists trg_accounts_updated on public.accounts;
create trigger trg_accounts_updated before update on public.accounts for each row execute function public.set_updated_at();
alter table public.accounts enable row level security;
drop policy if exists "accounts_select" on public.accounts;
create policy "accounts_select" on public.accounts for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "accounts_insert" on public.accounts;
create policy "accounts_insert" on public.accounts for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "accounts_update" on public.accounts;
create policy "accounts_update" on public.accounts for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "accounts_delete" on public.accounts;
create policy "accounts_delete" on public.accounts for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.campanhas (
  id uuid primary key default gen_random_uuid(),
  nome_campanha text,
  codigo_campanha text,
  tipo_campanha text default 'digital',
  status_campanha text default 'rascunho',
  data_inicio date,
  data_fim date,
  orcamento_previsto numeric,
  orcamento_realizado numeric,
  meta_leads numeric,
  meta_oportunidades numeric,
  meta_vendas numeric,
  meta_valor_cartas numeric,
  produto_foco text,
  administradora_foco text,
  equipe_responsavel text,
  responsavel text,
  canal text default 'outro',
  origem text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  publico_alvo text,
  descricao text,
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campanhas_empresa on public.campanhas(empresa_id);
create index if not exists idx_campanhas_created on public.campanhas(created_at desc);
drop trigger if exists trg_campanhas_updated on public.campanhas;
create trigger trg_campanhas_updated before update on public.campanhas for each row execute function public.set_updated_at();
alter table public.campanhas enable row level security;
drop policy if exists "campanhas_select" on public.campanhas;
create policy "campanhas_select" on public.campanhas for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "campanhas_insert" on public.campanhas;
create policy "campanhas_insert" on public.campanhas for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "campanhas_update" on public.campanhas;
create policy "campanhas_update" on public.campanhas for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "campanhas_delete" on public.campanhas;
create policy "campanhas_delete" on public.campanhas for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.comissoes (
  id uuid primary key default gen_random_uuid(),
  venda_vinculada text,
  regra_comissao text,
  regra_comissao_id text,
  cliente text,
  administradora text,
  produto text,
  vendedor text,
  lider text,
  equipe text,
  origem text,
  valor_carta numeric,
  percentual_base numeric,
  percentual_vendedor numeric,
  percentual_lider numeric,
  percentual_empresa numeric,
  valor_comissao_total numeric,
  valor_comissao_vendedor numeric,
  valor_comissao_lider numeric,
  valor_comissao_empresa numeric,
  valor_comissao_confirmada numeric,
  quantidade_parcelas numeric,
  tem_parcelas boolean,
  data_prevista_pagamento date,
  data_confirmacao date,
  data_pagamento date,
  status_comissao text default 'prevista',
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comissoes_empresa on public.comissoes(empresa_id);
create index if not exists idx_comissoes_created on public.comissoes(created_at desc);
drop trigger if exists trg_comissoes_updated on public.comissoes;
create trigger trg_comissoes_updated before update on public.comissoes for each row execute function public.set_updated_at();
alter table public.comissoes enable row level security;
drop policy if exists "comissoes_select" on public.comissoes;
create policy "comissoes_select" on public.comissoes for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "comissoes_insert" on public.comissoes;
create policy "comissoes_insert" on public.comissoes for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "comissoes_update" on public.comissoes;
create policy "comissoes_update" on public.comissoes for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "comissoes_delete" on public.comissoes;
create policy "comissoes_delete" on public.comissoes for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.conciliacao_vendas (
  id uuid primary key default gen_random_uuid(),
  importacao_vinculada text,
  venda_vinculada text,
  comissao_vinculada text,
  administradora text,
  cliente_relatorio text,
  cliente_interno text,
  grupo text,
  cota text,
  cpf_cnpj text,
  produto_relatorio text,
  produto_interno text,
  vendedor text,
  lider text,
  valor_carta_relatorio numeric,
  valor_carta_interno numeric,
  comissao_relatorio numeric,
  comissao_interna numeric,
  data_venda_relatorio date,
  data_prevista_pagamento date,
  status_conciliacao text default 'pendente',
  divergencia_tipo text default 'nenhuma',
  diferenca_valor_carta numeric,
  diferenca_comissao numeric,
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_conciliacao_vendas_empresa on public.conciliacao_vendas(empresa_id);
create index if not exists idx_conciliacao_vendas_created on public.conciliacao_vendas(created_at desc);
drop trigger if exists trg_conciliacao_vendas_updated on public.conciliacao_vendas;
create trigger trg_conciliacao_vendas_updated before update on public.conciliacao_vendas for each row execute function public.set_updated_at();
alter table public.conciliacao_vendas enable row level security;
drop policy if exists "conciliacao_vendas_select" on public.conciliacao_vendas;
create policy "conciliacao_vendas_select" on public.conciliacao_vendas for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "conciliacao_vendas_insert" on public.conciliacao_vendas;
create policy "conciliacao_vendas_insert" on public.conciliacao_vendas for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "conciliacao_vendas_update" on public.conciliacao_vendas;
create policy "conciliacao_vendas_update" on public.conciliacao_vendas for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "conciliacao_vendas_delete" on public.conciliacao_vendas;
create policy "conciliacao_vendas_delete" on public.conciliacao_vendas for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  cpf_cnpj text,
  cidade text,
  estado text,
  origem text default 'base_propria',
  vendedor_responsavel text,
  status text default 'lead',
  observacoes text,
  documentos_anexados jsonb,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contacts_empresa on public.contacts(empresa_id);
create index if not exists idx_contacts_created on public.contacts(created_at desc);
drop trigger if exists trg_contacts_updated on public.contacts;
create trigger trg_contacts_updated before update on public.contacts for each row execute function public.set_updated_at();
alter table public.contacts enable row level security;
drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "contacts_insert" on public.contacts;
create policy "contacts_insert" on public.contacts for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "contacts_update" on public.contacts;
create policy "contacts_update" on public.contacts for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "contacts_delete" on public.contacts;
create policy "contacts_delete" on public.contacts for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.default_settings (
  id uuid primary key default gen_random_uuid(),
  default_currency text default 'BRL',
  default_lead_stage text default 'new',
  default_account_tier text default 'B',
  default_follow_up_days numeric default 3,
  default_calendar_view text default 'month',
  first_day_of_week text default 'monday',
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_default_settings_empresa on public.default_settings(empresa_id);
create index if not exists idx_default_settings_created on public.default_settings(created_at desc);
drop trigger if exists trg_default_settings_updated on public.default_settings;
create trigger trg_default_settings_updated before update on public.default_settings for each row execute function public.set_updated_at();
alter table public.default_settings enable row level security;
drop policy if exists "default_settings_select" on public.default_settings;
create policy "default_settings_select" on public.default_settings for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "default_settings_insert" on public.default_settings;
create policy "default_settings_insert" on public.default_settings for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "default_settings_update" on public.default_settings;
create policy "default_settings_update" on public.default_settings for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "default_settings_delete" on public.default_settings;
create policy "default_settings_delete" on public.default_settings for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.equipes_comerciais (
  id uuid primary key default gen_random_uuid(),
  nome_equipe text,
  lider_responsavel text,
  vendedores_vinculados jsonb,
  meta_mensal numeric,
  status text default 'ativo',
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_equipes_comerciais_empresa on public.equipes_comerciais(empresa_id);
create index if not exists idx_equipes_comerciais_created on public.equipes_comerciais(created_at desc);
drop trigger if exists trg_equipes_comerciais_updated on public.equipes_comerciais;
create trigger trg_equipes_comerciais_updated before update on public.equipes_comerciais for each row execute function public.set_updated_at();
alter table public.equipes_comerciais enable row level security;
drop policy if exists "equipes_comerciais_select" on public.equipes_comerciais;
create policy "equipes_comerciais_select" on public.equipes_comerciais for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "equipes_comerciais_insert" on public.equipes_comerciais;
create policy "equipes_comerciais_insert" on public.equipes_comerciais for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "equipes_comerciais_update" on public.equipes_comerciais;
create policy "equipes_comerciais_update" on public.equipes_comerciais for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "equipes_comerciais_delete" on public.equipes_comerciais;
create policy "equipes_comerciais_delete" on public.equipes_comerciais for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.importacoes_relatorio (
  id uuid primary key default gen_random_uuid(),
  administradora text,
  arquivo_nome text,
  data_importacao date,
  competencia text,
  total_linhas numeric,
  total_conciliado numeric,
  total_divergente numeric,
  total_nao_encontrado numeric,
  status_importacao text default 'importada',
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_importacoes_relatorio_empresa on public.importacoes_relatorio(empresa_id);
create index if not exists idx_importacoes_relatorio_created on public.importacoes_relatorio(created_at desc);
drop trigger if exists trg_importacoes_relatorio_updated on public.importacoes_relatorio;
create trigger trg_importacoes_relatorio_updated before update on public.importacoes_relatorio for each row execute function public.set_updated_at();
alter table public.importacoes_relatorio enable row level security;
drop policy if exists "importacoes_relatorio_select" on public.importacoes_relatorio;
create policy "importacoes_relatorio_select" on public.importacoes_relatorio for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "importacoes_relatorio_insert" on public.importacoes_relatorio;
create policy "importacoes_relatorio_insert" on public.importacoes_relatorio for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "importacoes_relatorio_update" on public.importacoes_relatorio;
create policy "importacoes_relatorio_update" on public.importacoes_relatorio for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "importacoes_relatorio_delete" on public.importacoes_relatorio;
create policy "importacoes_relatorio_delete" on public.importacoes_relatorio for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  origem text default 'base_propria',
  campanha text,
  produto_interesse text,
  valor_estimado_carta numeric,
  administradora_interesse text,
  vendedor_responsavel text,
  lider_vinculado text,
  temperatura text default 'morno',
  status text default 'novo_contato',
  data_ultimo_contato date,
  tipo_proxima_acao text,
  data_proxima_acao date,
  proxima_acao text,
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leads_empresa on public.leads(empresa_id);
create index if not exists idx_leads_created on public.leads(created_at desc);
drop trigger if exists trg_leads_updated on public.leads;
create trigger trg_leads_updated before update on public.leads for each row execute function public.set_updated_at();
alter table public.leads enable row level security;
drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  name text,
  cliente_vinculado text,
  lead_vinculado text,
  vendedor text,
  lider text,
  administradora_pretendida text,
  produto text,
  valor_carta numeric,
  previsao_fechamento date,
  probabilidade numeric,
  motivo_perda text,
  status text default 'aberta',
  stage text default 'novo_contato',
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_opportunities_empresa on public.opportunities(empresa_id);
create index if not exists idx_opportunities_created on public.opportunities(created_at desc);
drop trigger if exists trg_opportunities_updated on public.opportunities;
create trigger trg_opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();
alter table public.opportunities enable row level security;
drop policy if exists "opportunities_select" on public.opportunities;
create policy "opportunities_select" on public.opportunities for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "opportunities_insert" on public.opportunities;
create policy "opportunities_insert" on public.opportunities for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "opportunities_update" on public.opportunities;
create policy "opportunities_update" on public.opportunities for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "opportunities_delete" on public.opportunities;
create policy "opportunities_delete" on public.opportunities for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.parcelas_comissao (
  id uuid primary key default gen_random_uuid(),
  comissao_vinculada text,
  venda_vinculada text,
  regra_comissao_vinculada text,
  numero_parcela numeric,
  percentual_parcela numeric,
  valor_parcela_total numeric,
  valor_parcela_vendedor numeric,
  valor_parcela_lider numeric,
  valor_parcela_empresa numeric,
  data_prevista_pagamento date,
  data_confirmacao date,
  data_pagamento date,
  status_parcela text default 'prevista',
  gatilho_parcela text default 'venda_criada',
  estornavel boolean default false,
  motivo_estorno text,
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_parcelas_comissao_empresa on public.parcelas_comissao(empresa_id);
create index if not exists idx_parcelas_comissao_created on public.parcelas_comissao(created_at desc);
drop trigger if exists trg_parcelas_comissao_updated on public.parcelas_comissao;
create trigger trg_parcelas_comissao_updated before update on public.parcelas_comissao for each row execute function public.set_updated_at();
alter table public.parcelas_comissao enable row level security;
drop policy if exists "parcelas_comissao_select" on public.parcelas_comissao;
create policy "parcelas_comissao_select" on public.parcelas_comissao for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "parcelas_comissao_insert" on public.parcelas_comissao;
create policy "parcelas_comissao_insert" on public.parcelas_comissao for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "parcelas_comissao_update" on public.parcelas_comissao;
create policy "parcelas_comissao_update" on public.parcelas_comissao for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "parcelas_comissao_delete" on public.parcelas_comissao;
create policy "parcelas_comissao_delete" on public.parcelas_comissao for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.parcelas_regra_comissao (
  id uuid primary key default gen_random_uuid(),
  regra_comissao_vinculada text,
  numero_parcela numeric,
  percentual_parcela numeric,
  valor_fixo_parcela numeric,
  dias_apos_venda numeric,
  dias_apos_confirmacao numeric,
  gatilho_parcela text default 'venda_criada',
  estornavel boolean default false,
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_parcelas_regra_comissao_empresa on public.parcelas_regra_comissao(empresa_id);
create index if not exists idx_parcelas_regra_comissao_created on public.parcelas_regra_comissao(created_at desc);
drop trigger if exists trg_parcelas_regra_comissao_updated on public.parcelas_regra_comissao;
create trigger trg_parcelas_regra_comissao_updated before update on public.parcelas_regra_comissao for each row execute function public.set_updated_at();
alter table public.parcelas_regra_comissao enable row level security;
drop policy if exists "parcelas_regra_comissao_select" on public.parcelas_regra_comissao;
create policy "parcelas_regra_comissao_select" on public.parcelas_regra_comissao for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "parcelas_regra_comissao_insert" on public.parcelas_regra_comissao;
create policy "parcelas_regra_comissao_insert" on public.parcelas_regra_comissao for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "parcelas_regra_comissao_update" on public.parcelas_regra_comissao;
create policy "parcelas_regra_comissao_update" on public.parcelas_regra_comissao for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "parcelas_regra_comissao_delete" on public.parcelas_regra_comissao;
create policy "parcelas_regra_comissao_delete" on public.parcelas_regra_comissao for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  ativo boolean,
  descricao text,
  label text,
  max_usuarios numeric,
  modulos jsonb,
  slug text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_planos_empresa on public.planos(empresa_id);
create index if not exists idx_planos_created on public.planos(created_at desc);
drop trigger if exists trg_planos_updated on public.planos;
create trigger trg_planos_updated before update on public.planos for each row execute function public.set_updated_at();
alter table public.planos enable row level security;
drop policy if exists "planos_select" on public.planos;
create policy "planos_select" on public.planos for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "planos_insert" on public.planos;
create policy "planos_insert" on public.planos for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "planos_update" on public.planos;
create policy "planos_update" on public.planos for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "planos_delete" on public.planos;
create policy "planos_delete" on public.planos for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.produtos_consorcio (
  id uuid primary key default gen_random_uuid(),
  administradora_vinculada text,
  nome_produto text,
  categoria text default 'veiculo',
  percentual_comissao_padrao numeric,
  prazo_medio_pagamento numeric,
  status text default 'ativo',
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_produtos_consorcio_empresa on public.produtos_consorcio(empresa_id);
create index if not exists idx_produtos_consorcio_created on public.produtos_consorcio(created_at desc);
drop trigger if exists trg_produtos_consorcio_updated on public.produtos_consorcio;
create trigger trg_produtos_consorcio_updated before update on public.produtos_consorcio for each row execute function public.set_updated_at();
alter table public.produtos_consorcio enable row level security;
drop policy if exists "produtos_consorcio_select" on public.produtos_consorcio;
create policy "produtos_consorcio_select" on public.produtos_consorcio for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "produtos_consorcio_insert" on public.produtos_consorcio;
create policy "produtos_consorcio_insert" on public.produtos_consorcio for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "produtos_consorcio_update" on public.produtos_consorcio;
create policy "produtos_consorcio_update" on public.produtos_consorcio for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "produtos_consorcio_delete" on public.produtos_consorcio;
create policy "produtos_consorcio_delete" on public.produtos_consorcio for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.recebiveis_consorcio (
  id uuid primary key default gen_random_uuid(),
  administradora text,
  cliente text,
  comissao_vinculada text,
  data_prevista_recebimento date,
  data_recebimento_real date,
  elegivel_antecipacao boolean default false,
  lider text,
  motivo_inelegibilidade text,
  numero_parcela numeric,
  observacoes text,
  produto text,
  status_recebivel text default 'previsto',
  total_parcelas numeric,
  valor_carta numeric,
  valor_recebivel numeric,
  venda_vinculada text,
  vendedor text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_recebiveis_consorcio_empresa on public.recebiveis_consorcio(empresa_id);
create index if not exists idx_recebiveis_consorcio_created on public.recebiveis_consorcio(created_at desc);
drop trigger if exists trg_recebiveis_consorcio_updated on public.recebiveis_consorcio;
create trigger trg_recebiveis_consorcio_updated before update on public.recebiveis_consorcio for each row execute function public.set_updated_at();
alter table public.recebiveis_consorcio enable row level security;
drop policy if exists "recebiveis_consorcio_select" on public.recebiveis_consorcio;
create policy "recebiveis_consorcio_select" on public.recebiveis_consorcio for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "recebiveis_consorcio_insert" on public.recebiveis_consorcio;
create policy "recebiveis_consorcio_insert" on public.recebiveis_consorcio for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "recebiveis_consorcio_update" on public.recebiveis_consorcio;
create policy "recebiveis_consorcio_update" on public.recebiveis_consorcio for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "recebiveis_consorcio_delete" on public.recebiveis_consorcio;
create policy "recebiveis_consorcio_delete" on public.recebiveis_consorcio for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.regras_comissao (
  id uuid primary key default gen_random_uuid(),
  nome_regra text,
  administradora text,
  produto text,
  tabela_comercial text,
  categoria_produto text,
  tipo_comissao text default 'percentual',
  tipo_regra_comissao text default 'percentual_fixo',
  base_calculo text default 'valor_carta',
  percentual_total numeric,
  percentual_base numeric,
  valor_fixo_total numeric,
  quantidade_parcelas_comissionaveis numeric default 1,
  forma_pagamento text default 'a_vista',
  comissao_min numeric,
  comissao_max numeric,
  possui_estorno boolean default false,
  sem_estorno boolean default false,
  percentual_estorno numeric,
  parcela_referencia_estorno numeric,
  prazo_pagamento_dias numeric,
  prazo_primeiro_pagamento_dias numeric default 30,
  gatilho_pagamento text default 'venda_criada',
  percentual_vendedor numeric,
  percentual_lider numeric,
  percentual_empresa numeric,
  permitir_diferenca_manual boolean default false,
  justificativa_diferenca text,
  status text default 'ativa',
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_regras_comissao_empresa on public.regras_comissao(empresa_id);
create index if not exists idx_regras_comissao_created on public.regras_comissao(created_at desc);
drop trigger if exists trg_regras_comissao_updated on public.regras_comissao;
create trigger trg_regras_comissao_updated before update on public.regras_comissao for each row execute function public.set_updated_at();
alter table public.regras_comissao enable row level security;
drop policy if exists "regras_comissao_select" on public.regras_comissao;
create policy "regras_comissao_select" on public.regras_comissao for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "regras_comissao_insert" on public.regras_comissao;
create policy "regras_comissao_insert" on public.regras_comissao for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "regras_comissao_update" on public.regras_comissao;
create policy "regras_comissao_update" on public.regras_comissao for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "regras_comissao_delete" on public.regras_comissao;
create policy "regras_comissao_delete" on public.regras_comissao for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.vendas_consorcio (
  id uuid primary key default gen_random_uuid(),
  cliente text,
  oportunidade_vinculada text,
  vendedor text,
  lider text,
  equipe text,
  administradora text,
  produto text,
  grupo text,
  cota text,
  valor_carta numeric,
  data_venda date,
  percentual_comissao_prevista numeric,
  valor_comissao_prevista numeric,
  data_prevista_pagamento date,
  status_operacional text default 'lancada',
  status_conciliacao text default 'nao_conciliada',
  status_financeiro text default 'comissao_prevista',
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vendas_consorcio_empresa on public.vendas_consorcio(empresa_id);
create index if not exists idx_vendas_consorcio_created on public.vendas_consorcio(created_at desc);
drop trigger if exists trg_vendas_consorcio_updated on public.vendas_consorcio;
create trigger trg_vendas_consorcio_updated before update on public.vendas_consorcio for each row execute function public.set_updated_at();
alter table public.vendas_consorcio enable row level security;
drop policy if exists "vendas_consorcio_select" on public.vendas_consorcio;
create policy "vendas_consorcio_select" on public.vendas_consorcio for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "vendas_consorcio_insert" on public.vendas_consorcio;
create policy "vendas_consorcio_insert" on public.vendas_consorcio for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "vendas_consorcio_update" on public.vendas_consorcio;
create policy "vendas_consorcio_update" on public.vendas_consorcio for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "vendas_consorcio_delete" on public.vendas_consorcio;
create policy "vendas_consorcio_delete" on public.vendas_consorcio for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());

create table if not exists public.vendedores (
  id uuid primary key default gen_random_uuid(),
  nome text,
  email text,
  telefone text,
  cpf_cnpj text,
  equipe text,
  lider text,
  tipo_vendedor text default 'interno',
  meta_mensal numeric,
  status text default 'ativo',
  data_inicio date,
  observacoes text,
  empresa_vinculada text,
  empresa_id uuid references public.empresas(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vendedores_empresa on public.vendedores(empresa_id);
create index if not exists idx_vendedores_created on public.vendedores(created_at desc);
drop trigger if exists trg_vendedores_updated on public.vendedores;
create trigger trg_vendedores_updated before update on public.vendedores for each row execute function public.set_updated_at();
alter table public.vendedores enable row level security;
drop policy if exists "vendedores_select" on public.vendedores;
create policy "vendedores_select" on public.vendedores for select to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "vendedores_insert" on public.vendedores;
create policy "vendedores_insert" on public.vendedores for insert to authenticated with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "vendedores_update" on public.vendedores;
create policy "vendedores_update" on public.vendedores for update to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin()) with check (empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists "vendedores_delete" on public.vendedores;
create policy "vendedores_delete" on public.vendedores for delete to authenticated using (empresa_id = public.current_empresa_id() or public.is_super_admin());


-- ── Extensão de empresas para os campos usados pelas telas de Empresa (entidade base44 "Empresa" → tabela empresas) ──
alter table public.empresas
  add column if not exists razao_social text,
  add column if not exists nome_fantasia text,
  add column if not exists responsavel_principal text,
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists website text,
  add column if not exists logo_url text,
  add column if not exists endereco text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists cep text,
  add column if not exists plano_contratado text,
  add column if not exists data_inicio_plataforma date,
  add column if not exists elegivel_antecipacao boolean default false,
  add column if not exists limite_atual_sugerido numeric,
  add column if not exists limite_utilizado numeric,
  add column if not exists limite_disponivel numeric,
  add column if not exists observacoes_internas text,
  add column if not exists empresa_vinculada text,
  add column if not exists created_by uuid;

-- espelha nome/razao_social para compatibilidade (telas usam razao_social; auth usa nome)
-- desabilita temporariamente as regras de update (trigger exige contexto de usuário autenticado)
alter table public.empresas disable trigger user;
update public.empresas set razao_social = coalesce(razao_social, nome) where razao_social is null;
alter table public.empresas enable trigger user;

-- profiles: campos usados por UsuarioAcesso/Perfil (auth já é Supabase; sem senha_hash)
alter table public.profiles
  add column if not exists cpf_cnpj text,
  add column if not exists telefone text;
