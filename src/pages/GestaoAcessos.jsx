import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import KPICard from '@/components/shared/KPICard';
import UsuarioAcessoDialog from '@/components/forms/UsuarioAcessoDialog';
import ManageModulesDialog from '@/components/forms/ManageModulesDialog';
import { ROLE_LABELS } from '@/lib/modules';
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

export default function GestaoAcessos() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuariosAcesso'],
    queryFn: () => base44.entities.UsuarioAcesso.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UsuarioAcesso.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuariosAcesso'] });
      setCreateDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UsuarioAcesso.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuariosAcesso'] });
      setEditDialogOpen(false);
      setModulesDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UsuarioAcesso.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuariosAcesso'] }),
  });

  const kpis = useMemo(() => {
    const total = usuarios.length;
    const ativos = usuarios.filter((u) => u.status === 'ativo').length;
    const suspensos = usuarios.filter((u) => u.status === 'suspenso').length;
    const pendentes = usuarios.filter((u) => u.status === 'pendente').length;
    return { total, ativos, suspensos, pendentes };
  }, [usuarios]);

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleManageModules = (user) => {
    setSelectedUser(user);
    setModulesDialogOpen(true);
  };

  const toggleStatus = (user) => {
    const newStatus = user.status === 'ativo' ? 'suspenso' : 'ativo';
    updateMutation.mutate({ id: user.id, data: { status: newStatus } });
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestão de Acessos</h1>
          <p className="text-gray-500 mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Usuários" value={kpis.total} icon={Users} iconColor="bg-blue-500" />
        <KPICard title="Ativos" value={kpis.ativos} icon={UserCheck} iconColor="bg-green-500" />
        <KPICard title="Suspensos" value={kpis.suspensos} icon={UserX} iconColor="bg-red-500" />
        <KPICard title="Pendentes" value={kpis.pendentes} icon={Clock} iconColor="bg-yellow-500" />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Usuário</TableHead>
                <TableHead className="font-semibold text-gray-700">Perfil</TableHead>
                <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                <TableHead className="font-semibold text-gray-700">Módulos</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 w-12">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Carregando usuários...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-gray-300" />
                      <span className="font-medium">Nenhum usuário encontrado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((user) => (
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
                    <TableCell className="text-gray-600">{user.empresa_vinculada || '-'}</TableCell>
                    <TableCell className="text-gray-600">
                      {user.modulos_permitidos?.length || 0} módulos
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[user.status] || 'bg-gray-100 text-gray-800'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageModules(user)}>
                            <LayoutGrid className="w-4 h-4 mr-2" /> Gerenciar Módulos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(user)}>
                            {user.status === 'ativo' ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" /> Suspender
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" /> Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(user.id)}
                          >
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
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
      <UsuarioAcessoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSubmit={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
        isLoading={updateMutation.isPending}
      />
      <ManageModulesDialog
        open={modulesDialogOpen}
        onOpenChange={setModulesDialogOpen}
        user={selectedUser}
        onSubmit={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}