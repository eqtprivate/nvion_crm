import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hashPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

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
  return 'Erro ao consultar usuários. Tente novamente ou solicite suporte.';
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

      const usuario = Array.isArray(todos)
        ? todos.find((u) => normalizeEmail(u.email) === emailNorm)
        : null;

      if (!usuario) {
        setError('Usuário não encontrado. Confira o e-mail cadastrado.');
        return;
      }

      if (usuario.status !== 'ativo') {
        setError('Usuário encontrado, mas não está ativo. Ative o usuário em Gestão de Acessos.');
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
      setError('Erro inesperado no login. Recarregue a página e tente novamente.');
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
              <Label htmlFor="password">Senha</Label>
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
        </div>
      </div>
    </div>
  );
}
