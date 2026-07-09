-- Módulo de backup diário (snapshot lógico por empresa em Storage privado).
-- A Edge Function daily-backup gera um JSON por empresa e grava no bucket
-- 'backups'; esta migração cria o bucket, a tabela de metadados e as políticas.

-- 1) Bucket privado de backups.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- 2) Metadados dos backups (uma linha por empresa por dia).
create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid,
  empresa_nome text,
  backup_date date not null default (now() at time zone 'utc')::date,
  status text not null default 'ok',      -- ok | failed
  tables jsonb default '{}'::jsonb,        -- contagem por tabela
  file_path text,                          -- caminho no bucket
  size_bytes bigint,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists backups_empresa_idx on public.backups (empresa_id);
create index if not exists backups_date_idx on public.backups (backup_date desc);

alter table public.backups enable row level security;

-- Leitura: super_admin vê tudo; admin_empresa vê os da própria empresa.
drop policy if exists backups_select_admin on public.backups;
create policy backups_select_admin
  on public.backups for select to authenticated
  using (
    public.is_super_admin()
    or (
      empresa_id is not null
      and empresa_id = public.current_empresa_id()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin_empresa'
      )
    )
  );

-- Escrita: apenas a Edge Function (service_role) grava — sem políticas de write
-- para usuários. O Storage do bucket 'backups' também fica sem políticas
-- públicas: o download é intermediado pela Edge Function backup-download
-- (verifica papel/empresa e devolve URL assinada via service_role).
