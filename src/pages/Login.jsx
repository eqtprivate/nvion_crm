import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { assertSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, EyeOff, Lock, Mail, KeyRound, CheckCircle } from 'lucide-react';

const LOGIN_BUILD = 'supabase-auth-2026-06-30-v1';

function normalizeEmail(value) {
  return String(value || '').toLowerCase().trim();
}

function getFriendlyLoginError(err) {
  const message = err?.message || err?.toString?.() || '';
  const lower = message.toLowerCase();

  if (lower.includes('supabase não configurado') || lower.includes('vite_supabase')) {
    return 'Supabase não configurado no ambiente do build. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY e publique novamente.';
  }

  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos. Confirme o usuário criado no Supabase Auth.';
  }

  if (lower.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado no Supabase Auth. Confirme o usuário ou marque o e-mail como confirmado.';
  }

  if (lower.includes('perfil operacional')) {
    return 'Login autenticado no Supabase, mas o perfil operacional não foi encontrado ou não está ativo em public.profiles.';
  }

  return message || 'Erro ao autenticar. Tente novamente.';
}

function EsqueciSenhaDialog({ open, onOpenChange }) {
  const [step, setStep] = useState('form');
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setStep('form'); setEmailInput(''); setError(''); }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const client = assertSupabaseConfigured();
      const emailNorm = normalizeEmail(emailInput);
      const { error: resetError } = await client.auth.resetPasswordForEmail(emailNorm, {
        redirectTo: window.location.origin,
      });

      if (resetError) throw resetError;
      setStep('success');
    } catch (err) {
      setError(getFriendlyLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Recuperar Senha
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Informe seu email cadastrado no Supabase Auth. Enviaremos o link de recuperação de senha.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="recovery-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="recovery-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10"
                />
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar link'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4 space-y-4 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-semibold text-gray-900">Solicitação enviada</p>
              <p className="text-sm text-gray-500 mt-1">
                Verifique sua caixa de entrada em <strong>{emailInput}</strong> e siga as instruções do Supabase Auth.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Login() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [esqueciOpen, setEsqueciOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(normalizeEmail(email), password);
    } catch (err) {
      setError(getFriendlyLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-8">
            <img src="https://media.base44.com/images/public/6a408d646f21968247407e53/b0d5da66e_nvion_logo_white.png" alt="NVION" className="h-12 w-auto" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Bem-vindo</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => setEsqueciOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {(error || authError) && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error || authError}</div>}

            <Button type="submit" className="w-full bg-primary hover:bg-primary-dark" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">NVION CRM &copy; {new Date().getFullYear()} — Acesso restrito</p>
          <p className="text-[10px] text-gray-300 text-center mt-2">{LOGIN_BUILD}</p>
        </div>
      </div>

      <EsqueciSenhaDialog open={esqueciOpen} onOpenChange={setEsqueciOpen} />
    </div>
  );
}
