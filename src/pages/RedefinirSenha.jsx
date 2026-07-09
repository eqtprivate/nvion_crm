import React, { useEffect, useState } from 'react';
import { supabase, assertSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { validatePassword } from '@/lib/passwordPolicy';

export default function RedefinirSenha() {
  const [isRecovery, setIsRecovery] = useState(false);
  const [form, setForm] = useState({ nova: '', confirmar: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase emite PASSWORD_RECOVERY ao processar o link do e-mail de recuperação.
    if (!supabase) return undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    // Fallback: hash de recovery ainda presente na URL.
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const check = validatePassword(form.nova);
    if (!check.ok) {
      setError(check.firstMessage || 'Senha fora do padrão exigido.');
      return;
    }
    if (form.nova !== form.confirmar) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const client = assertSupabaseConfigured();
      const { error: updateError } = await client.auth.updateUser({ password: form.nova });
      if (updateError) throw updateError;
      setDone(true);
      setForm({ nova: '', confirmar: '' });
    } catch (err) {
      setError(err?.message || 'Não foi possível redefinir a senha. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-card rounded-2xl shadow-lg border border-gray-100 dark:border-border p-8">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Redefinir Senha</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {isRecovery
              ? 'Link de recuperação válido. Defina sua nova senha de acesso.'
              : 'Defina uma nova senha para sua conta.'}
          </p>

          {done ? (
            <div className="py-4 space-y-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-semibold text-gray-900 dark:text-gray-100">Senha redefinida com sucesso</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Use a nova senha para acessar o sistema.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nova">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="nova"
                    type={show ? 'text' : 'password'}
                    value={form.nova}
                    onChange={(e) => setForm((prev) => ({ ...prev, nova: e.target.value }))}
                    placeholder="Mín. 8: maiúscula, minúscula, número e especial"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-300">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmar">Confirmar nova senha</Label>
                <Input
                  id="confirmar"
                  type={show ? 'text' : 'password'}
                  value={form.confirmar}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmar: e.target.value }))}
                  placeholder="Repita a nova senha"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
