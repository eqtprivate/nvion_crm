# NVION — Backup diário por empresa

Snapshot lógico diário do banco, **organizado por pasta/empresa**, com **retenção de 7 dias**, disparado **em loop por cron**.

## Arquitetura

- **Edge Function `daily-backup`**: para cada empresa, lê as tabelas de negócio
  (todas com `empresa_id`) e grava um JSON em `backups/{empresa_id}/{YYYY-MM-DD}.json`
  no bucket privado `backups`. Registra metadados em `public.backups`
  (status, contagem por tabela, tamanho, caminho).
- **Retenção**: `RETENTION_DAYS = 7` — arquivos e metadados com mais de 7 dias
  são removidos ao final de cada execução.
- **Bucket privado**: sem políticas públicas. Download intermediado pela Edge
  Function `backup-download` (valida papel/empresa e devolve URL assinada).
- **RLS de `public.backups`**: super_admin vê tudo; admin_empresa vê só a
  própria empresa.
- **UI**: página `GestaoBackups` lista os snapshots e permite download.

## Estrutura de pastas no bucket

```
backups/
  <empresa_id_A>/
    2026-07-13.json
    2026-07-14.json
    ...(máx. 7 dias)
  <empresa_id_B>/
    2026-07-13.json
    ...
```

## Deploy da função

```bash
supabase functions deploy daily-backup
supabase functions deploy backup-download
```

## Secrets (Supabase → Edge Functions → Secrets)

- `BACKUP_FN_SECRET` — segredo compartilhado do agendador (gere um valor forte).
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — já disponíveis no ambiente das functions.

## Agendamento em loop (pg_cron)

Execute no **SQL Editor** (uma vez). Substitua `<PROJECT_REF>` e `<BACKUP_FN_SECRET>`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- roda todo dia às 03:00 UTC
select cron.schedule(
  'nvion-daily-backup',
  '0 3 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-backup-secret', '<BACKUP_FN_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

Conferir / remover o agendamento:

```sql
select jobid, schedule, jobname from cron.job where jobname = 'nvion-daily-backup';
-- select cron.unschedule('nvion-daily-backup');
```

## Teste manual

```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-backup' \
  -H 'x-backup-secret: <BACKUP_FN_SECRET>' -H 'Content-Type: application/json' -d '{}'
```

Resposta esperada: `{ "date": "...", "empresas": N, "results": [...] }`.
