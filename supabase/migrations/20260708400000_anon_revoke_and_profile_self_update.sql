-- M-07: menor privilégio para o role anon.
-- O app exige login para tudo; o anônimo não precisa de acesso a nenhuma tabela.
-- A RLS já barra o anon (policies são "to authenticated"), mas revogar os grants
-- é defesa em profundidade: se faltar uma policy no futuro, o anon ainda assim
-- não acessa; também remove TRUNCATE (que ignora RLS).
revoke all on all tables in schema public from anon;
-- Mantém apenas o necessário para o fluxo de login/anon do Supabase Auth
-- (as tabelas de auth ficam em outro schema; public não precisa de anon).

-- Fix funcional: permitir que o usuário edite o PRÓPRIO perfil (nome/foto),
-- sem reabrir o A-01. O trigger enforce_profile_privilege_rules já impede
-- alteração de role/status/empresa_id por não-admin, então esta policy é segura.
drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
