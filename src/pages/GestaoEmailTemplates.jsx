import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

const VARIABLES = [
  { token: '{{ .ConfirmationURL }}', desc: 'Link de ação (redefinir/ativar/confirmar)' },
  { token: '{{ .Email }}', desc: 'E-mail do destinatário' },
  { token: '{{ .DisplayName }}', desc: 'Nome do usuário (quando disponível)' },
  { token: '{{ .Token }}', desc: 'Código OTP (alternativa ao link)' },
  { token: '{{ .SiteURL }}', desc: 'URL do sistema' },
];

const SAMPLE = {
  ConfirmationURL: 'https://nvion.base44.app/RedefinirSenha?token=exemplo',
  Email: 'usuario@empresa.com.br',
  DisplayName: 'Maria Silva',
  Token: '123456',
  SiteURL: 'https://nvion.base44.app',
};

function renderPreview(html) {
  return String(html || '').replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_m, name) => SAMPLE[name] ?? '');
}

export default function GestaoEmailTemplates() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [templates, setTemplates] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [draft, setDraft] = useState({ subject: '', html: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) { setLoading(false); return; }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('key, label, subject, html, updated_at')
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
  }, [isSuperAdmin]);

  const selected = useMemo(() => templates.find((t) => t.key === selectedKey) || null, [templates, selectedKey]);

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
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    setTemplates((prev) => prev.map((t) => (t.key === selected.key ? { ...t, ...draft } : t)));
    toast.success('Template salvo com sucesso.');
  };

  const insertVariable = (token) => {
    setDraft((prev) => ({ ...prev, html: prev.html + token }));
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            Área restrita ao Super Admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" /> Templates de E-mail
        </h1>
        <p className="text-gray-500 mt-1">
          Personalize os e-mails de autenticação enviados pelo Resend (recuperação, convite, confirmação).
        </p>
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lista */}
          <div className="space-y-1.5">
            {templates.map((t) => (
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

          {/* Editor + Preview */}
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
                      <Input
                        id="subject"
                        value={draft.subject}
                        onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="html">Corpo (HTML)</Label>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {VARIABLES.map((v) => (
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
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Preview (com dados de exemplo)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500 mb-2"><strong>Assunto:</strong> {renderPreview(draft.subject)}</p>
                    <iframe
                      title="preview"
                      className="w-full h-80 border border-gray-200 rounded-lg bg-white"
                      srcDoc={renderPreview(draft.html)}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
