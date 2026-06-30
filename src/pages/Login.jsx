import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hashPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, EyeOff, Lock, Mail, KeyRound, CheckCircle } from 'lucide-react';

const LOGIN_BUILD = 'auth-fix-2026-06-30-v4';

function normalizeEmail(value) {
  return String(value || '').toLowerCase().trim();
}

function getLoginErrorMessage(err) {
  const message = err?.message || err?.toString?.() || '';
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('failed to fetch')) {
    return 'Não foi possível conectar ao serviço de autenticação. Verifique a publicação do app/domínio e tente novamente.';
  }
  if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('401') || message.toLowerCase().includes('403')) {
    return 'O domínio publicado não está autorizado a consultar a base de usuários. Revise a configuração de acesso do app.';
  }
  return `Erro ao consultar usuários. Detalhe técnico: ${message || 'sem detalhe retornado'}`;
}

function getEmptyUsersMessage() {
  return 'A consulta de usuários não retornou registros. Isso normalmente indica restrição de leitura/RLS na entidade UsuarioAcesso ou build publicado apontando para outro ambiente. O usuário pode existir, mas o login público não está conseguindo ler a base.';
}

function generateTempPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letters = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  const specials = ['@', '#', '!', '$'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  return `Nvion${digits}${special}${letters}`;
}

function EsqueciSenhaDialog({ open, onOpenChange }) {
  const [step, setStep] = useState('form'); // 'form' | 'success'
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
      const emailNorm = normalizeEmail(emailInput);
      const todos = await base44.entities.UsuarioAcesso.list('-created_date');

      if (!Array.isArray(todos) || todos.length === 0) {
        setError(getEmptyUsersMessage());
        return;
      }

      const usuario = todos.find(u => normalizeEmail(u.email) === emailNorm) || null;

      if (!usuario) {
        setError('Email não encontrado em Gestão de Acessos. Verifique o endereço cadastrado ou contate o administrador.');
        return;
      }

      if (usuario.status === 'suspenso') {
        setError('Usuário suspenso. Entre em contato com o administrador.');
        return;
      }

      const novaSenha = generateTempPassword();
      const novaSenhaHash = await hashPassword(novaSenha);

      await base44.entities.UsuarioAcesso.update(usuario.id, {
        senha_hash: novaSenhaHash,
        senha_temporaria: novaSenha,
      });

      await base44.integrations.Core.SendEmail({
        to: usuario.email,
        subject: 'NVION CRM — Sua senha temporária',
        body: `Olá, ${usuario.display_name || usuario.email}!\n\nVocê solicitou a recuperação de senha no NVION CRM.\n\nSua senha temporária é:\n\n${novaSenha}\n\nUse-a para fazer login e troque a senha imediatamente em Meu Perfil.\n\nSe não foi você que solicitou, entre em contato com o administrador.\n\n— Equipe NVION`,
      });

      setStep('success');
    } catch (err) {
      console.error('Erro na recuperação de senha:', err);
      setError('Erro ao processar a solicitação. Tente novamente ou contate o administrador.');
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
              Informe seu email cadastrado. Enviaremos uma senha temporária para acesso.
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
                {isLoading ? 'Enviando...' : 'Enviar senha temporária'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4 space-y-4 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-semibold text-gray-900">Senha temporária enviada!</p>
              <p className="text-sm text-gray-500 mt-1">
                Verifique sua caixa de entrada em <strong>{emailInput}</strong> e use a senha temporária para fazer login.
              </p>
              <p className="text-xs text-gray-400 mt-2">Troque a senha imediatamente em Meu Perfil após o acesso.</p>
            </div>
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Login() {
  const { login } = useAuth();
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
      const hash = await hashPassword(password);
      const emailNorm = normalizeEmail(email);
      let todos = [];

      try {
        todos = await base44.entities.UsuarioAcesso.list('-created_date');
      } catch (listError) {
        setError(getLoginErrorMessage(listError));
        return;
      }

      if (!Array.isArray(todos) || todos.length === 0) {
        setError(getEmptyUsersMessage());
        return;
      }

      const usuario = todos.find((u) => normalizeEmail(u.email) === emailNorm) || null;

      if (!usuario) {
        setError('Usuário não encontrado em Gestão de Acessos. Confira o e-mail cadastrado no NVION CRM.');
        return;
      }

      if (usuario.status === 'suspenso') {
        setError('Usuário suspenso. Entre em contato com o administrador.');
        return;
      }

      if (!usuario.senha_hash) {
        setError('Usuário sem senha configurada. Gere uma nova senha em Gestão de Acessos.');
        return;
      }

      if (usuario.senha_hash !== hash) {
        setError('Senha incorreta. Confira a senha temporária gerada para este usuário.');
        return;
      }

      login(usuario);
    } catch (err) {
      setError(`Erro inesperado no login. Detalhe técnico: ${err?.message || err?.toString?.() || 'sem detalhe retornado'}`);
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

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

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