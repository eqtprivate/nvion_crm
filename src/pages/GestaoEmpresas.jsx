import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Eye, Pencil, Plus, Users } from 'lucide-react';
import { assertSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import KPICard from '@/components/shared/KPICard';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CpfCnpjInput } from '@/components/forms/MaskedInputs';

const STATUS_OPTIONS = ['ativa', 'em_implantacao', 'em_analise', 'suspensa', 'inativa'];
const PLAN_OPTIONS = ['mvp', 'starter', 'business', 'enterprise', 'interno'];

const PLAN_LABELS = {
  mvp: 'MVP',
  starter: 'Starter',
  business: 'Business',
  enterprise: 'Enterprise',
  interno: 'Interno',
};

const STATUS_LABELS = {
  ativa: 'Ativa',
  em_implantacao: 'Em implantação',
  em_analise: 'Em análise',
  suspensa: 'Suspensa',
  inativa: 'Inativa',
};

const STATUS_STYLES = {
  ativa: 'bg-green-100 text-green-800',
  em_implantacao: 'bg-blue-100 text-blue-800',
  em_analise: 'bg-yellow-100 text-yellow-800',
  suspensa: 'bg-orange-100 text-orange-800',
  inativa: 'bg-gray-100 text-gray-700',
};

const emptyForm = {
  nome: '',
  cnpj: '',
  status: 'ativa',
  plano: 'starter',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeEmpresaPayload(form, canManageRestrictedFields) {
  const payload = {
    nome: String(form.nome || '').trim(),
    cnpj: String(form.cnpj || '').trim() || null,
  };

  if (canManageRestrictedFields) {
    payload.status = form.status;
    payload.plano = form.plano;
  }

  return payload;
}

function EmpresaDialog({ open, onOpenChange, empresa, role, onSubmit, loading }) {
  const isSuperAdmin = role === 'super_admin';
  const [form, setForm] = useState(emptyForm);

  React.useEffect(() => {
    setForm(empresa ? {
      nome: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      status: empresa.status || 'ativa',
      plano: empresa.plano || 'starter',
    } : emptyForm);
  }, [empresa, open]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const planOptions = useMemo(() => {
    if (!form.plano || PLAN_OPTIONS.includes(form.plano)) return PLAN_OPTIONS;
    return [form.plano, ...PLAN_OPTIONS];
  }, [form.plano]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome da empresa.');
      return;
    }
    onSubmit(normalizeEmpresaPayload(form, isSuperAdmin));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{empresa ? 'Editar empresa' : 'Nova empresa'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(event) => set('nome', event.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <CpfCnpjInput value={form.cnpj} onChange={(value) => set('cnpj', value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              {isSuperAdmin ? (
                <Select value={form.status} onValueChange={(value) => set('status', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={STATUS_LABELS[form.status] || form.status || '-'} readOnly className="bg-gray-50" />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Plano</Label>
              {isSuperAdmin ? (
                <Select value={form.plano} onValueChange={(value) => set('plano', value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                  <SelectContent>
                    {planOptions.map((plan) => (
                      <SelectItem key={plan} value={plan}>{PLAN_LABELS[plan] || plan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={PLAN_LABELS[form.plano] || form.plano || '-'} readOnly className="bg-gray-50" />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersDialog({ open, onOpenChange, empresa, users }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Usuários vinculados</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Empresa: <span className="font-medium text-gray-900">{empresa?.nome || '-'}</span>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Nenhum usuário vinculado a esta empresa.
                    </TableCell>
                  </TableRow>
                ) : users.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.display_name || '-'}</TableCell>
                    <TableCell>{profile.email || '-'}</TableCell>
                    <TableCell>{profile.role || '-'}</TableCell>
                    <TableCell>{profile.status || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GestaoEmpresas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdminEmpresa = user?.role === 'admin_empresa';
  const allowedByRole = isSuperAdmin || isAdminEmpresa;
  const hasModules = Array.isArray(user?.modulos_permitidos) && user.modulos_permitidos.length > 0;
  const hasModuleAccess = isSuperAdmin || !hasModules || user.modulos_permitidos.includes('GestaoEmpresas');

  const canAccess = allowedByRole && hasModuleAccess;
  const canCreate = isSuperAdmin;

  const empresasQuery = useQuery({
    queryKey: ['gestaoEmpresas', user?.id, user?.empresa_id, user?.role],
    enabled: canAccess,
    queryFn: async () => {
      if (isAdminEmpresa && !user?.empresa_id) return [];

      const client = assertSupabaseConfigured();
      let query = client
        .from('empresas')
        .select('id, nome, cnpj, status, plano, created_at, updated_at')
        .order('nome', { ascending: true });

      if (isAdminEmpresa) query = query.eq('id', user.empresa_id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ['gestaoEmpresasProfiles', user?.id, user?.empresa_id, user?.role],
    enabled: canAccess,
    queryFn: async () => {
      if (isAdminEmpresa && !user?.empresa_id) return [];

      const client = assertSupabaseConfigured();
      let query = client
        .from('profiles')
        .select('id, display_name, email, role, status, empresa_id')
        .order('display_name', { ascending: true });

      if (isAdminEmpresa) query = query.eq('empresa_id', user.empresa_id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const empresas = empresasQuery.data || [];
  const profiles = profilesQuery.data || [];
  const isLoading = empresasQuery.isLoading || profilesQuery.isLoading;

  const usersByEmpresaId = useMemo(() => {
    const map = new Map();
    for (const profile of profiles) {
      if (!profile.empresa_id) continue;
      if (!map.has(profile.empresa_id)) map.set(profile.empresa_id, []);
      map.get(profile.empresa_id).push(profile);
    }
    return map;
  }, [profiles]);

  const kpis = useMemo(() => ({
    total: empresas.length,
    ativas: empresas.filter((empresa) => empresa.status === 'ativa').length,
    suspensasInativas: empresas.filter((empresa) => ['suspensa', 'inativa'].includes(empresa.status)).length,
    usuarios: profiles.length,
  }), [empresas, profiles]);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const client = assertSupabaseConfigured();
      const { error } = await client.from('empresas').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestaoEmpresas'] });
      queryClient.invalidateQueries({ queryKey: ['gestaoEmpresasProfiles'] });
      setDialogOpen(false);
      setSelectedEmpresa(null);
      toast.success('Empresa criada com sucesso.');
    },
    onError: (error) => toast.error(error.message || 'Erro ao criar empresa.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const client = assertSupabaseConfigured();
      const { error } = await client.from('empresas').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestaoEmpresas'] });
      queryClient.invalidateQueries({ queryKey: ['gestaoEmpresasProfiles'] });
      setDialogOpen(false);
      setSelectedEmpresa(null);
      toast.success('Empresa atualizada com sucesso.');
    },
    onError: (error) => toast.error(error.message || 'Erro ao salvar empresa.'),
  });

  const openCreate = () => {
    if (!canCreate) return;
    setSelectedEmpresa(null);
    setDialogOpen(true);
  };

  const openEdit = (empresa) => {
    setSelectedEmpresa(empresa);
    setDialogOpen(true);
  };

  const openUsers = (empresa) => {
    setSelectedEmpresa(empresa);
    setUsersDialogOpen(true);
  };

  const handleSubmit = (payload) => {
    if (selectedEmpresa?.id) {
      updateMutation.mutate({ id: selectedEmpresa.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Acesso restrito a super_admin e admin_empresa com módulo liberado.</p>
      </div>
    );
  }

  if (isAdminEmpresa && !user?.empresa_id) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Seu usuário não possui empresa vinculada. Solicite ajuste ao SUPERADMIN.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestão de Empresas</h1>
          <p className="text-gray-500 mt-1">Administre empresas, planos e vínculos operacionais do NVION.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="bg-primary hover:bg-primary-dark">
            <Plus className="w-4 h-4 mr-2" />
            Nova empresa
          </Button>
        )}
      </div>

      {(empresasQuery.error || profilesQuery.error) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {empresasQuery.error?.message || profilesQuery.error?.message || 'Erro ao carregar dados. Verifique as políticas RLS.'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total de empresas" value={kpis.total} icon={Building2} iconColor="bg-blue-500" />
        <KPICard title="Empresas ativas" value={kpis.ativas} icon={Building2} iconColor="bg-green-500" />
        <KPICard title="Suspensas/inativas" value={kpis.suspensasInativas} icon={Building2} iconColor="bg-orange-500" />
        <KPICard title="Usuários vinculados" value={kpis.usuarios} icon={Users} iconColor="bg-purple-500" />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Usuários vinculados</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                  Carregando empresas...
                </TableCell>
              </TableRow>
            ) : empresas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhuma empresa encontrada.
                </TableCell>
              </TableRow>
            ) : empresas.map((empresa) => {
              const linkedUsers = usersByEmpresaId.get(empresa.id) || [];
              return (
                <TableRow key={empresa.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{empresa.nome}</div>
                    <div className="text-xs text-gray-400 font-mono">{empresa.id}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{empresa.cnpj || '-'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[empresa.status] || 'bg-gray-100 text-gray-700'}>
                      {STATUS_LABELS[empresa.status] || empresa.status || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{empresa.plano || '-'}</TableCell>
                  <TableCell>{linkedUsers.length}</TableCell>
                  <TableCell>{formatDate(empresa.updated_at || empresa.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openUsers(empresa)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Ver usuários
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(empresa)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EmpresaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresa={selectedEmpresa}
        role={user?.role}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
      <UsersDialog
        open={usersDialogOpen}
        onOpenChange={setUsersDialogOpen}
        empresa={selectedEmpresa}
        users={selectedEmpresa ? (usersByEmpresaId.get(selectedEmpresa.id) || []) : []}
      />
    </div>
  );
}
