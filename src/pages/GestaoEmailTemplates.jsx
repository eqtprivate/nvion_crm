import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Save, Eye, History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Variáveis por categoria de template.
const VARIABLES_BY_CATEGORY = {
  auth: [
    { token: '{{ .ConfirmationURL }}', desc: 'Link de ação (redefinir/ativar/confirmar)' },
    { token: '{{ .Email }}', desc: 'E-mail do destinatário' },
    { token: '{{ .DisplayName }}', desc: 'Nome do usuário' },
    { token: '{{ .Token }}', desc: 'Código OTP' },
    { token: '{{ .SiteURL }}', desc: 'URL do sistema' },
  ],
  transactional: [
    { token: '{{ .VendedorNome }}', desc: 'Nome do vendedor' },
    { token: '{{ .Cliente }}', desc: 'Cliente da venda' },
    { token: '{{ .Administradora }}', desc: 'Administradora' },
    { token: '{{ .Produto }}', desc: 'Produto de consórcio' },
    { token: '{{ .ValorCarta }}', desc: 'Valor da carta (formatado)' },
    { token: '{{ .DataVenda }}', desc: 'Data da venda' },
  ],
};

const SAMPLE = {
  ConfirmationURL: 'https://nvion.base44.app/RedefinirSenha?token=exemplo',
  Email: 'usuario@empresa.com.br',
  DisplayName: 'Maria Silva',
  Token: '123456',
  SiteURL: 'https://nvion.base44.app',
  VendedorNome: 'João Souza',
  Cliente: 'Empresa Alfa Ltda',
  Administradora: 'Consórcio XPTO',
  Produto: 'Imóvel 200k',
  ValorCarta: 'R$ 200.000,00',
  DataVenda: '08/07/2026',
};

const CATEGORY_LABEL = { auth: 'Autenticação', transactional: 'Transacionais' };

const STATUS_BADGE = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  skipped: 'bg-slate-100 text-slate-600',
};
const STATUS_LABEL = { sent: 'Enviado', failed: 'Falhou', skipped: 'Ignorado' };

function renderPreview(html) {
  return String(html || '').replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_m, name) => SAMPLE[name] ?? '');
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function HistoricoTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: qErr } = await supabase
      .from('email_logs')
      .select('id, template_key, event, to_email, subject, status, error, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (qErr) setError(qErr.message);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Histórico de envios (últimos 100)</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 m-4">
            Erro ao carregar histórico: {error}
            <span className="block text-red-500 text-xs mt-1">Verifique se a migração de e-mails transacionais foi aplicada.</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Data/Hora</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Destinatário</th>
                <th className="px-4 py-3 font-medium">Assunto</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum e-mail enviado ainda.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{log.template_key || log.event || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-800">{log.to_email || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{log.subject || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={STATUS_BADGE[log.status] || 'bg-gray-100 text-gray-700'}>
                        {STATUS_LABEL[log.status] || log.status}
                      </Badge>
                      {log.status !== 'sent' && log.error && (
                        <span className="block text-[11px] text-gray-400 mt-0.5 max-w-xs truncate" title={log.error}>{log.error}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [draft, setDraft] = useState({ subject: '', html: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('key, label, subject, html, category, updated_at')
        .order('category')
        .order('label');
      if (!active) return;
      if (error) {
        toast.error('Erro ao carregar templates: ' + error.message);
      } else {
        setTemplates(data || []);
        if ((data || []).length > 0) setSelectedKey(data[0].key);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const selected = useMemo(() => templates.find((t) => t.key === selectedKey) || null, [templates, selectedKey]);
  const variables = VARIABLES_BY_CATEGORY[selected?.category] || VARIABLES_BY_CATEGORY.auth;

  const grouped = useMemo(() => {
    const map = {};
    for (const t of templates) {
      const cat = t.category || 'auth';
      (map[cat] = map[cat] || []).push(t);
    }
    return map;
  }, [templates]);

  useEffect(() => {
    if (selected) setDraft({ subject: selected.subject, html: selected.html });
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    if (!draft.subject.trim() || !draft.html.trim()) {
      toast.error('Assunto e corpo do e-mail são obrigatórios.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .update({ subject: draft.subject, html: draft.html })
      .eq('key', selected.key);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    setTemplates((prev) => prev.map((t) => (t.key === selected.key ? { ...t, ...draft } : t)));
    toast.success('Template salvo com sucesso.');
  };

  const insertVariable = (token) => setDraft((prev) => ({ ...prev, html: prev.html + token }));

  if (loading) return <p className="text-gray-400">Carregando…</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="space-y-1.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{CATEGORY_LABEL[cat] || cat}</p>
            {items.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedKey(t.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  t.key === selectedKey ? 'bg-primary text-white font-medium' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="lg:col-span-3 space-y-4">
        {selected && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{selected.label}</CardTitle>
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input id="subject" value={draft.subject} onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="html">Corpo (HTML)</Label>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {variables.map((v) => (
                        <button
                          key={v.token}
                          type="button"
                          title={v.desc}
                          onClick={() => insertVariable(v.token)}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 font-mono"
                        >
                          {v.token.replace(/\{\{\s*\.|\s*\}\}/g, '')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    id="html"
                    value={draft.html}
                    onChange={(e) => setDraft((p) => ({ ...p, html: e.target.value }))}
                    rows={12}
                    className="w-full font-mono text-xs border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" /> Preview (com dados de exemplo)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-2"><strong>Assunto:</strong> {renderPreview(draft.subject)}</p>
                <iframe title="preview" className="w-full h-80 border border-gray-200 rounded-lg bg-white" srcDoc={renderPreview(draft.html)} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function GestaoEmailTemplates() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [tab, setTab] = useState('templates');

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-gray-500">
          <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          Área restrita ao Super Admin.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" /> E-mails
        </h1>
        <p className="text-gray-500 mt-1">Templates de autenticação e transacionais, e histórico de envios.</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'templates' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Mail className="w-4 h-4 inline mr-1.5" /> Templates
        </button>
        <button
          type="button"
          onClick={() => setTab('historico')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'historico' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <History className="w-4 h-4 inline mr-1.5" /> Histórico de envios
        </button>
      </div>

      {tab === 'templates' ? <TemplatesTab /> : <HistoricoTab />}
    </div>
  );
}
