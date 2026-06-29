import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Users, MoreVertical, Download } from 'lucide-react';
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
import { PhoneInput, formatPhone } from '@/components/forms/MaskedInputs';

const origemOptions = ['indicacao', 'instagram', 'google', 'site', 'whatsapp', 'campanha_paga', 'base_propria', 'parceiro', 'evento', 'outro'];
const statusOptions = ['lead', 'em_negociacao', 'cliente_ativo', 'venda_concluida', 'perdido', 'inativo'];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  cpf_cnpj: '',
  cidade: '',
  estado: '',
  origem: 'base_propria',
  vendedor_responsavel: '',
  status: 'lead',
  observacoes: '',
};

const statusLabel = {
  lead: 'Lead',
  em_negociacao: 'Em negociação',
  cliente_ativo: 'Cliente ativo',
  venda_concluida: 'Venda concluída',
  perdido: 'Perdido',
  inativo: 'Inativo',
};

function ClienteDialog({ open, onOpenChange, onSubmit, cliente, vendedores, loading }) {
  const [form, setForm] = useState(emptyForm);

  React.useEffect(() => {
    setForm(cliente ? { ...emptyForm, ...cliente } : emptyForm);
  }, [cliente, open]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Telefone</Label><PhoneInput value={form.phone || ''} onChange={(value) => setForm({ ...form, phone: value })} /></div>
            <div><Label>CPF/CNPJ</Label><Input value={form.cpf_cnpj || ''} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={form.cidade || ''} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div><Label>Estado</Label><Input maxLength={2} value={form.estado || ''} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
            <div><Label>Origem</Label><Select value={form.origem} onValueChange={(value) => setForm({ ...form, origem: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{origemOptions.map((item) => <SelectItem key={item} value={item}>{item.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((item) => <SelectItem key={item} value={item}>{statusLabel[item]}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-2">
              <Label>Vendedor Responsável</Label>
              <Select value={form.vendedor_responsavel || ''} onValueChange={(value) => setForm({ ...form, vendedor_responsavel: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                <SelectContent>
                  {vendedores.filter((vendedor) => vendedor.nome).map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.nome}>{vendedor.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Observações</Label><Input value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Cliente'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Contacts() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const queryClient = useQueryClient();

  const { data: allClientes = [], isLoading } = useQuery({
    queryKey: ['contacts', empresa],
    queryFn: async () => {
      const all = await base44.entities.Contact.list('-created_date');
      return all.filter((item) => item.empresa_vinculada === empresa);
    },
    enabled: Boolean(empresa),
  });

  const clientes = useMemo(
    () => applyAccessFilter(allClientes, user, { vendedorField: 'vendedor_responsavel', teamMembers }),
    [allClientes, user, teamMembers]
  );

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores', empresa],
    queryFn: async () => {
      const all = await base44.entities.Vendedores.list('-created_date');
      return all.filter((item) => item.empresa_vinculada === empresa);
    },
    enabled: Boolean(empresa),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', empresa] });
      setDialogOpen(false);
      setSelectedCliente(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', empresa] });
      setDialogOpen(false);
      setSelectedCliente(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', empresa] }),
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clientes.filter((cliente) =>
      cliente.name?.toLowerCase().includes(term) ||
      cliente.email?.toLowerCase().includes(term) ||
      cliente.cpf_cnpj?.toLowerCase().includes(term) ||
      cliente.vendedor_responsavel?.toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);

  const kpis = useMemo(() => ({
    total: clientes.length,
    ativos: clientes.filter((item) => item.status === 'cliente_ativo').length,
    negociacao: clientes.filter((item) => item.status === 'em_negociacao').length,
    concluidas: clientes.filter((item) => item.status === 'venda_concluida').length,
  }), [clientes]);

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Cidade', 'Estado', 'Origem', 'Vendedor', 'Status'];
    const rows = filtered.map((item) => [item.name, item.email, item.phone, item.cpf_cnpj, item.cidade, item.estado, item.origem, item.vendedor_responsavel, item.status]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (data) => {
    if (selectedCliente?.id) {
      updateMutation.mutate({ id: selectedCliente.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Base de clientes finais e histórico comercial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button>
          <Button onClick={() => { setSelectedCliente(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Novo Cliente</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Clientes</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Clientes Ativos</p><p className="text-2xl font-bold text-green-700">{kpis.ativos}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Em Negociação</p><p className="text-2xl font-bold text-blue-700">{kpis.negociacao}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Vendas Concluídas</p><p className="text-2xl font-bold text-primary">{kpis.concluidas}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Carregando clientes...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500"><Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhum cliente encontrado</TableCell></TableRow>
              ) : filtered.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell><p className="font-medium">{cliente.name}</p><p className="text-xs text-gray-500">{cliente.email || formatPhone(cliente.phone) || '-'}</p></TableCell>
                  <TableCell>{cliente.cpf_cnpj || '-'}</TableCell>
                  <TableCell>{cliente.cidade || '-'}{cliente.estado ? `/${cliente.estado}` : ''}</TableCell>
                  <TableCell>{cliente.origem?.replaceAll('_', ' ') || '-'}</TableCell>
                  <TableCell>{cliente.vendedor_responsavel || '-'}</TableCell>
                  <TableCell><Badge>{statusLabel[cliente.status] || cliente.status || '-'}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedCliente(cliente); setDialogOpen(true); }}>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(cliente.id)}>Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <ClienteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cliente={selectedCliente}
        vendedores={vendedores}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
