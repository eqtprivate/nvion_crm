-- NVION CRM auth core base tables
-- Apply in Supabase SQL Editor or through Supabase migrations.

create extension if not exists pgcrypto;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  status text not null default 'ativa',
  plano text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  display_name text not null,
  email text not null unique,
  empresa_id uuid references public.empresas(id),
  empresa_vinculada text,
  role text not null default 'vendedor',
  status text not null default 'ativo',
  profile_picture text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, module_key)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.user_modules enable row level security;
alter table public.audit_logs enable row level security;
