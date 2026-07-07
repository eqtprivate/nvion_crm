import { supabase } from '@/lib/supabaseClient';

// Registro de auditoria "fire-and-forget": nunca lança nem bloqueia a ação
// principal. Se a inserção falhar (rede, política, etc.), apenas loga no console.
export async function logAudit(action, { entity = null, entityId = null, empresaId = null, metadata = {} } = {}) {
  try {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity,
      entity_id: entityId != null ? String(entityId) : null,
      empresa_id: empresaId,
      metadata: metadata || {},
    });
  } catch (err) {
    // Auditoria não pode quebrar o fluxo do usuário.
    if (typeof console !== 'undefined') console.warn('[audit] falha ao registrar', action, err?.message || err);
  }
}
