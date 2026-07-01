import React, { useEffect, useMemo, useState } from 'react';
import { assertSupabaseConfigured } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Users,
  UserCheck,
  UserX,
  Clock,
  MoreVertical,
  Pencil,
  LayoutGrid,
  Building2,
  ChevronDown,
  ChevronRight,
  Mail,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KPICard from '@/components/shared/KPICard';
import ManageModulesDialog from '@/components/forms/ManageModulesDialog';
import { CpfCnpjInput } from '@/components/forms/MaskedInputs';
import { ROLE_LABELS, ROLE_MODULE_DEFAULTS } from '@/lib/modules';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin_empresa: 'bg-indigo-100 text-indigo-800',
  gestor_comercial: 'bg-blue-100 text-blue-800',
  lider_comercial: 'bg-cyan-100 text-cyan-800',
  gestor_financeiro: 'bg-emerald-100 text-emerald-800',
  vendedor: 'bg-gray-100 text-gray-800',
  analista_plataforma: 'bg-teal-100 text-teal-800',
};

const STATUS_COLORS = {
  ativo: 'bg-green-100 text-green-800',
  suspenso: 'bg-red-100 text-red-800',
  pendente: 'bg-yellow-100 text-yellow-800',
};

const EMPRESA_STATUS_COLORS = {
  ativa: 'bg-green-100 text-green-800',
  em_implantacao: 'bg-blue-100 text-blue-800',
  em_analise: 'bg-yellow-100 text-yellow-800',
  elegivel_para_credito: 'bg-cyan-100 text-cyan-800',
  suspensa: 'bg-red-100 text-red-800',
  inativa: 'bg-gray-100 text-gray-800',
};

const ALL_ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getEmpresaNome(empresa) {
  return empresa?.nome || empresa?.razao_social || empresa?.nome_fantasia || '';
}

async function fetchEmpresas() {
  const supabase = assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nome, cnpj, status, plano, created_at, updated_at')
    .order('nome', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchProfilesWithModules() {
  const supabase = assertSupabaseConfigured();
  const [{ data: profiles, error: profilesError }, { data: modules, error: modulesError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, email, empresa_id, empresa_vinculada, role, status, profile_picture, created_at, updated_at')
      .order('display_name', { ascending: true }),
    supabase
      .from('user_modules')
      .select('user_id, module_key, enabled')
      .eq('enabled', true),
  ]);

  if (profilesError) throw profilesError;
  if (modulesError) throw modulesError;

  const modulesByUser = new Map();
  (modules || []).forEach((row) => {
    if (!modulesByUser.has(row.user_id)) modulesByUser.set(row.user_id, []);
    modulesByUser.get(row.user_id).push(row.module_key);
  });

  return (profiles || []).map((profile) => ({
    ...profile,
    modulos_permitidos: modulesByUser.get(profile.id) || [],
  }));
}

function TemporaryPasswordDialog({ open, onOpenChange, payload }) {
  const [copied, setCopied] = useState(false);
  const isReset = payload?.mode === 'reset';

  const handleCopy = async () => {
    if (!payload?.temporary_password) return;
    await navigator.clipboard.writeText(payload.temporary_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            {isReset ? 'Nova senha temporária' : 'Acesso criado'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            {isReset ? (
              <>Nova senha temporária gerada para <strong>{payload?.display_name}</strong>.</>
            ) : (
              <>Usuário <strong>{payload?.display_name}</strong> criado no Supabase Auth e no perfil operacional do NVION.</>
            )}
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm">
            Copie a senha temporária agora. Ela é exibida apenas nesta confirmação.
          </div>
          <div className="flex items-center gap-2">
            <Input value={payload?.temporary_password || ''} readOnly className="font-mono text-base tracking-wider" />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Oriente o usuário a acessar o NVION com esta senha e depois alterar a senha no perfil.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({ open, onOpenChange, profile, onSubmit, isLoading, empresas, empresaAtual, isSuperAdmin }) {
  const roles = isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter((role) => role.value !== 'super_admin');
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    role: 'vendedor',
    status: 'ativo',
    empresa_id: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        email: profile.email || '',
        role: profile.role || 'vendedor',
        status: profile.status || 'ativo',
        empresa_id: profile.empresa_id || '',
      });
    } else {
      const defaultEmpresa = isSuperAdmin ? '' : (empresaAtual?.id || '');
      setForm({
        display_name: '',
        email: '',
        role: 'vendedor',
        status: 'ativo',
        empresa_id: defaultEmpresa,
      });
    }
  }, [profile, open, isSuperAdmin, empresaAtual]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const selectedEmpresa = empresas.find((empresa) => empresa.id === form.empresa_id);
    onSubmit({
      ...form,
      email: normalizeEmail(form.email),
      empresa_vinculada: getEmpresaNome(selectedEmpresa) || empresaAtual?.nome || empresaAtual?.empresa_vinculada || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{profile ? 'Editar Perfil de Acesso' : 'Novo Acesso'}</DialogTitle>
        </DialogHeader>

        {!profile && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              O app criará o usuário no <strong>Supabase Auth</strong>, criará o perfil operacional e liberará os módulos padrão do perfil selecionado.
            </p>
          </div>
        )}

        {profile && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
            UID Supabase: <span className="font-mono">{profile.id}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome de Exibição *</Label>
            <Input
              value={form.display_name}
              required
              onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              required
              disabled={Boolean(profile)}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            {profile && <p className="text-xs text-gray-400">Para alterar e-mail de autenticação, use o painel do Supabase Auth.</p>}
          </div>

          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={form.empresa_id} onValueChange={(value) => setForm((prev) => ({ ...prev, empresa_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>{getEmpresaNome(empresa)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : profile ? 'Salvar Alterações' : 'Criar Acesso'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmpresaDialog({ open, onOpenChange, empresa, onSubmit, isLoading }) {
  const [form, setForm] = useState({ nome: '', cnpj: '', status: 'ativa', plano: 'mvp' });

  useEffect(() => {
    if (empresa) {
      setForm({
        nome: empresa.nome || '',
        cnpj: empresa.cnpj || '',
        status: empresa.status || 'ativa',
        plano: empresa.plano || 'mvp',
      });
    } else {
      setForm({ nome: '', cnpj: '', status: 'ativa', plano: 'mvp' });
    }
  }, [empresa, open]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{empresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.nome} required onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <CpfCnpjInput value={form.cnpj} onChange={(value) => setForm((prev) => ({ ...prev, cnpj: value }))} />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Input value={form.plano} onChange={(event) => setForm((prev) => ({ ...prev, plano: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="em_implantacao">Em implantação</SelectItem>
                <SelectItem value="em_analise">Em análise</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : empresa ? 'Salvar' : 'Criar Empresa'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsuariosTab({ isSuperAdmin, empresaAtual, todosUsuarios, empresas, isLoading, currentUser }) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [createdAccess, setCreatedAccess] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [empresaFiltro, setEmpresaFiltro] = useState('all');
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState(null);

  const currentEmpresaNome = currentUser?.empresa_vinculada;

  const canManage = (target) => {
    if (!target) return false;
    if (isSuperAdmin) return true;
    if (target.role === 'super_admin') return false;
    return target.empresa_id === currentUser?.empresa_id || target.empresa_vinculada === currentEmpresaNome;
  };

  const usuarios = useMemo(() => {
    const base = isSuperAdmin
      ? todosUsuarios
      : todosUsuarios.filter((usuario) => usuario.role !== 'super_admin' && (usuario.empresa_id === currentUser?.empresa_id || usuario.empresa_vinculada === currentEmpresaNome));
    if (isSuperAdmin && empresaFiltro !== 'all') return base.filter((usuario) => usuario.empresa_id === empresaFiltro);
    return base;
  }, [todosUsuarios, isSuperAdmin, currentUser?.empresa_id, currentEmpresaNome, empresaFiltro]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const supabase = assertSupabaseConfigured();
      const selectedEmpresa = empresas.find((empresa) => empresa.id === data.empresa_id) || empresaAtual;
      const modules = ROLE_MODULE_DEFAULTS[data.role] || [];
      const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          display_name: data.display_name,
          email: data.email,
          role: data.role,
          status: data.status || 'ativo',
          empresa_id: data.empresa_id || selectedEmpresa?.id || currentUser?.empresa_id || null,
          empresa_vinculada: data.empresa_vinculada || getEmpresaNome(selectedEmpresa) || currentEmpresaNome,
          modules,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.detail || result.error);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supabaseProfiles'] });
      setCreateDialogOpen(false);
      setCreatedAccess({
        display_name: result?.display_name,
        email: result?.email,
        temporary_password: result?.temporary_password,
      });
      setPasswordDialogOpen(true);
      toast.success('Acesso criado com sucesso.');
    },
    onError: (error) => {
      console.error('Erro ao criar acesso:', error);
      toast.error(`Erro ao criar acesso: ${error?.message || 'verifique Edge Function e permissões'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const supabase = assertSupabaseConfigured();
      const selectedEmpresa = empresas.find((empresa) => empresa.id === data.empresa_id);
      const { error } = await supabase.from('profiles').update({
        display_name: data.display_name,
        role: data.role,
        status: data.status,
        empresa_id: data.empresa_id || null,
        empresa_vinculada: data.empresa_vinculada || getEmpresaNome(selectedEmpresa) || data.empresa_vinculada || '',
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabaseProfiles'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast.success('Perfil atualizado.');
    },
    onError: (error) => toast.error(`Erro ao atualizar perfil: ${error?.message || 'sem detalhe'}`),
  });

  const modulesMutation = useMutation({
    mutationFn: async ({ id, modules }) => {
      const supabase = assertSupabaseConfigured();
      const { error: deleteError } = await supabase.from('user_modules').delete().eq('user_id', id);
      if (deleteError) throw deleteError;

      if (modules.length > 0) {
        const { error: insertError } = await supabase.from('user_modules').insert(
          modules.map((moduleKey) => ({ user_id: id, module_key: moduleKey, enabled: true }))
        );
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabaseProfiles'] });
      setModulesDialogOpen(false);
      setSelectedUser(null);
      toast.success('Módulos atualizados.');
    },
    onError: (error) => toast.error(`Erro ao atualizar módulos: ${error?.message || 'sem detalhe'}`),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabaseProfiles'] });
      toast.success('Status atualizado.');
    },
    onError: (error) => toast.error(`Erro ao alterar status: ${error?.message || 'sem detalhe'}`),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (target) => {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.auth.resetPasswordForEmail(target.email, { redirectTo: window.location.origin });
      if (error) throw error;
    },
    onSuccess: () => toast.success('E-mail de recuperação enviado pelo Supabase Auth.'),
    onError: (error) => toast.error(`Erro ao enviar recuperação: ${error?.message || 'sem detalhe'}`),
  });

  const resetTemporaryPasswordMutation = useMutation({
    mutationFn: async (target) => {
      const supabase = assertSupabaseConfigured();
      const { data: result, error } = await supabase.functions.invoke('admin-reset-temp-password', {
        body: { user_id: target.id },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.detail || result.error);
      return result;
    },
    onMutate: (target) => {
      setResettingPasswordUserId(target.id);
      return { toastId: toast.loading(`Gerando senha temporária para ${target.display_name || target.email}...`) };
    },
    onSuccess: (result, _target, context) => {
      setCreatedAccess({
        mode: 'reset',
        display_name: result?.display_name,
        email: result?.email,
        temporary_password: result?.temporary_password,
      });
      setPasswordDialogOpen(true);
      toast.success('Nova senha temporária gerada.', { id: context?.toastId });
    },
    onError: (error, _target, context) => {
      console.error('Erro ao gerar senha temporária:', error);
      toast.error(`Erro ao gerar senha temporária: ${error?.message || 'sem detalhe'}`, { id: context?.toastId });
    },
    onSettled: () => setResettingPasswordUserId(null),
  });

  const toggleStatus = (target) => {
    if (target.id === currentUser?.id) {
      toast.error('Você não pode suspender o próprio usuário logado.');
      return;
    }
    statusMutation.mutate({ id: target.id, status: target.status === 'ativo' ? 'suspenso' : 'ativo' });
  };

  const kpis = useMemo(() => ({
    total: usuarios.length,
    ativos: usuarios.filter((usuario) => usuario.status === 'ativo').length,
    suspensos: usuarios.filter((usuario) => usuario.status === 'suspenso').length,
    pendentes: usuarios.filter((usuario) => usuario.status === 'pendente').length,
  }), [usuarios]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 text-sm">
        <strong>Modelo Supabase:</strong> esta tela cria usuários no Supabase Auth por Edge Function e administra perfil, status, empresa e módulos em <code>public.profiles</code> e <code>public.user_modules</code>.
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <select
              value={empresaFiltro}
              onChange={(event) => setEmpresaFiltro(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">Todas as empresas</option>
              {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{getEmpresaNome(empresa)}</option>)}
            </select>
          )}
        </div>
        <Button className="bg-primary hover:bg-primary-dark" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Novo Acesso
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total" value={kpis.total} icon={Users} iconColor="bg-blue-500" />
        <KPICard title="Ativos" value={kpis.ativos} icon={UserCheck} iconColor="bg-green-500" />
        <KPICard title="Suspensos" value={kpis.suspensos} icon={UserX} iconColor="bg-red-500" />
        <KPICard title="Pendentes" value={kpis.pendentes} icon={Clock} iconColor="bg-yellow-500" />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                {isSuperAdmin && <TableHead>Empresa</TableHead>}
                <TableHead>Módulos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-12 text-gray-500">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow><TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-12 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhum perfil encontrado
                </TableCell></TableRow>
              ) : (
                usuarios.map((target) => (
                  <TableRow key={target.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{target.display_name}</span>
                        <span className="text-sm text-gray-500">{target.email}</span>
                        <span className="text-[11px] text-gray-300 font-mono">{target.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[target.role] || 'bg-gray-100 text-gray-800'}>{ROLE_LABELS[target.role] || target.role}</Badge>
                    </TableCell>
                    {isSuperAdmin && <TableCell className="text-sm text-gray-600">{target.empresa_vinculada || '-'}</TableCell>}
                    <TableCell className="text-sm text-gray-600">{target.modulos_permitidos?.length || 0} módulos</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[target.status] || 'bg-gray-100 text-gray-800'}>{target.status}</Badge></TableCell>
                    <TableCell>
                      {canManage(target) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedUser(target); setEditDialogOpen(true); }}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedUser(target); setModulesDialogOpen(true); }}>
                              <LayoutGrid className="w-4 h-4 mr-2" /> Gerenciar Módulos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => resetPasswordMutation.mutate(target)}>
                              <Mail className="w-4 h-4 mr-2" /> Enviar recuperação de senha
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => resetTemporaryPasswordMutation.mutate(target)} disabled={target.id === currentUser?.id || resetTemporaryPasswordMutation.isPending}>
                              {resettingPasswordUserId === target.id
                                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                : <KeyRound className="w-4 h-4 mr-2" />}
                              {resettingPasswordUserId === target.id ? 'Gerando...' : 'Gerar senha temporária'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(target)} disabled={target.id === currentUser?.id}>
                              {target.status === 'ativo'
                                ? <><UserX className="w-4 h-4 mr-2" /> Suspender</>
                                : <><UserCheck className="w-4 h-4 mr-2" /> Ativar</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-30 cursor-not-allowed" disabled><MoreVertical className="w-4 h-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ProfileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        empresas={empresas}
        empresaAtual={empresaAtual}
        isSuperAdmin={isSuperAdmin}
      />
      <ProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={selectedUser}
        onSubmit={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
        isLoading={updateMutation.isPending}
        empresas={empresas}
        empresaAtual={empresaAtual}
        isSuperAdmin={isSuperAdmin}
      />
      <ManageModulesDialog
        open={modulesDialogOpen}
        onOpenChange={setModulesDialogOpen}
        user={selectedUser}
        onSubmit={(data) => modulesMutation.mutate({ id: selectedUser.id, modules: data.modulos_permitidos || [] })}
        isLoading={modulesMutation.isPending}
      />
      <TemporaryPasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} payload={createdAccess} />
    </div>
  );
}

function EmpresasTab({ todosUsuarios, empresas, isLoading }) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [expandedEmpresa, setExpandedEmpresa] = useState(null);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.from('empresas').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supabaseEmpresas'] }); setCreateDialogOpen(false); toast.success('Empresa criada.'); },
    onError: (error) => toast.error(`Erro ao criar empresa: ${error?.message || 'sem detalhe'}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.from('empresas').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supabaseEmpresas'] }); queryClient.invalidateQueries({ queryKey: ['supabaseProfiles'] }); setEditDialogOpen(false); setSelectedEmpresa(null); toast.success('Empresa atualizada.'); },
    onError: (error) => toast.error(`Erro ao atualizar empresa: ${error?.message || 'sem detalhe'}`),
  });

  const getUsersForEmpresa = (empresa) => todosUsuarios.filter((usuario) => usuario.empresa_id === empresa.id || usuario.empresa_vinculada === getEmpresaNome(empresa));

  const kpis = useMemo(() => ({
    total: empresas.length,
    ativas: empresas.filter((empresa) => empresa.status === 'ativa').length,
    implantacao: empresas.filter((empresa) => empresa.status === 'em_implantacao').length,
    totalUsuarios: todosUsuarios.length,
  }), [empresas, todosUsuarios]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button className="bg-primary hover:bg-primary-dark" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Nova Empresa
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total" value={kpis.total} icon={Building2} iconColor="bg-blue-500" />
        <KPICard title="Ativas" value={kpis.ativas} icon={UserCheck} iconColor="bg-green-500" />
        <KPICard title="Implantação" value={kpis.implantacao} icon={Clock} iconColor="bg-yellow-500" />
        <KPICard title="Perfis" value={kpis.totalUsuarios} icon={Users} iconColor="bg-purple-500" />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Carregando empresas...
          </div>
        ) : empresas.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            Nenhuma empresa cadastrada
          </div>
        ) : (
          empresas.map((empresa) => {
            const users = getUsersForEmpresa(empresa);
            const isExpanded = expandedEmpresa === empresa.id;
            return (
              <div key={empresa.id}>
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedEmpresa(isExpanded ? null : empresa.id)}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">{getEmpresaNome(empresa)}</p>
                      <p className="text-xs text-gray-500">{empresa.cnpj || empresa.plano || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 hidden sm:inline">{users.length} perfil(is)</span>
                    <Badge className={EMPRESA_STATUS_COLORS[empresa.status] || 'bg-gray-100 text-gray-800'} onClick={(event) => event.stopPropagation()}>{empresa.status?.replace(/_/g, ' ')}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(event) => { event.stopPropagation(); setSelectedEmpresa(empresa); setEditDialogOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-3">Perfis vinculados</p>
                    {users.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nenhum perfil vinculado a esta empresa.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {users.map((profile) => (
                          <div key={profile.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{profile.display_name?.charAt(0)?.toUpperCase()}</div>
                              <div>
                                <p className="text-sm font-medium">{profile.display_name}</p>
                                <p className="text-xs text-gray-500">{profile.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${ROLE_COLORS[profile.role] || 'bg-gray-100 text-gray-800'}`}>{ROLE_LABELS[profile.role] || profile.role}</Badge>
                              <Badge className={`text-xs ${STATUS_COLORS[profile.status] || 'bg-gray-100 text-gray-800'}`}>{profile.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <EmpresaDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      <EmpresaDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} empresa={selectedEmpresa} onSubmit={(data) => updateMutation.mutate({ id: selectedEmpresa.id, data })} isLoading={updateMutation.isPending} />
    </div>
  );
}

export default function GestaoAcessos() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data: empresas = [], isLoading: isLoadingEmpresas } = useQuery({
    queryKey: ['supabaseEmpresas'],
    queryFn: fetchEmpresas,
  });

  const { data: todosUsuarios = [], isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ['supabaseProfiles'],
    queryFn: fetchProfilesWithModules,
  });

  const empresaAtual = useMemo(() => {
    return empresas.find((empresa) => empresa.id === currentUser?.empresa_id)
      || empresas.find((empresa) => getEmpresaNome(empresa) === currentUser?.empresa_vinculada)
      || null;
  }, [empresas, currentUser?.empresa_id, currentUser?.empresa_vinculada]);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestão de Acessos</h1>
        <p className="text-gray-500 mt-1">Crie acessos, gerencie perfis, módulos e empresas usando Supabase</p>
      </div>

      {isSuperAdmin ? (
        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="bg-white border h-auto">
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"><Users className="w-4 h-4 mr-2" />Usuários</TabsTrigger>
            <TabsTrigger value="empresas" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"><Building2 className="w-4 h-4 mr-2" />Empresas</TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios">
            <UsuariosTab isSuperAdmin={isSuperAdmin} empresaAtual={empresaAtual} empresas={empresas} todosUsuarios={todosUsuarios} isLoading={isLoadingUsuarios || isLoadingEmpresas} currentUser={currentUser} />
          </TabsContent>
          <TabsContent value="empresas">
            <EmpresasTab todosUsuarios={todosUsuarios} empresas={empresas} isLoading={isLoadingEmpresas} />
          </TabsContent>
        </Tabs>
      ) : (
        <UsuariosTab isSuperAdmin={false} empresaAtual={empresaAtual} empresas={empresas} todosUsuarios={todosUsuarios} isLoading={isLoadingUsuarios || isLoadingEmpresas} currentUser={currentUser} />
      )}
    </div>
  );
}
