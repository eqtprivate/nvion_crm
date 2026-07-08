-- Seed do catálogo de planos (tela Gestão de Planos, super_admin).
-- A tabela public.planos estava vazia, por isso a tela não exibia opções.
-- Planos globais (empresa_id null) — visíveis ao super_admin pela policy planos_select.

-- Garante unicidade do slug entre os planos globais (empresa_id null) para o upsert.
create unique index if not exists planos_slug_global_uidx
  on public.planos (slug)
  where empresa_id is null;

insert into public.planos (slug, label, descricao, max_usuarios, ativo, modulos) values
(
  'mvp', 'MVP', 'Plano inicial para validação — funil comercial essencial.', 3, true,
  '["Dashboard","Leads","Oportunidades","Contacts","Reports"]'::jsonb
),
(
  'starter', 'Starter', 'Operação comercial completa para equipes pequenas.', 10, true,
  '["Dashboard","Leads","Campanhas","Oportunidades","Contacts","Accounts","Vendedores","EquipeComercial","Reports"]'::jsonb
),
(
  'business', 'Business', 'Comercial + financeiro (comissões e recebíveis).', 30, true,
  '["Dashboard","Leads","Campanhas","Oportunidades","Contacts","Accounts","Vendedores","VendasConsorcio","ProdutoConsorcio","EquipeComercial","RegrasComissao","Comissoes","ConciliacaoAdministradora","Recebiveis","PainelRecebiveis","Reports"]'::jsonb
),
(
  'enterprise', 'Enterprise', 'Todos os módulos, incluindo gestão avançada.', 200, true,
  '["Dashboard","Leads","Campanhas","Oportunidades","Contacts","Accounts","Vendedores","VendasConsorcio","ProdutoConsorcio","EquipeComercial","RegrasComissao","Comissoes","ConciliacaoAdministradora","Recebiveis","PainelRecebiveis","Reports","Settings","GestaoAcessos"]'::jsonb
),
(
  'interno', 'Interno', 'Uso interno/administração da plataforma — acesso total.', 999, true,
  '["Dashboard","Leads","Campanhas","Oportunidades","Contacts","Accounts","Vendedores","VendasConsorcio","ProdutoConsorcio","EquipeComercial","RegrasComissao","Comissoes","ConciliacaoAdministradora","Recebiveis","PainelRecebiveis","Reports","Settings","GestaoAcessos","GestaoLogs"]'::jsonb
)
on conflict do nothing;
