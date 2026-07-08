-- Gestão de templates de e-mail (superadmin).
-- Os templates são usados pela Edge Function `auth-email-hook`, registrada como
-- "Send Email Hook" do Supabase Auth, para renderizar e enviar via Resend os
-- e-mails de autenticação (recuperação de senha, convite, confirmação, etc.).

create table if not exists public.email_templates (
  key text primary key,
  label text not null,
  subject text not null,
  html text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.email_templates enable row level security;

-- Apenas super_admin lê e edita os templates (a Edge Function usa service_role e
-- ignora RLS).
drop policy if exists email_templates_super_admin_all on public.email_templates;
create policy email_templates_super_admin_all
  on public.email_templates
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create or replace function public.set_email_templates_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists email_templates_updated_at on public.email_templates;
create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_email_templates_updated_at();

-- Seed dos templates padrão NVION. Variáveis disponíveis (substituídas pela
-- Edge Function): {{ .ConfirmationURL }}, {{ .Email }}, {{ .Token }},
-- {{ .SiteURL }}, {{ .DisplayName }}.
insert into public.email_templates (key, label, subject, html) values
(
  'recovery',
  'Recuperação de senha',
  'NVION — Redefinição de senha',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f172a">'
  || '<h2 style="margin:0 0 8px">Redefinição de senha</h2>'
  || '<p style="color:#475569;font-size:14px">Olá, recebemos um pedido para redefinir a senha da sua conta NVION (<strong>{{ .Email }}</strong>).</p>'
  || '<p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Redefinir minha senha</a></p>'
  || '<p style="color:#94a3b8;font-size:12px">Se você não solicitou, ignore este e-mail. O link expira em breve por segurança.</p>'
  || '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#cbd5e1;font-size:11px">NVION CRM — acesso restrito</p></div>'
),
(
  'invite',
  'Convite de usuário',
  'NVION — Você foi convidado(a)',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f172a">'
  || '<h2 style="margin:0 0 8px">Bem-vindo(a) ao NVION</h2>'
  || '<p style="color:#475569;font-size:14px">Você foi convidado(a) para acessar o NVION CRM com o e-mail <strong>{{ .Email }}</strong>. Clique abaixo para definir sua senha e ativar o acesso.</p>'
  || '<p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#1baf7a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Ativar meu acesso</a></p>'
  || '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#cbd5e1;font-size:11px">NVION CRM — acesso restrito</p></div>'
),
(
  'signup',
  'Confirmação de cadastro',
  'NVION — Confirme seu e-mail',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f172a">'
  || '<h2 style="margin:0 0 8px">Confirme seu e-mail</h2>'
  || '<p style="color:#475569;font-size:14px">Confirme o endereço <strong>{{ .Email }}</strong> para ativar sua conta NVION.</p>'
  || '<p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Confirmar e-mail</a></p>'
  || '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#cbd5e1;font-size:11px">NVION CRM — acesso restrito</p></div>'
),
(
  'magiclink',
  'Link mágico de acesso',
  'NVION — Seu link de acesso',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f172a">'
  || '<h2 style="margin:0 0 8px">Seu link de acesso</h2>'
  || '<p style="color:#475569;font-size:14px">Use o link abaixo para entrar no NVION com <strong>{{ .Email }}</strong>.</p>'
  || '<p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Entrar no NVION</a></p>'
  || '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#cbd5e1;font-size:11px">NVION CRM — acesso restrito</p></div>'
),
(
  'email_change',
  'Alteração de e-mail',
  'NVION — Confirme a alteração de e-mail',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f172a">'
  || '<h2 style="margin:0 0 8px">Confirme a alteração de e-mail</h2>'
  || '<p style="color:#475569;font-size:14px">Confirme para concluir a alteração do e-mail da sua conta NVION para <strong>{{ .Email }}</strong>.</p>'
  || '<p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Confirmar alteração</a></p>'
  || '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#cbd5e1;font-size:11px">NVION CRM — acesso restrito</p></div>'
)
on conflict (key) do nothing;
