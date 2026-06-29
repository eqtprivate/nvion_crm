import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
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
  Trash2,
  LayoutGrid,
  KeyRound,
  Copy,
  Check,
  Building2,
  ChevronDown,
  ChevronRight,
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
import { Card, CardContent } from '@/components/ui/card';
import KPICard from '@/components/shared/KPICard';
import UsuarioAcessoDialog from '@/components/forms/UsuarioAcessoDialog';
import ManageModulesDialog from '@/components/forms/ManageModulesDialog';
import { ROLE_LABELS } from '@/lib/modules';
import { useAuth } from '@/lib/AuthContext';
import { hashPassword } from '@/lib/auth';
import { toast } from 'sonner';

function generateTempPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letters = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  const specials = ['@', '#', '!', '$'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  return `Nvion${digits}${special}${letters}`;
}

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

function SenhaGeradaDialog({ open, onOpenChange, senha, userName }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(senha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Senha Temporária Gerada
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            Usuário <strong>{userName}</strong> criado. Copie a senha — ela é exibida <strong>uma única vez</strong>.
          </p>
          <div className="flex items-center gap-2">
            <Input value={senha} readOnly className="font-mono text-base tracking-wider" />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Oriente o usuário a trocar a senha no primeiro acesso.</p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmpresaDialog({ open, onOpenChange, empresa, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    razao_social: '', nome_fantasia: '', cnpj: '', responsavel_principal: '',
    email: '', telefone: '', plano_contratado: '', status: 'em_implantacao',
  });

  React.useEffect(() => {
    if (empresa) {
      setForm({
        razao_social: empresa.razao_social || '',
        nome_fantasia: empresa.nome_fantasia || '',
        cnpj: empresa.cnpj || '',
        responsavel_principal: empresa.responsavel_principal || '',
        email: empresa.email || '',
        telefone: empresa.telefone || '',
        plano_contratado: empresa.plano_contratado || '',
        status: empresa.status || 'em_implantacao',
      });
    } else {
      setForm({ razao_social: '', nome_fantasia: '', cnpj: '', responsavel_principal: '', email: '', telefone: '', plano_contratado: '', status: 'em_implantacao' });
    }
  }, [empresa, open]);

  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{empresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Razão Social *</Label>
              <Input value={form.razao_social} onChange={f('razao_social')} required />
            </div>
            <div className="space-y-1">
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={f('nome_fantasia')} />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={f('cnpj')} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Input value={form.responsavel_principal} onChange={f('responsavel_principal')} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={f('email')} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={f('telefone')} />
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Input value={form.plano_contratado} onChange={f('plano_contratado')} placeholder="Ex: Starter, Pro" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={f('status')}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="em_implantacao">Em Implantação</option>
                <option value="ativa">Ativa</option>
                <option value="em_analise">Em Análise</option>
                <option value="suspensa">Suspensa</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
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

// ── Aba Usuários ────────────────────────────────────────────────────────────
function UsuariosTab({ isSuperAdmin, empresa, todosUsuarios, isLoading }) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [senhaDialogOpen, setSenhaDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [lastCreatedUser, setLastCreatedUser] = useState({ name: '', senha: '' });
  const [empresaFiltro, setEmpresaFiltro] = useState('all');

  const usuarios = useMemo(() => {
    const base = isSuperAdmin ? todosUsuarios : todosUsuarios.filter(u => u.empresa_vinculada === empresa);
    if (isSuperAdmin && empresaFiltro !== 'all') return base.filter(u => u.empresa_vinculada === empresaFiltro);
    return base;
  }, [todosUsuarios, isSuperAdmin, empresa, empresaFiltro]);

  const empresasDisponiveis = useMemo(() => {
    const set = new Set(todosUsuarios.map(u => u.empresa_vinculada).filter(Boolean));
    return Array.from(set).sort();
  }, [todosUsuarios]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UsuarioAcesso.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['todosUsuarios'] });
      setCreateDialogOpen(false);
      setLastCreatedUser({ name: variables.display_name, senha: variables.senha_temporaria });
      setSenhaDialogOpen(true);
    },
    onError: (err) => {
      console.error('Erro ao criar usuário:', err);
      toast.error('Erro ao criar usuário. Verifique os dados e tente novamente.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UsuarioAcesso.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todosUsuarios'] });
      setEditDialogOpen(false);
      setModulesDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UsuarioAcesso.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todosUsuarios'] }),
  });

  const kpis = useMemo(() => ({
    total: usuarios.length,
    ativos: usuarios.filter(u => u.status === 'ativo').length,
    suspensos: usuarios.filter(u => u.status === 'suspenso').length,
    pendentes: usuarios.filter(u => u.status === 'pendente').length,
  }), [usuarios]);

  const handleCreate = async (data) => {
    const senha = generateTempPassword();
    const senha_hash = await hashPassword(senha);
    createMutation.mutate({
      ...data,
      status: 'ativo',
      empresa_vinculada: isSuperAdmin ? (data.empresa_vinculada || empresa) : empresa,
      senha_temporaria: senha,
      senha_hash,
    });
  };

  const toggleStatus = (user) => {
    const newStatus = user.status === 'ativo' ? 'suspenso' : 'ativo';
    updateMutation.mutate({ id: user.id, data: { status: newStatus } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <select
              value={empresaFiltro}
              onChange={e => setEmpresaFiltro(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">Todas as empresas</option>
              {empresasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
        </div>
        <Button className="bg-primary hover:bg-primary-dark" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Novo Usuário
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
                  Nenhum usuário encontrado
                </TableCell></TableRow>
              ) : (
                usuarios.map(user => (
                  <TableRow key={user.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{user.display_name}</span>
                        <span className="text-sm text-gray-500">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && <TableCell className="text-sm text-gray-600">{user.empresa_vinculada || '-'}</TableCell>}
                    <TableCell className="text-sm text-gray-600">{user.modulos_permitidos?.length || 0} módulos</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[user.status] || 'bg-gray-100 text-gray-800'}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setModulesDialogOpen(true); }}>
                            <LayoutGrid className="w-4 h-4 mr-2" /> Gerenciar Módulos
                          </DropdownMenuItem>
                          {user.status === 'pendente' && user.senha_temporaria && (
                            <DropdownMenuItem onClick={() => { setLastCreatedUser({ name: user.display_name, senha: user.senha_temporaria }); setSenhaDialogOpen(true); }}>
                              <KeyRound className="w-4 h-4 mr-2" /> Ver senha temporária
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toggleStatus(user)}>
                            {user.status === 'ativo'
                              ? <><UserX className="w-4 h-4 mr-2" /> Suspender</>
                              : <><UserCheck className="w-4 h-4 mr-2" /> Ativar</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(user.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UsuarioAcessoDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        empresaVinculada={empresa}
        isSuperAdmin={isSuperAdmin}
      />
      <UsuarioAcessoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSubmit={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
        isLoading={updateMutation.isPending}
        isSuperAdmin={isSuperAdmin}
      />
      <ManageModulesDialog
        open={modulesDialogOpen}
        onOpenChange={setModulesDialogOpen}
        user={selectedUser}
        onSubmit={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
        isLoading={updateMutation.isPending}
      />
      <SenhaGeradaDialog open={senhaDialogOpen} onOpenChange={setSenhaDialogOpen} senha={lastCreatedUser.senha} userName={lastCreatedUser.name} />
    </div>
  );
}

// ── Aba Empresas (super_admin only) ────────────────────────────────────────
function EmpresasTab({ todosUsuarios }) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [expandedEmpresa, setExpandedEmpresa] = useState(null);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Empresa.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); setCreateDialogOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Empresa.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); setEditDialogOpen(false); setSelectedEmpresa(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Empresa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['empresas'] }),
  });

  const getUsersForEmpresa = (nomeEmpresa) =>
    todosUsuarios.filter(u => u.empresa_vinculada === nomeEmpresa);

  const kpis = useMemo(() => ({
    total: empresas.length,
    ativas: empresas.filter(e => e.status === 'ativa').length,
    implantacao: empresas.filter(e => e.status === 'em_implantacao').length,
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
        <KPICard title="Usuários Cadastrados" value={kpis.totalUsuarios} icon={Users} iconColor="bg-purple-500" />
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
          empresas.map(emp => {
            const users = getUsersForEmpresa(emp.razao_social);
            const isExpanded = expandedEmpresa === emp.id;
            return (
              <div key={emp.id}>
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedEmpresa(isExpanded ? null : emp.id)}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.razao_social}</p>
                      <p className="text-xs text-gray-500">{emp.nome_fantasia || emp.cnpj || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 hidden sm:inline">{users.length} usuário(s)</span>
                    <Badge className={EMPRESA_STATUS_COLORS[emp.status] || 'bg-gray-100 text-gray-800'} onClick={e => e.stopPropagation()}>
                      {emp.status?.replace(/_/g, ' ')}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedEmpresa(emp); setEditDialogOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(emp.id); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 mb-4 text-sm">
                      {emp.responsavel_principal && <div><span className="text-gray-500">Responsável:</span> <span className="font-medium">{emp.responsavel_principal}</span></div>}
                      {emp.email && <div><span className="text-gray-500">Email:</span> <span className="font-medium">{emp.email}</span></div>}
                      {emp.telefone && <div><span className="text-gray-500">Tel:</span> <span className="font-medium">{emp.telefone}</span></div>}
                      {emp.plano_contratado && <div><span className="text-gray-500">Plano:</span> <span className="font-medium">{emp.plano_contratado}</span></div>}
                      {emp.data_inicio_plataforma && <div><span className="text-gray-500">Início:</span> <span className="font-medium">{new Date(emp.data_inicio_plataforma).toLocaleDateString('pt-BR')}</span></div>}
                    </div>

                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Usuários vinculados</p>
                    {users.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nenhum usuário vinculado a esta empresa.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {users.map(u => (
                          <div key={u.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {u.display_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{u.display_name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800'}`}>{ROLE_LABELS[u.role] || u.role}</Badge>
                              <Badge className={`text-xs ${STATUS_COLORS[u.status] || 'bg-gray-100 text-gray-800'}`}>{u.status}</Badge>
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

      <EmpresaDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={data => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      <EmpresaDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} empresa={selectedEmpresa} onSubmit={data => updateMutation.mutate({ id: selectedEmpresa.id, data })} isLoading={updateMutation.isPending} />
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function GestaoAcessos() {
  const { user: currentUser } = useAuth();
  const empresa = currentUser?.empresa_vinculada;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data: todosUsuarios = [], isLoading } = useQuery({
    queryKey: ['todosUsuarios'],
    queryFn: () => base44.entities.UsuarioAcesso.list('-created_date'),
  });

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestão de Acessos</h1>
        <p className="text-gray-500 mt-1">Gerencie usuários, permissões e empresas do sistema</p>
      </div>

      {isSuperAdmin ? (
        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="bg-white border h-auto">
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Users className="w-4 h-4 mr-2" />Usuários
            </TabsTrigger>
            <TabsTrigger value="empresas" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Building2 className="w-4 h-4 mr-2" />Empresas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios">
            <UsuariosTab isSuperAdmin={isSuperAdmin} empresa={empresa} todosUsuarios={todosUsuarios} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="empresas">
            <EmpresasTab todosUsuarios={todosUsuarios} />
          </TabsContent>
        </Tabs>
      ) : (
        <UsuariosTab isSuperAdmin={false} empresa={empresa} todosUsuarios={todosUsuarios} isLoading={isLoading} />
      )}
    </div>
  );
}
