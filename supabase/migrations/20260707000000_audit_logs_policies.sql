-- Auditoria mínima para o MVP.
-- A tabela public.audit_logs já existe (20260630190000_create_nvion_auth_core.sql)
-- com RLS habilitado, porém SEM políticas — o que bloqueia qualquer insert do
-- frontend. Esta migração adiciona escopo por empresa e as políticas necessárias.

-- 1) Coluna de tenant para escopar a leitura por empresa.
alter table public.audit_logs
  add column if not exists empresa_id uuid;

create index if not exists audit_logs_empresa_id_idx on public.audit_logs (empresa_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- 2) Políticas.
-- Qualquer usuário autenticado pode registrar SUAS próprias ações.
drop policy if exists audit_logs_insert_self on public.audit_logs;
create policy audit_logs_insert_self
  on public.audit_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Super admin lê tudo; admin de empresa lê apenas os registros da própria empresa.
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
  on public.audit_logs
  for select
  to authenticated
  using (
    public.is_super_admin()
    or (
      empresa_id is not null
      and empresa_id = public.current_empresa_id()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin_empresa')
      )
    )
  );

-- Sem políticas de update/delete: registros de auditoria são imutáveis.
