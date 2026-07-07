-- Hardening de segurança (Supabase advisor: "Function Search Path Mutable").
-- Recria as funções auxiliares com search_path fixo e SECURITY DEFINER, evitando
-- sequestro de search_path e recursão de RLS ao consultar public.profiles.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;
