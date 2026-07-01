-- Gestão de Empresas: policies and update guard for public.empresas.
-- Supabase Auth remains the identity/session source; this migration only scopes empresas access.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.empresa_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.enforce_empresa_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text := public.current_profile_role();
  current_empresa_id uuid := public.current_profile_empresa_id();
begin
  if current_role = 'super_admin' then
    new.updated_at := now();
    return new;
  end if;

  if current_role = 'admin_empresa' and old.id = current_empresa_id then
    if new.status is distinct from old.status then
      raise exception 'admin_empresa nao pode alterar status da empresa';
    end if;

    if new.plano is distinct from old.plano then
      raise exception 'admin_empresa nao pode alterar plano da empresa';
    end if;

    if new.created_at is distinct from old.created_at then
      raise exception 'admin_empresa nao pode alterar created_at da empresa';
    end if;

    new.id := old.id;
    new.updated_at := now();
    return new;
  end if;

  raise exception 'sem permissao para atualizar empresa';
end;
$$;

drop trigger if exists trg_enforce_empresa_update_rules on public.empresas;
create trigger trg_enforce_empresa_update_rules
before update on public.empresas
for each row
execute function public.enforce_empresa_update_rules();

alter table public.empresas enable row level security;

drop policy if exists "empresas select scoped" on public.empresas;
create policy "empresas select scoped"
on public.empresas
for select
to authenticated
using (
  public.current_profile_role() = 'super_admin'
  or (
    public.current_profile_role() = 'admin_empresa'
    and id = public.current_profile_empresa_id()
  )
);

drop policy if exists "empresas insert super_admin" on public.empresas;
create policy "empresas insert super_admin"
on public.empresas
for insert
to authenticated
with check (public.current_profile_role() = 'super_admin');

drop policy if exists "empresas update scoped" on public.empresas;
create policy "empresas update scoped"
on public.empresas
for update
to authenticated
using (
  public.current_profile_role() = 'super_admin'
  or (
    public.current_profile_role() = 'admin_empresa'
    and id = public.current_profile_empresa_id()
  )
)
with check (
  public.current_profile_role() = 'super_admin'
  or (
    public.current_profile_role() = 'admin_empresa'
    and id = public.current_profile_empresa_id()
  )
);

drop policy if exists "empresas delete super_admin" on public.empresas;
create policy "empresas delete super_admin"
on public.empresas
for delete
to authenticated
using (public.current_profile_role() = 'super_admin');
