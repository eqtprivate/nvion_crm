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
import { Plus, Search, Package, MoreVertical, Download } from 'lucide-react';
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
import { PercentInput, formatPercent } from '@/components/forms/MaskedInputs';
import { FieldError } from '@/components/forms/FieldError';
import { validate, produtoConsorcioSchema } from '@/lib/validation';

const categorias = ['imovel', 'veiculo', 'pesados', 'servicos', 'agro', 'outros'];

const categoriaLabel = {
  imovel: 'Imóvel',
  veiculo: 'Veículo',
  pesados: 'Pesados',
  servicos: 'Serviços',
  agro: 'Agro',
  outros: 'Outros',
};

const emptyForm = {
  administradora_vinculada: '',
  nome_produto: '',
  categoria: 'veiculo',
  percentual_comissao_padrao: '',
  prazo_medio_pagamento: '',
  status: 'ativo',
  observacoes: '',
};

function ProdutoDialog({ open, onOpenChange, produto, administradoras, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    setForm(produto ? { ...emptyForm, ...produto } : emptyForm);
    setErrors({});
  }, [produto, open]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const { ok, errors: errs } = validate(produtoConsorcioSchema, form);
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    onSubmit({
      ...form,
      percentual_comissao_padrao: form.percentual_comissao_padrao ? Number(form.percentual_comissao_padrao) : undefined,
      prazo_medio_pagamento: form.prazo_medio_pagamento ? Number(form.prazo_medio_pagamento) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto de Consórcio' : 'Novo Produto de Consórcio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Produto *</Label>
              <Input value={form.nome_produto} onChange={(e) => setForm({ ...form, nome_produto: e.target.value })} placeholder="Ex: Consórcio Imóvel" />
              <FieldError message={errors.nome_produto} />
            </div>
            <div>
              <Label>Administradora</Label>
              <Select value={form.administradora_vinculada || ''} onValueChange={(value) => setForm({ ...form, administradora_vinculada: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione a administradora" /></SelectTrigger>
                <SelectContent>
                  {administradoras.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(value) => setForm({ ...form, categoria: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categorias.map((item) => <SelectItem key={item} value={item}>{categoriaLabel[item]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comissão Padrão</Label>
              <PercentInput value={form.percentual_comissao_padrao || ''} onChange={(value) => setForm({ ...form, percentual_comissao_padrao: value })} placeholder="Ex: 3,50%" />
            </div>
            <div>
              <Label>Prazo Médio de Pagamento (dias)</Label>
              <Input type="number" value={form.prazo_medio_pagamento || ''} onChange={(e) => setForm({ ...form, prazo_medio_pagamento: e.target.value })} placeholder="Ex: 30" />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Input value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Produto'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProdutoConsorcio() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtosConsorcio', empresa],
    queryFn: async () => {
      const all = await base44.entities.ProdutoConsorcio.list('-created_date');
      return all.filter((item) => item.empresa_vinculada === empresa);
    },
    enabled: Boolean(empresa),
  });

  const { data: administradoras = [] } = useQuery({
    queryKey: ['accounts', empresa],
    queryFn: async () => {
      const all = await base44.entities.Account.list('-created_date');
      return all.filter((item) => item.empresa_vinculada === empresa);
    },
    enabled: Boolean(empresa),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProdutoConsorcio.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtosConsorcio', empresa] });
      setDialogOpen(false);
      setSelectedProduto(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProdutoConsorcio.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtosConsorcio', empresa] });
      setDialogOpen(false);
      setSelectedProduto(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProdutoConsorcio.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produtosConsorcio', empresa] }),
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return produtos.filter((item) =>
      item.nome_produto?.toLowerCase().includes(term) ||
      item.administradora_vinculada?.toLowerCase().includes(term) ||
      item.categoria?.toLowerCase().includes(term)
    );
  }, [produtos, searchTerm]);

  const kpis = useMemo(() => ({
    total: produtos.length,
    ativos: produtos.filter((item) => item.status === 'ativo').length,
    administradoras: new Set(produtos.map((item) => item.administradora_vinculada).filter(Boolean)).size,
    comissaoMedia: produtos.length ? (produtos.reduce((sum, item) => sum + (item.percentual_comissao_padrao || 0), 0) / produtos.length).toFixed(2) : '0.00',
  }), [produtos]);

  const handleSubmit = (data) => {
    if (selectedProduto?.id) updateMutation.mutate({ id: selectedProduto.id, data });
    else createMutation.mutate(data);
  };

  const exportCSV = () => {
    const headers = ['Produto', 'Administradora', 'Categoria', 'Comissão Padrão', 'Prazo Médio', 'Status'];
    const rows = filtered.map((item) => [item.nome_produto, item.administradora_vinculada, item.categoria, item.percentual_comissao_padrao, item.prazo_medio_pagamento, item.status]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produtos_consorcio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Produtos de Consórcio</h1>
          <p className="text-gray-500 mt-1">Cadastro de produtos, administradoras, categorias e parâmetros de comissão</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button>
          <Button onClick={() => { setSelectedProduto(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Novo Produto</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Produtos</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Produtos Ativos</p><p className="text-2xl font-bold text-green-700">{kpis.ativos}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Administradoras Vinculadas</p><p className="text-2xl font-bold text-blue-700">{kpis.administradoras}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Comissão Média</p><p className="text-2xl font-bold text-primary">{formatPercent(kpis.comissaoMedia)}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Administradora</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Comissão Padrão</TableHead>
                <TableHead>Prazo Médio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Carregando produtos...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500"><Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhum produto encontrado</TableCell></TableRow>
              ) : filtered.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell><p className="font-medium">{produto.nome_produto}</p><p className="text-xs text-gray-500">{produto.observacoes || ''}</p></TableCell>
                  <TableCell>{produto.administradora_vinculada || '-'}</TableCell>
                  <TableCell>{categoriaLabel[produto.categoria] || produto.categoria || '-'}</TableCell>
                  <TableCell>{produto.percentual_comissao_padrao ? formatPercent(produto.percentual_comissao_padrao) : '-'}</TableCell>
                  <TableCell>{produto.prazo_medio_pagamento ? `${produto.prazo_medio_pagamento} dias` : '-'}</TableCell>
                  <TableCell><Badge>{produto.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedProduto(produto); setDialogOpen(true); }}>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(produto.id)}>Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <ProdutoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        produto={selectedProduto}
        administradoras={administradoras}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
