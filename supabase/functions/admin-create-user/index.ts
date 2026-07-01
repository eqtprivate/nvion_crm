import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES = new Set([
  'super_admin',
  'admin_empresa',
  'gestor_comercial',
  'lider_comercial',
  'gestor_financeiro',
  'vendedor',
  'analista_plataforma',
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function generateTemporaryPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const token = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `Nvion-${token}!7`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'missing_server_configuration' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return jsonResponse({ error: 'missing_authorization' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) return jsonResponse({ error: 'invalid_authorization' }, 401);

  const requesterId = authData.user.id;
  const { data: requester, error: requesterError } = await admin
    .from('profiles')
    .select('id, role, status, empresa_id, empresa_vinculada')
    .eq('id', requesterId)
    .maybeSingle();

  if (requesterError) return jsonResponse({ error: 'requester_profile_error', detail: requesterError.message }, 500);
  if (!requester || requester.status !== 'ativo') return jsonResponse({ error: 'requester_not_allowed' }, 403);
  if (!['super_admin', 'admin_empresa'].includes(requester.role)) return jsonResponse({ error: 'insufficient_role' }, 403);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const email = normalizeEmail(payload.email);
  const displayName = String(payload.display_name || '').trim();
  const role = String(payload.role || 'vendedor').trim();
  const status = String(payload.status || 'ativo').trim();
  const requestedEmpresaId = String(payload.empresa_id || '').trim() || null;
  const requestedEmpresaVinculada = String(payload.empresa_vinculada || '').trim();
  const requestedModules = Array.isArray(payload.modules) ? payload.modules.map(String).filter(Boolean) : [];

  if (!displayName) return jsonResponse({ error: 'display_name_required' }, 400);
  if (!email || !email.includes('@')) return jsonResponse({ error: 'valid_email_required' }, 400);
  if (!ROLES.has(role)) return jsonResponse({ error: 'invalid_role' }, 400);
  if (!['ativo', 'suspenso', 'pendente'].includes(status)) return jsonResponse({ error: 'invalid_status' }, 400);

  if (requester.role === 'admin_empresa') {
    if (role === 'super_admin') return jsonResponse({ error: 'admin_empresa_cannot_create_super_admin' }, 403);
    if (requestedEmpresaId && requestedEmpresaId !== requester.empresa_id) {
      return jsonResponse({ error: 'admin_empresa_cannot_create_other_company' }, 403);
    }
  }

  const empresaId = requester.role === 'super_admin' ? requestedEmpresaId : requester.empresa_id;
  if (!empresaId) return jsonResponse({ error: 'empresa_id_required' }, 400);

  const { data: empresa, error: empresaError } = await admin
    .from('empresas')
    .select('id, nome')
    .eq('id', empresaId)
    .maybeSingle();

  if (empresaError) return jsonResponse({ error: 'empresa_lookup_error', detail: empresaError.message }, 500);
  if (!empresa) return jsonResponse({ error: 'empresa_not_found' }, 404);

  const tempPassword = generateTemporaryPassword();

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      nvion_role: role,
      empresa_id: empresaId,
    },
  });

  if (createUserError || !createdUser?.user) {
    return jsonResponse({ error: 'auth_user_create_error', detail: createUserError?.message || 'unknown_error' }, 400);
  }

  const userId = createdUser.user.id;
  const empresaVinculada = requestedEmpresaVinculada || empresa.nome || requester.empresa_vinculada || '';

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    display_name: displayName,
    email,
    empresa_id: empresaId,
    empresa_vinculada: empresaVinculada,
    role,
    status,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return jsonResponse({ error: 'profile_create_error', detail: profileError.message }, 400);
  }

  if (requestedModules.length > 0) {
    const { error: modulesError } = await admin.from('user_modules').insert(
      requestedModules.map((moduleKey) => ({ user_id: userId, module_key: moduleKey, enabled: true })),
    );

    if (modulesError) {
      await admin.from('profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: 'modules_create_error', detail: modulesError.message }, 400);
    }
  }

  await admin.from('audit_logs').insert({
    user_id: requesterId,
    action: 'admin_create_user',
    entity: 'profiles',
    entity_id: userId,
    metadata: { email, role, empresa_id: empresaId },
  });

  return jsonResponse({
    user_id: userId,
    email,
    display_name: displayName,
    temporary_password: tempPassword,
  });
});
