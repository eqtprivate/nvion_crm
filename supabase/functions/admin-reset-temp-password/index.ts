import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseSecretKey() {
  const legacyServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyServiceRoleKey) return legacyServiceRoleKey;

  const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeysRaw) return null;

  try {
    const secretKeys = JSON.parse(secretKeysRaw);
    return secretKeys?.default || Object.values(secretKeys || {})[0] || null;
  } catch {
    return null;
  }
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
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !secretKey) {
    return jsonResponse({ error: 'missing_server_configuration' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return jsonResponse({ error: 'missing_authorization' }, 401);

  const admin = createClient(supabaseUrl, secretKey, {
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

  const targetUserId = String(payload.user_id || '').trim();
  if (!targetUserId) return jsonResponse({ error: 'user_id_required' }, 400);
  if (targetUserId === requesterId) return jsonResponse({ error: 'cannot_reset_own_password' }, 403);

  const { data: targetProfile, error: targetProfileError } = await admin
    .from('profiles')
    .select('id, display_name, email, role, status, empresa_id, empresa_vinculada')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetProfileError) return jsonResponse({ error: 'target_profile_error', detail: targetProfileError.message }, 500);
  if (!targetProfile) return jsonResponse({ error: 'target_profile_not_found' }, 404);
  if (requester.role === 'admin_empresa') {
    if (targetProfile.role === 'super_admin') return jsonResponse({ error: 'admin_empresa_cannot_reset_super_admin' }, 403);
    if (targetProfile.empresa_id !== requester.empresa_id) {
      return jsonResponse({ error: 'admin_empresa_cannot_reset_other_company' }, 403);
    }
  }

  const tempPassword = generateTemporaryPassword();
  const { data: targetAuthUser } = await admin.auth.admin.getUserById(targetUserId);
  const { error: updateUserError } = await admin.auth.admin.updateUserById(targetUserId, {
    password: tempPassword,
    user_metadata: {
      ...(targetAuthUser?.user?.user_metadata || {}),
      temporary_password_generated_at: new Date().toISOString(),
    },
  });

  if (updateUserError) {
    return jsonResponse({ error: 'auth_password_update_error', detail: updateUserError.message }, 400);
  }

  await admin.from('audit_logs').insert({
    user_id: requesterId,
    action: 'admin_reset_temporary_password',
    entity: 'profiles',
    entity_id: targetUserId,
    metadata: { email: targetProfile.email, role: targetProfile.role, empresa_id: targetProfile.empresa_id },
  });

  return jsonResponse({
    user_id: targetUserId,
    email: targetProfile.email,
    display_name: targetProfile.display_name,
    temporary_password: tempPassword,
  });
});
