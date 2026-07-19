// Backup diário: gera um snapshot JSON por empresa e grava no bucket 'backups'.
// Disparo: pg_cron (net.http_post) ou Supabase Cron, 1x/dia, com o header
// x-backup-secret = BACKUP_FN_SECRET. Retenção: 7 dias.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   BACKUP_FN_SECRET          segredo compartilhado do agendador
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEYS)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const RETENTION_DAYS = 7;

// Tabelas de negócio a incluir no snapshot (todas com empresa_id).
const TABLES = [
  'accounts', 'campanhas', 'comissoes', 'conciliacao_vendas', 'contacts',
  'default_settings', 'equipes_comerciais', 'importacoes_relatorio', 'leads',
  'opportunities', 'parcelas_comissao', 'parcelas_regra_comissao', 'planos',
  'produtos_consorcio', 'recebiveis_consorcio', 'regras_comissao',
  'vendas_consorcio', 'vendedores', 'profiles',
];

function getSecretKey(): string | null {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) return null;
  try { const k = JSON.parse(raw); return k?.default || Object.values(k || {})[0] || null; } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });

  const fnSecret = Deno.env.get('BACKUP_FN_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();
  if (!fnSecret || !supabaseUrl || !secretKey) {
    return new Response(JSON.stringify({ error: 'missing_server_configuration' }), { status: 500 });
  }
  if ((req.headers.get('x-backup-secret') || '') !== fnSecret) {
    return new Response(JSON.stringify({ error: 'invalid_secret' }), { status: 401 });
  }

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const today = new Date().toISOString().slice(0, 10);
  const results: any[] = [];

  const { data: empresas, error: empErr } = await admin.from('empresas').select('*');
  if (empErr) return new Response(JSON.stringify({ error: 'empresas_error', detail: empErr.message }), { status: 500 });

  for (const empresa of empresas || []) {
    const snapshot: Record<string, unknown> = {
      empresa, generated_at: new Date().toISOString(), tables: {} as Record<string, unknown[]>,
    };
    const counts: Record<string, number> = {};
    try {
      for (const table of TABLES) {
        const { data, error } = await admin.from(table).select('*').eq('empresa_id', empresa.id);
        if (error) throw new Error(`${table}: ${error.message}`);
        (snapshot.tables as Record<string, unknown[]>)[table] = data || [];
        counts[table] = (data || []).length;
      }

      const body = JSON.stringify(snapshot);
      const path = `${empresa.id}/${today}.json`;
      const { error: upErr } = await admin.storage.from('backups')
        .upload(path, new Blob([body], { type: 'application/json' }), { upsert: true, contentType: 'application/json' });
      if (upErr) throw new Error(`upload: ${upErr.message}`);

      await admin.from('backups').insert({
        empresa_id: empresa.id, empresa_nome: empresa.nome, backup_date: today,
        status: 'ok', tables: counts, file_path: path, size_bytes: body.length,
      });
      results.push({ empresa: empresa.nome, status: 'ok', size: body.length });
    } catch (err) {
      await admin.from('backups').insert({
        empresa_id: empresa.id, empresa_nome: empresa.nome, backup_date: today,
        status: 'failed', error: String((err as Error)?.message || err),
      });
      results.push({ empresa: empresa.nome, status: 'failed', error: String((err as Error)?.message || err) });
    }
  }

  // Retenção: remove metadados e arquivos com mais de RETENTION_DAYS.
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
    const { data: old } = await admin.from('backups').select('id, file_path').lt('backup_date', cutoff);
    const paths = (old || []).map((r: any) => r.file_path).filter(Boolean);
    if (paths.length > 0) {
      await admin.storage.from('backups').remove(paths);
      await admin.from('backups').delete().lt('backup_date', cutoff);
    }
  } catch (_e) { /* retenção não bloqueia o backup */ }

  return new Response(JSON.stringify({ date: today, empresas: results.length, results }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
