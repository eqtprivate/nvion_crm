// Send Email Hook do Supabase Auth.
// Registrado em Authentication → Hooks → "Send Email Hook", esta função é
// chamada pelo Supabase sempre que um e-mail de autenticação precisa ser
// enviado (recuperação, convite, confirmação, magic link, alteração de e-mail).
// Ela renderiza o template salvo em public.email_templates e envia via Resend.
//
// Secrets necessárias (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY           chave de API do Resend (re_...)
//   EMAIL_FROM               remetente verificado, ex: "NVION <nao-responda@seudominio.com.br>"
//   SEND_EMAIL_HOOK_SECRET   segredo do hook (formato v1,whsec_...) — gerado pelo Supabase
//   SUPABASE_URL             injetada automaticamente
//   SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEYS) para ler os templates

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

function getSupabaseSecretKey(): string | null {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) return null;
  try {
    const keys = JSON.parse(raw);
    return keys?.default || Object.values(keys || {})[0] || null;
  } catch {
    return null;
  }
}

// Verificação de assinatura Standard Webhooks (usada pelo Supabase Auth hooks).
async function verifySignature(secret: string, headers: Headers, body: string): Promise<boolean> {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatureHeader = headers.get('webhook-signature');
  if (!id || !timestamp || !signatureHeader) return false;

  const base64Secret = secret.replace(/^v1,?whsec_/, '').replace(/^whsec_/, '');
  const keyBytes = Uint8Array.from(atob(base64Secret), (c) => c.charCodeAt(0));
  const signedContent = `${id}.${timestamp}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  // O header pode conter múltiplas assinaturas separadas por espaço, cada uma "v1,<sig>".
  return signatureHeader.split(' ').some((part) => {
    const sig = part.includes(',') ? part.split(',')[1] : part;
    return sig === expected;
  });
}

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_m, name) => vars[name] ?? '');
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`resend_error_${res.status}: ${detail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM');
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSupabaseSecretKey();

  if (!resendApiKey || !emailFrom || !supabaseUrl || !secretKey) {
    return new Response(JSON.stringify({ error: 'missing_server_configuration' }), { status: 500 });
  }

  const rawBody = await req.text();

  // Verificação de assinatura (obrigatória se o segredo estiver configurado).
  if (hookSecret) {
    const ok = await verifySignature(hookSecret, req.headers, rawBody).catch(() => false);
    if (!ok) return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const user = payload?.user || {};
  const emailData = payload?.email_data || {};
  const actionType = String(emailData.email_action_type || '').trim();
  const to = String(user.email || '').trim();
  if (!to || !actionType) {
    return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400 });
  }

  // Constrói o link de confirmação (verificação via endpoint do Supabase Auth).
  const confirmationURL =
    `${supabaseUrl}/auth/v1/verify?token=${emailData.token_hash}` +
    `&type=${actionType}` +
    (emailData.redirect_to ? `&redirect_to=${encodeURIComponent(emailData.redirect_to)}` : '');

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: template, error: templateError } = await admin
    .from('email_templates')
    .select('subject, html')
    .eq('key', actionType)
    .maybeSingle();

  if (templateError) {
    return new Response(JSON.stringify({ error: 'template_lookup_error', detail: templateError.message }), { status: 500 });
  }
  if (!template) {
    // Sem template cadastrado para este tipo: falha explícita para o Supabase reenfileirar/registrar.
    return new Response(JSON.stringify({ error: 'template_not_found', action: actionType }), { status: 404 });
  }

  const vars: Record<string, string> = {
    ConfirmationURL: confirmationURL,
    Email: to,
    Token: String(emailData.token || ''),
    SiteURL: String(emailData.site_url || ''),
    DisplayName: String(user.user_metadata?.display_name || ''),
  };

  const subject = renderTemplate(template.subject, vars);
  const html = renderTemplate(template.html, vars);

  try {
    await sendViaResend(resendApiKey, emailFrom, to, subject, html);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'send_failed', detail: String(err?.message || err) }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
