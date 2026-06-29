import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, TrendingUp, MoreVertical, Download, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import OpportunityDialog from '../components/forms/OpportunityDialog';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';

const stageLabels = {
  novo_contato: 'Novo Contato', qualificacao: 'Qualificação', simulacao: 'Simulação',
  proposta_enviada: 'Proposta Enviada', documentacao: 'Documentação',
  em_aprovacao: 'Em Aprovação', venda_concluida: 'Venda Concluída', perdida: 'Perdida',
};

const statusColors = {
  aberta: 'bg-blue-100 text-blue-800', ganha: 'bg-green-100 text-green-800',
  perdida: 'bg-red-100 text-red-800', suspensa: 'bg-gray-100 text-gray-800',
};

export default function Oportunidades() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOportunidade, setSelectedOportunidade] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const filterEmpresa = (items) => items.filter((item) => item.empresa_vinculada === empresa);

  const { data: allOportunidades = [], isLoading } = useQuery({
    queryKey: ['opportunities', empresa],
    queryFn: async () => { const all = await base44.entities.Opportunity.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); },
    enabled: !!empresa,
  });
  const { data: leads = [] } = useQuery({ queryKey: ['leads', empresa], queryFn: async () => filterEmpresa(await base44.entities.Lead.list('-created_date')), enabled: Boolean(empresa) });
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts', empresa], queryFn: async () => filterEmpresa(await base44.entities.Contact.list('-created_date')), enabled: Boolean(empresa) });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtosConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.ProdutoConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const { data: administradoras = [] } = useQuery({ queryKey: ['accounts', empresa], queryFn: async () => filterEmpresa(await base44.entities.Account.list('-created_date')), enabled: Boolean(empresa) });
  const { data: vendedores = [] } = useQuery({ queryKey: ['vendedores', empresa], queryFn: async () => filterEmpresa(await base44.entities.Vendedores.list('-created_date')), enabled: Boolean(empresa) });
  const { data: equipes = [] } = useQuery({ queryKey: ['equipes', empresa], queryFn: async () => filterEmpresa(await base44.entities.EquipeComercial.list('-created_date')), enabled: Boolean(empresa) });

  const oportunidades = useMemo(
    () => applyAccessFilter(allOportunidades, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }),
    [allOportunidades, user, teamMembers]
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Opportunity.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['opportunities', empresa] }); setDialogOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', empresa] });
      setEditDialogOpen(false);
      setSelectedOportunidade(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Opportunity.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['opportunities', empresa] }); },
  });

  const handleEdit = (op) => { setSelectedOportunidade(op); setEditDialogOpen(true); };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleQuickUpdate = (id, field, value) => {
    updateMutation.mutate({ id, data: { [field]: value } });
  };

  const filteredAndSorted = useMemo(() => {
    let result = oportunidades.filter(op => {
      const matchSearch = op.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.produto?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || op.status === statusFilter;
      return matchSearch && matchStatus;
    });
    result.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (sortColumn === 'created_date' || sortColumn === 'previsao_fechamento') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [oportunidades, searchTerm, statusFilter, sortColumn, sortDirection]);

  const kpis = useMemo(() => {
    const total = oportunidades.length;
    const abertas = oportunidades.filter(o => o.status === 'aberta').length;
    const ganhas = oportunidades.filter(o => o.status === 'ganha');
    const pipeline = oportunidades.filter(o => o.status === 'aberta').reduce((s, o) => s + (o.valor_carta || 0), 0);
    return { total, abertas, ganhas: ganhas.length, pipeline };
  }, [oportunidades]);

  const exportToCSV = () => {
    const headers = ['Nome', 'Produto', 'Valor Carta (R$)', 'Etapa', 'Status', 'Previsão Fechamento', 'Probabilidade (%)', 'Vendedor', 'Líder', 'Administradora'];
    const rows = filteredAndSorted.map(op => [
      op.name || '', op.produto || '', op.valor_carta || 0,
      stageLabels[op.stage] || op.stage || '', op.status || '',
      op.previsao_fechamento || '', op.probabilidade || '',
      op.vendedor || '', op.lider || '', op.administradora_pretendida || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `oportunidades_${new Date().toISOString().split('T')[0]}.csv` });
    a.click();
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Oportunidades</h1>
          <p className="text-gray-500 mt-1">Gestão do pipeline de vendas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={oportunidades.length === 0}>
            <Download className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary-dark" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Nova Oportunidade
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold text-gray-900">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Em Aberto</p><p className="text-2xl font-bold text-blue-600">{kpis.abertas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Ganhas</p><p className="text-2xl font-bold text-green-600">{kpis.ganhas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pipeline (R$)</p><p className="text-2xl font-bold text-primary">{kpis.pipeline.toLocaleString('pt-BR')}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input placeholder="Buscar oportunidades..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="ganha">Ganha</SelectItem>
              <SelectItem value="perdida">Perdida</SelectItem>
              <SelectItem value="suspensa">Suspensa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Nome <ArrowUpDown className="w-4 h-4" /></div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Produto</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('valor_carta')}>
                  <div className="flex items-center gap-2">Valor Carta <ArrowUpDown className="w-4 h-4" /></div>
                </TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell cursor-pointer" onClick={() => handleSort('previsao_fechamento')}>
                  <div className="flex items-center gap-2">Previsão <ArrowUpDown className="w-4 h-4" /></div>
                </TableHead>
                <TableHead className="hidden xl:table-cell">Prob. %</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
              ) : filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <TrendingUp className="w-12 h-12 text-gray-300" />
                      <span className="font-medium">Nenhuma oportunidade encontrada</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map(op => (
                  <TableRow key={op.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{op.name}</p>
                          <p className="text-xs text-gray-500">{op.vendedor || op.cliente_vinculado || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{op.produto || '-'}</TableCell>
                    <TableCell>
                      <span className="font-medium">{op.valor_carta ? `R$ ${op.valor_carta.toLocaleString('pt-BR')}` : '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Select value={op.stage || 'novo_contato'} onValueChange={v => handleQuickUpdate(op.id, 'stage', v)}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(stageLabels).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[op.status] || 'bg-gray-100 text-gray-800'}>{op.status || '-'}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {op.previsao_fechamento ? new Date(op.previsao_fechamento).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {op.probabilidade != null ? `${op.probabilidade}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(op)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(op.id)}>Excluir</DropdownMenuItem>
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

      <OpportunityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={data => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        currentUser={user}
        leads={leads}
        contacts={contacts}
        produtos={produtos}
        administradoras={administradoras}
        vendedores={vendedores}
        equipes={equipes}
      />
      <OpportunityDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        opportunity={selectedOportunidade}
        onSubmit={data => updateMutation.mutate({ id: selectedOportunidade.id, data })}
        isLoading={updateMutation.isPending}
        leads={leads}
        contacts={contacts}
        produtos={produtos}
        administradoras={administradoras}
        vendedores={vendedores}
        equipes={equipes}
      />
    </div>
  );
}
