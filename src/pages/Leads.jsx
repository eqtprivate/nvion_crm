import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Target, MoreVertical, Download, Flame, Thermometer, Snowflake } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LeadDialog, { LEAD_STATUSES, ORIGENS, TEMPERATURAS } from '../components/forms/LeadDialog';
import EditLeadDialog from '../components/forms/EditLeadDialog';
import KPICard from '../components/leads/KPICard';
import LeadFilters from '../components/leads/LeadFilters';
import LeadsAnalytics from '../components/leads/LeadsAnalytics';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABELS = Object.fromEntries(LEAD_STATUSES.map(s => [s.value, s.label]));
const ORIGEM_LABELS = Object.fromEntries(ORIGENS.map(o => [o.value, o.label]));

const STATUS_COLORS = {
  novo_contato: 'bg-blue-100 text-blue-800',
  qualificacao: 'bg-indigo-100 text-indigo-800',
  simulacao: 'bg-purple-100 text-purple-800',
  proposta_enviada: 'bg-yellow-100 text-yellow-800',
  documentacao: 'bg-orange-100 text-orange-800',
  em_aprovacao: 'bg-cyan-100 text-cyan-800',
  venda_concluida: 'bg-green-100 text-green-800',
  perdida: 'bg-red-100 text-red-800',
};

const TEMP_ICONS = {
  quente: <Flame className="w-3.5 h-3.5 text-red-500" />,
  morno: <Thermometer className="w-3.5 h-3.5 text-yellow-500" />,
  frio: <Snowflake className="w-3.5 h-3.5 text-blue-500" />,
};

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', origem: 'all', temperatura: 'all' });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', empresa],
    queryFn: async () => { const all = await base44.entities.Lead.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); },
    enabled: !!empresa,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads', empresa] }); setDialogOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads', empresa] }); setEditDialogOpen(false); setSelectedLead(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads', empresa] }),
  });

  const handleEdit = (lead) => { setSelectedLead(lead); setEditDialogOpen(true); };
  const handleFilterChange = (key, value) => setFilters(p => ({ ...p, [key]: value }));
  const handleClearFilters = () => setFilters({ status: 'all', origem: 'all', temperatura: 'all' });

  const filtered = useMemo(() => {
    return leads.filter(lead => {
      const matchSearch = !searchTerm ||
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.vendedor_responsavel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filters.status === 'all' || lead.status === filters.status;
      const matchOrigem = filters.origem === 'all' || lead.origem === filters.origem;
      const matchTemp = filters.temperatura === 'all' || lead.temperatura === filters.temperatura;
      return matchSearch && matchStatus && matchOrigem && matchTemp;
    });
  }, [leads, searchTerm, filters]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const ativos = filtered.filter(l => !['venda_concluida', 'perdida'].includes(l.status)).length;
    const concluidos = filtered.filter(l => l.status === 'venda_concluida').length;
    const perdidos = filtered.filter(l => l.status === 'perdida').length;
    const valorTotal = filtered.reduce((s, l) => s + (l.valor_estimado_carta || 0), 0);
    const taxa = total > 0 ? ((concluidos / total) * 100).toFixed(1) : 0;
    return { total, ativos, concluidos, perdidos, valorTotal, taxa };
  }, [filtered]);

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Origem', 'Campanha', 'Produto', 'Valor Estimado (R$)', 'Administradora', 'Vendedor', 'Líder', 'Temperatura', 'Status', 'Último Contato', 'Próxima Ação'];
    const rows = filtered.map(l => [
      l.name || '', l.email || '', l.phone || '',
      ORIGEM_LABELS[l.origem] || l.origem || '', l.campanha || '',
      l.produto_interesse || '', l.valor_estimado_carta || 0,
      l.administradora_interesse || '', l.vendedor_responsavel || '',
      l.lider_vinculado || '', l.temperatura || '', STATUS_LABELS[l.status] || l.status || '',
      l.data_ultimo_contato || '', l.proxima_acao || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `leads_${new Date().toISOString().split('T')[0]}.csv` });
    a.click();
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Prospecção</h1>
          <p className="text-gray-500 mt-1">Gerencie seus leads e prospecções de consórcio</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary-dark" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <KPICard title="Total de Leads" value={kpis.total} Icon={Target} color="blue" />
        <KPICard title="Em Andamento" value={kpis.ativos} Icon={Target} color="orange" />
        <KPICard title="Vendas Concluídas" value={kpis.concluidos} Icon={Target} color="green" />
        <KPICard title="Perdidos" value={kpis.perdidos} Icon={Target} color="red" />
        <KPICard title="Valor em Carteira" value={`R$${(kpis.valorTotal / 1000).toFixed(0)}k`} Icon={Target} color="purple" />
        <KPICard title="Taxa de Conversão" value={`${kpis.taxa}%`} Icon={Target} color="cyan" />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar por nome, email ou vendedor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <LeadFilters filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Origem</TableHead>
                <TableHead className="hidden lg:table-cell">Produto / Valor</TableHead>
                <TableHead>Temp.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Próxima Ação</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Target className="w-12 h-12 text-gray-300" />
                      <span className="font-medium">Nenhum lead encontrado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(lead => (
                  <TableRow key={lead.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm flex-shrink-0">
                          {lead.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-gray-500">{lead.email || lead.vendedor_responsavel || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{lead.phone || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{ORIGEM_LABELS[lead.origem] || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      <div>
                        <p>{lead.produto_interesse || '-'}</p>
                        {lead.valor_estimado_carta && (
                          <p className="text-xs text-gray-500">R$ {lead.valor_estimado_carta.toLocaleString('pt-BR')}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {TEMP_ICONS[lead.temperatura]}
                        <span className="text-xs hidden sm:inline capitalize">{lead.temperatura || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={lead.status || 'novo_contato'} onValueChange={v => updateMutation.mutate({ id: lead.id, data: { status: v } })}>
                        <SelectTrigger className="h-7 text-xs w-36 border-0 p-0 shadow-none">
                          <Badge className={STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800'}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-gray-600 max-w-[160px] truncate">
                      {lead.proxima_acao || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(lead)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(lead.id)}>Excluir</DropdownMenuItem>
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

      <LeadsAnalytics leads={filtered} />

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={data => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      <EditLeadDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} lead={selectedLead} onSubmit={data => updateMutation.mutate({ id: selectedLead.id, data })} isLoading={updateMutation.isPending} />
    </div>
  );
}