-- M-01: leva o isolamento "vendedor vê só o seu" para a RLS (antes só no cliente).
-- Escopo: policies de SELECT nas tabelas comerciais. INSERT/UPDATE/DELETE seguem
-- no escopo de empresa (o risco de confidencialidade é de LEITURA; alterar escrita
-- quebraria fluxos de atribuição). Espelha a lógica de src/lib/accessControl.js:
--   super_admin/admin_empresa/gestor_comercial/gestor_financeiro/analista_plataforma → toda a empresa
--   lider_comercial → onde é líder OU vendedor da sua equipe
--   vendedor → onde é o vendedor responsável
-- Observação: o casamento é por display_name (como no app hoje); renomear um
-- usuário muda a visibilidade — considerar migrar para chave estável no futuro.

create or replace function public.current_profile_display_name()
returns text language sql stable security definer set search_path = public as $$
  select display_name from public.profiles where id = auth.uid();
$$;

create or replace function public.can_view_commercial_row(p_vendedor text, p_lider text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    -- papéis com visão de toda a empresa
    public.current_profile_role() in (
      'super_admin','admin_empresa','gestor_comercial','gestor_financeiro','analista_plataforma'
    )
    -- líder: registros onde ele é o líder
    or (p_lider is not null and p_lider = public.current_profile_display_name())
    -- vendedor: registros onde ele é o vendedor
    or (p_vendedor is not null and p_vendedor = public.current_profile_display_name())
    -- líder: registros de vendedores da sua equipe
    or (p_vendedor is not null and exists (
      select 1 from public.equipes_comerciais e
      where e.empresa_id = public.current_empresa_id()
        and e.lider_responsavel = public.current_profile_display_name()
        and e.vendedores_vinculados ? p_vendedor
    ));
$$;

-- Recria os SELECT com o recorte por vendedor/líder (super_admin vê tudo).
drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads for select to authenticated
using (public.is_super_admin() or (empresa_id = public.current_empresa_id()
  and public.can_view_commercial_row(vendedor_responsavel, lider_vinculado)));

drop policy if exists "opportunities_select" on public.opportunities;
create policy "opportunities_select" on public.opportunities for select to authenticated
using (public.is_super_admin() or (empresa_id = public.current_empresa_id()
  and public.can_view_commercial_row(vendedor, lider)));

drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts for select to authenticated
using (public.is_super_admin() or (empresa_id = public.current_empresa_id()
  and public.can_view_commercial_row(vendedor_responsavel, null)));

drop policy if exists "vendas_consorcio_select" on public.vendas_consorcio;
create policy "vendas_consorcio_select" on public.vendas_consorcio for select to authenticated
using (public.is_super_admin() or (empresa_id = public.current_empresa_id()
  and public.can_view_commercial_row(vendedor, lider)));

drop policy if exists "recebiveis_consorcio_select" on public.recebiveis_consorcio;
create policy "recebiveis_consorcio_select" on public.recebiveis_consorcio for select to authenticated
using (public.is_super_admin() or (empresa_id = public.current_empresa_id()
  and public.can_view_commercial_row(vendedor, lider)));

drop policy if exists "comissoes_select" on public.comissoes;
create policy "comissoes_select" on public.comissoes for select to authenticated
using (public.is_super_admin() or (empresa_id = public.current_empresa_id()
  and public.can_view_commercial_row(vendedor, lider)));
