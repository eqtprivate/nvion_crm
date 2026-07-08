// Envio de e-mails transacionais disparados por eventos de negócio.
// Registrado como Database Webhook (trigger) do Supabase em vendas_consorcio
// (evento INSERT), esta função resolve o destinatário, renderiza o template
// transacional e envia via Resend, registrando o resultado em public.email_logs.
//
// Secrets necessárias (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY         chave do Resend (re_...)
//   EMAIL_FROM             remetente verificado, ex: "NVION <nao-responda@dominio.com.br>"
//   SEND_EMAIL_FN_SECRET   segredo compartilhado; enviado pelo webhook no header x-webhook-secret
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEYS)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Mapa evento (tabela) → chave de template.
const EVENT_TEMPLATE: Record<string, string> = {
  vendas_consorcio: 'venda_registrada',
};

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

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return String(tpl || '').replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_m, name) => vars[name] ?? '');
}

function formatBRL(value: unknown): string {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: unknown): string {
  if (!value) return '-';
  try {
    return new Date(String(value)).toLocaleDateString('pt-BR');
  } catch {
    return String(value);
  }
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
  const fnSecret = Deno.env.get('SEND_EMAIL_FN_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSupabaseSecretKey();

  // Fail-closed: o segredo do webhook é obrigatório. Sem ele, a função recusa
  // (evita open relay se a env não estiver configurada).
  if (!resendApiKey || !emailFrom || !supabaseUrl || !secretKey || !fnSecret) {
    return new Response(JSON.stringify({ error: 'missing_server_configuration' }), { status: 500 });
  }

  // Autenticação do webhook por segredo compartilhado (sempre exigida).
  const provided = req.headers.get('x-webhook-secret') || '';
  if (provided !== fnSecret) {
    return new Response(JSON.stringify({ error: 'invalid_secret' }), { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const table = String(payload?.table || '').trim();
  const record = payload?.record || {};
  const templateKey = EVENT_TEMPLATE[table];
  if (!templateKey) {
    return new Response(JSON.stringify({ error: 'unsupported_event', table }), { status: 400 });
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const empresaId = record.empresa_id ?? null;

  const logResult = async (fields: Record<string, unknown>) => {
    await admin.from('email_logs').insert({
      template_key: templateKey,
      event: table,
      empresa_id: empresaId,
      ...fields,
    });
  };

  // Resolve o e-mail do destinatário (vendedor; fallback: líder) pela tabela vendedores.
  const candidates = [record.vendedor, record.lider].filter(Boolean);
  let toEmail = '';
  let vendedorNome = String(record.vendedor || '');
  for (const nome of candidates) {
    const { data: vend } = await admin
      .from('vendedores')
      .select('nome, email')
      .eq('empresa_id', empresaId)
      .eq('nome', nome)
      .maybeSingle();
    if (vend?.email) {
      toEmail = vend.email;
      vendedorNome = vend.nome || vendedorNome;
      break;
    }
  }

  if (!toEmail) {
    await logResult({ to_email: null, status: 'skipped', error: 'destinatario_sem_email' });
    return new Response(JSON.stringify({ status: 'skipped', reason: 'no_recipient_email' }), { status: 200 });
  }

  const { data: template, error: templateError } = await admin
    .from('email_templates')
    .select('subject, html')
    .eq('key', templateKey)
    .maybeSingle();

  if (templateError || !template) {
    await logResult({ to_email: toEmail, status: 'failed', error: 'template_not_found' });
    return new Response(JSON.stringify({ error: 'template_not_found' }), { status: 404 });
  }

  const vars: Record<string, string> = {
    VendedorNome: vendedorNome,
    Cliente: String(record.cliente || ''),
    Administradora: String(record.administradora || ''),
    Produto: String(record.produto || ''),
    ValorCarta: formatBRL(record.valor_carta),
    DataVenda: formatDate(record.data_venda),
  };

  const subject = renderTemplate(template.subject, vars);
  const html = renderTemplate(template.html, vars);

  try {
    await sendViaResend(resendApiKey, emailFrom, toEmail, subject, html);
  } catch (err) {
    await logResult({ to_email: toEmail, subject, status: 'failed', error: String(err?.message || err) });
    return new Response(JSON.stringify({ error: 'send_failed', detail: String(err?.message || err) }), { status: 500 });
  }

  await logResult({ to_email: toEmail, subject, status: 'sent' });
  return new Response(JSON.stringify({ status: 'sent', to: toEmail }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
