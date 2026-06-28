import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hashPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

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
      const emailNorm = email.toLowerCase().trim();
      const todos = await base44.entities.UsuarioAcesso.list();
      const usuario = todos.find(u => u.email === emailNorm && u.status === 'ativo');

      if (!usuario) {
        setError('Usuário não encontrado ou inativo.');
        return;
      }

      if (usuario.senha_hash !== hash) {
        setError('Senha incorreta.');
        return;
      }

      login(usuario);
    } catch (err) {
      setError('Erro ao tentar fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-8">
            <img src="https://media.base44.com/images/public/6a408d646f21968247407e53/b0d5da66e_nvion_logo_white.png"

            alt="Nvision"
            className="h-12 w-auto" />
            
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Bem-vindo</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10" />
                
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10" />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error &&
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            }

            <Button type="submit" className="w-full bg-primary hover:bg-primary-dark" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Nvision CRM &copy; {new Date().getFullYear()} — Acesso restrito
          </p>
        </div>
      </div>
    </div>);

}