import React, { useMemo, useState } from 'react';
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
import { Plus, Search, ReceiptText, MoreVertical, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const emptyForm = { cliente: '', oportunidade_vinculada: '', vendedor: '', lider: '', equipe: '', administradora: '', produto: '', grupo: '', cota: '', valor_carta: '', data_venda: '', percentual_comissao_prevista: '', data_prevista_pagamento: '', observacoes: '', status_operacional: 'lancada', status_conciliacao: 'nao_conciliada', status_financeiro: 'comissao_prevista' };
const statusConciliacaoLabel = { nao_conciliada: 'Não conciliada', em_conciliacao: 'Em conciliação', conciliada: 'Conciliada', divergente: 'Divergente' };
function money(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function calcComissao(valor, percentual) { return Number(valor || 0) * Number(percentual || 0) / 100; }

function VendaDialog({ open, onOpenChange, venda, oportunidades, produtos, equipes, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);
  React.useEffect(() => { setForm(venda ? { ...emptyForm, ...venda } : emptyForm); }, [venda, open]);
  const valorComissao = calcComissao(form.valor_carta, form.percentual_comissao_prevista);

  const handleOpportunity = (id) => {
    const oportunidade = oportunidades.find((item) => item.id === id);
    setForm({ ...form, oportunidade_vinculada: id, cliente: oportunidade?.cliente_vinculado || form.cliente, vendedor: oportunidade?.vendedor || form.vendedor, lider: oportunidade?.lider || form.lider, administradora: oportunidade?.administradora_pretendida || form.administradora, produto: oportunidade?.produto || form.produto, valor_carta: oportunidade?.valor_carta || form.valor_carta });
  };

  const handleProduto = (nome) => {
    const produto = produtos.find((item) => item.nome_produto === nome);
    setForm({ ...form, produto: nome, administradora: produto?.administradora_vinculada || form.administradora, percentual_comissao_prevista: produto?.percentual_comissao_padrao || form.percentual_comissao_prevista });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...form, valor_carta: Number(form.valor_carta || 0), percentual_comissao_prevista: Number(form.percentual_comissao_prevista || 0), valor_comissao_prevista: valorComissao });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{venda ? 'Editar Venda de Consórcio' : 'Nova Venda de Consórcio'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Oportunidade vinculada</Label><Select value={form.oportunidade_vinculada || ''} onValueChange={handleOpportunity}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{oportunidades.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Cliente *</Label><Input required value={form.cliente || ''} onChange={(e) => setForm({ ...form, cliente: e.target.value })} /></div>
            <div><Label>Data da venda</Label><Input type="date" value={form.data_venda || ''} onChange={(e) => setForm({ ...form, data_venda: e.target.value })} /></div>
            <div><Label>Produto</Label><Select value={form.produto || ''} onValueChange={handleProduto}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{produtos.map((item) => <SelectItem key={item.id} value={item.nome_produto}>{item.nome_produto}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Administradora</Label><Input value={form.administradora || ''} onChange={(e) => setForm({ ...form, administradora: e.target.value })} /></div>
            <div><Label>Equipe</Label><Select value={form.equipe || ''} onValueChange={(value) => setForm({ ...form, equipe: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{equipes.map((item) => <SelectItem key={item.id} value={item.nome_equipe}>{item.nome_equipe}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Vendedor</Label><Input value={form.vendedor || ''} onChange={(e) => setForm({ ...form, vendedor: e.target.value })} /></div>
            <div><Label>Líder</Label><Input value={form.lider || ''} onChange={(e) => setForm({ ...form, lider: e.target.value })} /></div>
            <div><Label>Valor da carta *</Label><Input required type="number" value={form.valor_carta || ''} onChange={(e) => setForm({ ...form, valor_carta: e.target.value })} /></div>
            <div><Label>Grupo</Label><Input value={form.grupo || ''} onChange={(e) => setForm({ ...form, grupo: e.target.value })} /></div>
            <div><Label>Cota</Label><Input value={form.cota || ''} onChange={(e) => setForm({ ...form, cota: e.target.value })} /></div>
            <div><Label>Comissão prevista (%)</Label><Input type="number" step="0.01" value={form.percentual_comissao_prevista || ''} onChange={(e) => setForm({ ...form, percentual_comissao_prevista: e.target.value })} /></div>
            <div><Label>Valor comissão prevista</Label><Input value={money(valorComissao)} disabled /></div>
            <div><Label>Data prevista pagamento</Label><Input type="date" value={form.data_prevista_pagamento || ''} onChange={(e) => setForm({ ...form, data_prevista_pagamento: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Observações</Label><Input value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Venda'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function VendasConsorcio() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState(null);
  const filterEmpresa = (items) => items.filter((item) => item.empresa_vinculada === empresa);

  const { data: allVendas = [], isLoading } = useQuery({ queryKey: ['vendasConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.VendasConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const vendas = useMemo(
    () => applyAccessFilter(allVendas, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }),
    [allVendas, user, teamMembers]
  );
  const { data: oportunidades = [] } = useQuery({ queryKey: ['opportunities', empresa], queryFn: async () => filterEmpresa(await base44.entities.Opportunity.list('-created_date')), enabled: Boolean(empresa) });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtosConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.ProdutoConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const { data: equipes = [] } = useQuery({ queryKey: ['equipes', empresa], queryFn: async () => filterEmpresa(await base44.entities.EquipeComercial.list('-created_date')), enabled: Boolean(empresa) });

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.VendasConsorcio.create({ ...data, empresa_vinculada: empresa }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] }); setDialogOpen(false); setSelectedVenda(null); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.VendasConsorcio.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] }); setDialogOpen(false); setSelectedVenda(null); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.VendasConsorcio.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] }) });

  const filtered = useMemo(() => { const term = searchTerm.toLowerCase(); return vendas.filter((item) => item.cliente?.toLowerCase().includes(term) || item.vendedor?.toLowerCase().includes(term) || item.administradora?.toLowerCase().includes(term) || item.produto?.toLowerCase().includes(term)); }, [vendas, searchTerm]);
  const kpis = useMemo(() => ({ total: vendas.length, valorCartas: vendas.reduce((sum, item) => sum + (item.valor_carta || 0), 0), comissaoPrevista: vendas.reduce((sum, item) => sum + (item.valor_comissao_prevista || 0), 0), naoConciliadas: vendas.filter((item) => item.status_conciliacao === 'nao_conciliada').length }), [vendas]);
  const handleSubmit = (data) => { selectedVenda?.id ? updateMutation.mutate({ id: selectedVenda.id, data }) : createMutation.mutate(data); };
  const exportCSV = () => { const headers = ['Cliente', 'Produto', 'Administradora', 'Vendedor', 'Valor Carta', 'Comissão Prevista']; const rows = filtered.map((item) => [item.cliente, item.produto, item.administradora, item.vendedor, item.valor_carta, item.valor_comissao_prevista]); const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'vendas_consorcio.csv'; link.click(); window.URL.revokeObjectURL(url); };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4"><div><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendas de Consórcio</h1><p className="text-gray-500 mt-1">Registro das vendas realizadas e comissão prevista</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button><Button onClick={() => { setSelectedVenda(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nova Venda</Button></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Vendas</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Valor Total de Cartas</p><p className="text-2xl font-bold text-blue-700">{money(kpis.valorCartas)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Comissão Prevista</p><p className="text-2xl font-bold text-green-700">{money(kpis.comissaoPrevista)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Não Conciliadas</p><p className="text-2xl font-bold text-primary">{kpis.naoConciliadas}</p></CardContent></Card></div>
      <div className="bg-white rounded-lg shadow"><div className="p-4 border-b"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar vendas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Produto</TableHead><TableHead>Administradora</TableHead><TableHead>Vendedor</TableHead><TableHead>Valor Carta</TableHead><TableHead>Comissão</TableHead><TableHead>Conciliação</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando vendas...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-500"><ReceiptText className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhuma venda encontrada</TableCell></TableRow> : filtered.map((venda) => <TableRow key={venda.id}><TableCell>{venda.cliente}</TableCell><TableCell>{venda.produto || '-'}</TableCell><TableCell>{venda.administradora || '-'}</TableCell><TableCell>{venda.vendedor || '-'}</TableCell><TableCell>{money(venda.valor_carta)}</TableCell><TableCell>{money(venda.valor_comissao_prevista)}</TableCell><TableCell><Badge>{statusConciliacaoLabel[venda.status_conciliacao] || venda.status_conciliacao}</Badge></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedVenda(venda); setDialogOpen(true); }}>Editar</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(venda.id)}>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div></div>
      <VendaDialog open={dialogOpen} onOpenChange={setDialogOpen} venda={selectedVenda} oportunidades={oportunidades} produtos={produtos} equipes={equipes} onSubmit={handleSubmit} loading={createMutation.isPending || updateMutation.isPending} />
    </div>
  );
}
