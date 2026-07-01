import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Camera, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { assertSupabaseConfigured } from '@/lib/supabaseClient';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    display_name: user?.display_name || user?.full_name || '',
    profile_picture: user?.profile_picture || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ nova: '', confirmar: '' });
  const [senhaLoading, setSenhaLoading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_picture: file_url }));
      toast.success('Foto enviada com sucesso');
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const changes = {
        display_name: formData.display_name.trim(),
        profile_picture: formData.profile_picture,
      };
      await updateUser(changes);
      toast.success('Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error?.message || 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSenhaSubmit = async (e) => {
    e.preventDefault();
    if (!senhaForm.nova || senhaForm.nova.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (senhaForm.nova !== senhaForm.confirmar) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSenhaLoading(true);
    try {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.auth.updateUser({ password: senhaForm.nova });
      if (error) throw error;
      setSenhaForm({ nova: '', confirmar: '' });
      toast.success('Senha alterada com sucesso');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error?.message || 'Erro ao alterar senha');
    } finally {
      setSenhaLoading(false);
    }
  };

  if (!user) {
    return <div className="p-4 sm:p-8"><div className="max-w-4xl mx-auto"><div className="text-center py-12">Carregando...</div></div></div>;
  }

  const displayName = formData.display_name || user.email || 'Usuário';

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 mt-1">Gerencie suas informações de acesso e identificação no NVION CRM</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card>
              <CardHeader><CardTitle>Informações Pessoais</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Foto do Perfil</Label>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                          {formData.profile_picture
                            ? <img src={formData.profile_picture} alt="Perfil" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-blue-100 flex items-center justify-center"><User className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" /></div>
                          }
                        </Avatar>
                        <div className="flex-1 w-full">
                          <input type="file" id="photo-upload" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                          <Button type="button" variant="outline" onClick={() => document.getElementById('photo-upload').click()} disabled={uploading} className="w-full sm:w-auto">
                            {uploading ? 'Enviando...' : <><Camera className="w-4 h-4 mr-2" />Enviar Foto</>}
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">JPG, PNG ou GIF. Máximo 5MB.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="display_name">Nome Completo</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="Informe seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={user.email} disabled className="bg-gray-50" />
                      <p className="text-xs text-gray-500">O email não pode ser alterado nesta tela.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Perfil de Acesso</Label>
                      <Input id="role" value={user.role} disabled className="bg-gray-50 capitalize" />
                    </div>

                    <div className="pt-4">
                      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />Alterar Senha</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSenhaSubmit} className="space-y-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    A senha é gerenciada pelo Supabase Auth. Após alterar, use a nova senha no próximo login.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha_nova">Nova Senha</Label>
                    <Input
                      id="senha_nova"
                      type="password"
                      value={senhaForm.nova}
                      onChange={(e) => setSenhaForm(prev => ({ ...prev, nova: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha_confirmar">Confirmar Nova Senha</Label>
                    <Input
                      id="senha_confirmar"
                      type="password"
                      value={senhaForm.confirmar}
                      onChange={(e) => setSenhaForm(prev => ({ ...prev, confirmar: e.target.value }))}
                      placeholder="Repita a nova senha"
                      required
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" variant="outline" disabled={senhaLoading} className="w-full sm:w-auto">
                      {senhaLoading ? 'Alterando...' : 'Alterar Senha'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-20 h-20 mb-4">
                    {formData.profile_picture
                      ? <img src={formData.profile_picture} alt="Perfil" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-white font-semibold text-xl">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                    }
                  </Avatar>
                  <h3 className="font-semibold text-lg">{displayName}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <Badge className="mt-2 capitalize">{user.role}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Tipo de Conta</p>
                    <p className="font-semibold capitalize truncate">{user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Email Verificado</p>
                    <p className="font-semibold">Sim</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Segurança</p>
                    <p className="font-semibold">Supabase Auth</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
