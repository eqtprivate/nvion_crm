import React, { useState } from 'react';
import { supabase, assertSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Check, X, Eye, EyeOff } from 'lucide-react';
import { validatePassword, passwordChecklist } from '@/lib/passwordPolicy';

// Tela bloqueante exibida quando o perfil está marcado com must_change_password.
// O usuário precisa definir uma nova senha no padrão antes de acessar o sistema.
export default function ForcePasswordChange() {
  const { user, logout, refreshProfile } = useAuth();
  const [form, setForm] = useState({ nova: '', confirmar: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checklist = passwordChecklist(form.nova);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const check = validatePassword(form.nova);
    if (!check.ok) { setError(check.firstMessage || 'Senha fora do padrão.'); return; }
    if (form.nova !== form.confirmar) { setError('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      const client = assertSupabaseConfigured();
      const { error: pwErr } = await client.auth.updateUser({ password: form.nova });
      if (pwErr) throw pwErr;

      const { error: flagErr } = await client
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id);
      if (flagErr) throw flagErr;

      await refreshProfile();
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar a senha. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-gray-900">Atualize sua senha</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Por segurança, sua senha precisa ser atualizada para o novo padrão antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nova">Nova senha</Label>
            <div className="relative">
              <Input
                id="nova"
                type={show ? 'text' : 'password'}
                value={form.nova}
                onChange={(e) => setForm((p) => ({ ...p, nova: e.target.value }))}
                className="pr-10"
                autoFocus
              />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <ul className="space-y-1">
            {checklist.map((rule) => (
              <li key={rule.key} className={`flex items-center gap-2 text-xs ${rule.ok ? 'text-green-600' : 'text-gray-400'}`}>
                {rule.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {rule.label}
              </li>
            ))}
          </ul>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar nova senha</Label>
            <Input
              id="confirmar"
              type={show ? 'text' : 'password'}
              value={form.confirmar}
              onChange={(e) => setForm((p) => ({ ...p, confirmar: e.target.value }))}
            />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
          <button type="button" onClick={logout} className="w-full text-xs text-gray-400 hover:text-gray-600">Sair</button>
        </form>
      </div>
    </div>
  );
}
