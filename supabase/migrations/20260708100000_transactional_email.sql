-- E-mails transacionais (eventos de negócio) + histórico de envios.
-- Estende o sistema de templates para suportar categoria 'transactional' e
-- registra cada envio em public.email_logs. O disparo do evento "venda
-- registrada" é feito por um Database Webhook (trigger) em vendas_consorcio,
-- configurado no painel, apontando para a Edge Function `send-email`.

-- 1) Categoria nos templates (auth x transactional).
alter table public.email_templates
  add column if not exists category text not null default 'auth';

update public.email_templates
  set category = 'auth'
  where key in ('recovery', 'invite', 'signup', 'magiclink', 'email_change');

-- 2) Template transacional: venda registrada.
insert into public.email_templates (key, label, subject, html, category) values
(
  'venda_registrada',
  'Venda registrada',
  'NVION — Nova venda registrada',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f172a">'
  || '<h2 style="margin:0 0 8px">Nova venda registrada</h2>'
  || '<p style="color:#475569;font-size:14px">Olá {{ .VendedorNome }}, uma nova venda foi registrada no NVION.</p>'
  || '<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">'
  || '<tr><td style="padding:6px 0;color:#64748b">Cliente</td><td style="padding:6px 0;font-weight:600;text-align:right">{{ .Cliente }}</td></tr>'
  || '<tr><td style="padding:6px 0;color:#64748b">Administradora</td><td style="padding:6px 0;font-weight:600;text-align:right">{{ .Administradora }}</td></tr>'
  || '<tr><td style="padding:6px 0;color:#64748b">Produto</td><td style="padding:6px 0;font-weight:600;text-align:right">{{ .Produto }}</td></tr>'
  || '<tr><td style="padding:6px 0;color:#64748b">Valor da carta</td><td style="padding:6px 0;font-weight:600;text-align:right">{{ .ValorCarta }}</td></tr>'
  || '<tr><td style="padding:6px 0;color:#64748b">Data da venda</td><td style="padding:6px 0;font-weight:600;text-align:right">{{ .DataVenda }}</td></tr>'
  || '</table>'
  || '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#cbd5e1;font-size:11px">NVION CRM — notificação automática</p></div>'
)
on conflict (key) do nothing;

-- 3) Histórico de envios.
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  template_key text,
  event text,
  to_email text,
  subject text,
  status text not null default 'sent',        -- sent | failed | skipped
  error text,
  empresa_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_created_at_idx on public.email_logs (created_at desc);
create index if not exists email_logs_empresa_id_idx on public.email_logs (empresa_id);

alter table public.email_logs enable row level security;

-- Leitura: super_admin vê tudo; admin_empresa vê os da própria empresa.
drop policy if exists email_logs_select_admin on public.email_logs;
create policy email_logs_select_admin
  on public.email_logs for select to authenticated
  using (
    public.is_super_admin()
    or (
      empresa_id is not null
      and empresa_id = public.current_empresa_id()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin_empresa')
      )
    )
  );

-- Sem insert/update/delete por usuários: apenas a Edge Function (service_role) grava.
