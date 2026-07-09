// Gera uma URL assinada para baixar um backup, verificando o usuário.
// Chamado pelo app (supabase.functions.invoke) com o JWT do usuário.
// super_admin baixa qualquer backup; admin_empresa só os da própria empresa.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function getSecretKey(): string | null {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) return null;
  try { const k = JSON.parse(raw); return k?.default || Object.values(k || {})[0] || null; } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) return json({ error: 'missing_server_configuration' }, 500);

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return json({ error: 'missing_authorization' }, 401);

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user) return json({ error: 'invalid_authorization' }, 401);

  const { data: requester } = await admin.from('profiles')
    .select('role, status, empresa_id').eq('id', authData.user.id).maybeSingle();
  if (!requester || requester.status !== 'ativo') return json({ error: 'not_allowed' }, 403);
  if (!['super_admin', 'admin_empresa'].includes(requester.role)) return json({ error: 'insufficient_role' }, 403);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const backupId = String(payload.backup_id || '').trim();
  if (!backupId) return json({ error: 'backup_id_required' }, 400);

  const { data: backup } = await admin.from('backups')
    .select('id, empresa_id, file_path, status').eq('id', backupId).maybeSingle();
  if (!backup || !backup.file_path) return json({ error: 'backup_not_found' }, 404);

  // admin_empresa só acessa backups da própria empresa.
  if (requester.role === 'admin_empresa' && backup.empresa_id !== requester.empresa_id) {
    return json({ error: 'forbidden' }, 403);
  }

  const { data: signed, error: signErr } = await admin.storage.from('backups')
    .createSignedUrl(backup.file_path, 300); // 5 min
  if (signErr) return json({ error: 'sign_error', detail: signErr.message }, 500);

  return json({ url: signed.signedUrl });
});
