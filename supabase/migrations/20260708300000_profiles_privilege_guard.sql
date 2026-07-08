-- A-01: impede escalonamento de privilégio via UPDATE em public.profiles.
-- Independentemente da policy de RLS existente, este trigger garante que um
-- usuário comum NÃO consiga alterar o próprio role/status/empresa_id (ex.: se
-- auto-promover a super_admin). Admins continuam gerenciando papéis dentro do
-- seu escopo; o service_role (Edge Functions) permanece liberado.

create or replace function public.enforce_profile_privilege_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_empresa uuid;
begin
  -- Sem sessão (service_role / server) → confiável, libera.
  if v_actor is null then
    return new;
  end if;

  v_role := public.current_profile_role();
  v_empresa := public.current_profile_empresa_id();

  -- Super admin: acesso total.
  if v_role = 'super_admin' then
    return new;
  end if;

  -- Admin da empresa: pode gerenciar perfis da própria empresa, mas nunca
  -- promover ninguém (nem a si) a super_admin.
  if v_role = 'admin_empresa' and old.empresa_id is not distinct from v_empresa then
    if new.role = 'super_admin' and old.role is distinct from 'super_admin' then
      raise exception 'admin_empresa nao pode promover a super_admin';
    end if;
    -- não pode mover o perfil para outra empresa
    if new.empresa_id is distinct from old.empresa_id then
      raise exception 'admin_empresa nao pode alterar a empresa do perfil';
    end if;
    return new;
  end if;

  -- Demais casos (inclui o próprio usuário editando seu perfil): bloqueia
  -- alteração de colunas sensíveis. Permite apenas dados não privilegiados
  -- (display_name, profile_picture, etc.).
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.empresa_id is distinct from old.empresa_id then
    raise exception 'sem permissao para alterar papel/status/empresa do perfil';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_privilege_rules on public.profiles;
create trigger trg_enforce_profile_privilege_rules
before update on public.profiles
for each row
execute function public.enforce_profile_privilege_rules();
