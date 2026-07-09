-- Política de senha: obriga troca no login para senhas fora do novo padrão.
-- Adiciona flag em profiles; marca todos os usuários existentes para trocar a
-- senha no próximo acesso (não dá para saber se a senha antiga atende à política,
-- pois é hash — então força a redefinição para o novo padrão).

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Todos os usuários atuais devem gerar nova senha no padrão novo.
update public.profiles set must_change_password = true;

-- Novos usuários criados com senha temporária também trocam no primeiro acesso:
-- a Edge Function admin-create-user passa a definir must_change_password = true.
