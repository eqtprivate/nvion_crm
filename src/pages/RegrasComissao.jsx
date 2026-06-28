import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Percent, MoreVertical, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const emptyForm = { nome_regra: '', administradora: '', produto: '', tipo_comissao: 'percentual', percentual_base: '', percentual_vendedor: '', percentual_lider: '', prazo_pagamento_dias: '', status: 'ativa', observacoes: '' };
const tipoLabel = { percentual: 'Percentual', fixo: 'Valor fixo', hibrido: 'Híbrido' };

function RegraDialog({ open, onOpenChange, regra, produtos, administradoras, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);
  React.useEffect(() => { setForm(regra ? { ...emptyForm, ...regra } : emptyForm); }, [regra, open]);
  const handleProduto = (nome) => {
    const produto = produtos.find((item) => item.nome_produto === nome);
    setForm({ ...form, produto: nome, administradora: produto?.administradora_vinculada || form.administradora, percentual_base: produto?.percentual_comissao_padrao || form.percentual_base, prazo_pagamento_dias: produto?.prazo_medio_pagamento || form.prazo_pagamento_dias });
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...form, percentual_base: Number(form.percentual_base || 0), percentual_vendedor: Number(form.percentual_vendedor || 0), percentual_lider: Number(form.percentual_lider || 0), prazo_pagamento_dias: Number(form.prazo_pagamento_dias || 0) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{regra ? 'Editar Regra de Comissão' : 'Nova Regra de Comissão'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Nome da regra *</Label><Input required value={form.nome_regra || ''} onChange={(e) => setForm({ ...form, nome_regra: e.target.value })} placeholder="Ex: Imóvel Porto Seguro" /></div>
            <div><Label>Produto</Label><Select value={form.produto || ''} onValueChange={handleProduto}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{produtos.map((item) => <SelectItem key={item.id} value={item.nome_produto}>{item.nome_produto}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Administradora</Label><Select value={form.administradora || ''} onValueChange={(value) => setForm({ ...form, administradora: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{administradoras.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Tipo de comissão</Label><Select value={form.tipo_comissao} onValueChange={(value) => setForm({ ...form, tipo_comissao: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentual">Percentual</SelectItem><SelectItem value="fixo">Valor fixo</SelectItem><SelectItem value="hibrido">Híbrido</SelectItem></SelectContent></Select></div>
            <div><Label>Comissão base (%)</Label><Input type="number" step="0.01" value={form.percentual_base || ''} onChange={(e) => setForm({ ...form, percentual_base: e.target.value })} /></div>
            <div><Label>Comissão vendedor (%)</Label><Input type="number" step="0.01" value={form.percentual_vendedor || ''} onChange={(e) => setForm({ ...form, percentual_vendedor: e.target.value })} /></div>
            <div><Label>Comissão líder (%)</Label><Input type="number" step="0.01" value={form.percentual_lider || ''} onChange={(e) => setForm({ ...form, percentual_lider: e.target.value })} /></div>
            <div><Label>Prazo pagamento (dias)</Label><Input type="number" value={form.prazo_pagamento_dias || ''} onChange={(e) => setForm({ ...form, prazo_pagamento_dias: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="inativa">Inativa</SelectItem><SelectItem value="suspensa">Suspensa</SelectItem></SelectContent></Select></div>
            <div className="md:col-span-3"><Label>Observações</Label><Input value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Regra'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RegrasComissao() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRegra, setSelectedRegra] = useState(null);
  const loadEntity = (entity, key) => useQuery({ queryKey: [key, empresa], queryFn: async () => { const all = await base44.entities[entity].list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: regras = [], isLoading } = loadEntity('RegraComissao', 'regrasComissao');
  const { data: produtos = [] } = loadEntity('ProdutoConsorcio', 'produtosConsorcio');
  const { data: administradoras = [] } = loadEntity('Account', 'accounts');

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.RegraComissao.create({ ...data, empresa_vinculada: empresa }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['regrasComissao', empresa] }); setDialogOpen(false); setSelectedRegra(null); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.RegraComissao.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['regrasComissao', empresa] }); setDialogOpen(false); setSelectedRegra(null); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.RegraComissao.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regrasComissao', empresa] }) });

  const filtered = useMemo(() => { const term = searchTerm.toLowerCase(); return regras.filter((item) => item.nome_regra?.toLowerCase().includes(term) || item.produto?.toLowerCase().includes(term) || item.administradora?.toLowerCase().includes(term)); }, [regras, searchTerm]);
  const kpis = useMemo(() => ({ total: regras.length, ativas: regras.filter((item) => item.status === 'ativa').length, comissaoMedia: regras.length ? (regras.reduce((sum, item) => sum + (item.percentual_base || 0), 0) / regras.length).toFixed(2) : '0.00', produtos: new Set(regras.map((item) => item.produto).filter(Boolean)).size }), [regras]);
  const handleSubmit = (data) => { selectedRegra?.id ? updateMutation.mutate({ id: selectedRegra.id, data }) : createMutation.mutate(data); };
  const exportCSV = () => { const headers = ['Regra', 'Produto', 'Administradora', 'Tipo', 'Base', 'Vendedor', 'Líder', 'Prazo', 'Status']; const rows = filtered.map((item) => [item.nome_regra, item.produto, item.administradora, item.tipo_comissao, item.percentual_base, item.percentual_vendedor, item.percentual_lider, item.prazo_pagamento_dias, item.status]); const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'regras_comissao.csv'; link.click(); window.URL.revokeObjectURL(url); };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Regras de Comissão</h1><p className="text-gray-500 mt-1">Parâmetros comerciais por produto, administradora e perfil de comissão</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button><Button onClick={() => { setSelectedRegra(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nova Regra</Button></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Regras</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Regras Ativas</p><p className="text-2xl font-bold text-green-700">{kpis.ativas}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Comissão Média</p><p className="text-2xl font-bold text-primary">{kpis.comissaoMedia}%</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Produtos com Regra</p><p className="text-2xl font-bold text-blue-700">{kpis.produtos}</p></CardContent></Card></div>
      <div className="bg-white rounded-lg shadow"><div className="p-4 border-b"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar regras..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Regra</TableHead><TableHead>Produto</TableHead><TableHead>Administradora</TableHead><TableHead>Tipo</TableHead><TableHead>Base</TableHead><TableHead>Vendedor</TableHead><TableHead>Líder</TableHead><TableHead>Status</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando regras...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-500"><Percent className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhuma regra encontrada</TableCell></TableRow> : filtered.map((regra) => <TableRow key={regra.id}><TableCell><p className="font-medium">{regra.nome_regra}</p><p className="text-xs text-gray-500">{regra.observacoes || ''}</p></TableCell><TableCell>{regra.produto || '-'}</TableCell><TableCell>{regra.administradora || '-'}</TableCell><TableCell>{tipoLabel[regra.tipo_comissao] || regra.tipo_comissao}</TableCell><TableCell>{regra.percentual_base || 0}%</TableCell><TableCell>{regra.percentual_vendedor || 0}%</TableCell><TableCell>{regra.percentual_lider || 0}%</TableCell><TableCell><Badge>{regra.status || '-'}</Badge></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedRegra(regra); setDialogOpen(true); }}>Editar</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(regra.id)}>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div></div>
      <RegraDialog open={dialogOpen} onOpenChange={setDialogOpen} regra={selectedRegra} produtos={produtos} administradoras={administradoras} onSubmit={handleSubmit} loading={createMutation.isPending || updateMutation.isPending} />
    </div>
  );
}
