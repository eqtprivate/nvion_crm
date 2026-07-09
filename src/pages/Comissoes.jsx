import React, { useMemo, useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, DollarSign, MoreVertical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LIST = ['prevista', 'confirmada', 'liberada', 'paga', 'bloqueada', 'estornada', 'cancelada'];

const STATUS_COLORS = {
  prevista: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-blue-100 text-blue-800',
  liberada: 'bg-cyan-100 text-cyan-800',
  paga: 'bg-green-100 text-green-800',
  bloqueada: 'bg-red-100 text-red-800',
  estornada: 'bg-orange-100 text-orange-800',
  cancelada: 'bg-gray-100 dark:bg-muted text-gray-600 dark:text-gray-300',
};

const STATUS_LABEL = {
  prevista: 'Prevista',
  confirmada: 'Confirmada',
  liberada: 'Liberada',
  paga: 'Paga',
  bloqueada: 'Bloqueada',
  estornada: 'Estornada',
  cancelada: 'Cancelada',
};

export default function Comissoes() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterVendedor, setFilterVendedor] = useState('todos');
  const [filterAdministradora, setFilterAdministradora] = useState('todos');
  const [filterMes, setFilterMes] = useState('');

  const { data: allComissoes = [], isLoading } = useQuery({
    queryKey: ['comissoes', empresa],
    queryFn: async () => {
      const all = await db.Comissoes.list('-created_date');
      return all.filter((item) => item.empresa_vinculada === empresa);
    },
    enabled: Boolean(empresa),
  });

  const comissoes = useMemo(
    () => applyAccessFilter(allComissoes, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }),
    [allComissoes, user, teamMembers]
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => db.Comissoes.update(id, { status_comissao: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comissoes', empresa] }),
  });

  const vendedores = useMemo(() => [...new Set(comissoes.map((c) => c.vendedor).filter(Boolean))].sort(), [comissoes]);
  const administradoras = useMemo(() => [...new Set(comissoes.map((c) => c.administradora).filter(Boolean))].sort(), [comissoes]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return comissoes.filter((item) => {
      if (filterStatus !== 'todos' && item.status_comissao !== filterStatus) return false;
      if (filterVendedor !== 'todos' && item.vendedor !== filterVendedor) return false;
      if (filterAdministradora !== 'todos' && item.administradora !== filterAdministradora) return false;
      if (filterMes) {
        const dataCriacao = item.created_date?.slice(0, 7);
        if (dataCriacao !== filterMes) return false;
      }
      if (term && !item.cliente?.toLowerCase().includes(term) && !item.vendedor?.toLowerCase().includes(term) && !item.produto?.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [comissoes, filterStatus, filterVendedor, filterAdministradora, filterMes, searchTerm]);

  const kpis = useMemo(() => {
    const soma = (status) => comissoes.filter((c) => c.status_comissao === status).reduce((s, c) => s + (c.valor_comissao_total || 0), 0);
    return {
      prevista: soma('prevista'),
      confirmada: soma('confirmada'),
      paga: soma('paga'),
      bloqueada: soma('bloqueada'),
      totalVendedor: comissoes.reduce((s, c) => s + (c.valor_comissao_vendedor || 0), 0),
    };
  }, [comissoes]);

  const exportCSV = () => {
    const headers = ['Cliente', 'Produto', 'Administradora', 'Vendedor', 'Líder', 'Valor Carta', 'Comissão Total', 'Comissão Vendedor', 'Comissão Líder', 'Status', 'Data Prevista Pagamento'];
    const rows = filtered.map((item) => [item.cliente, item.produto, item.administradora, item.vendedor, item.lider, item.valor_carta, item.valor_comissao_total, item.valor_comissao_vendedor, item.valor_comissao_lider, item.status_comissao, item.data_prevista_pagamento]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comissoes.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Comissões</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comissões geradas pelas vendas de consórcio</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" />Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Prevista</p><p className="text-xl font-bold text-yellow-700">{money(kpis.prevista)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Confirmada</p><p className="text-xl font-bold text-blue-700">{money(kpis.confirmada)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Paga</p><p className="text-xl font-bold text-green-700">{money(kpis.paga)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Bloqueada</p><p className="text-xl font-bold text-red-700">{money(kpis.bloqueada)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Repasse Vendedores</p><p className="text-xl font-bold text-primary">{money(kpis.totalVendedor)}</p></CardContent></Card>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar por cliente, vendedor, produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAdministradora} onValueChange={setFilterAdministradora}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Administradora" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as administradoras</SelectItem>
              {administradoras.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="month" value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="w-44" title="Filtrar por mês" />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Administradora</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Valor Carta</TableHead>
                <TableHead>Comissão Total</TableHead>
                <TableHead>Repasse Vendedor</TableHead>
                <TableHead>Data Prev. Pgto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8">Carregando comissões...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Nenhuma comissão encontrada
                  </TableCell>
                </TableRow>
              ) : filtered.map((comissao) => (
                <TableRow key={comissao.id}>
                  <TableCell className="font-medium">{comissao.cliente || '-'}</TableCell>
                  <TableCell>{comissao.produto || '-'}</TableCell>
                  <TableCell>{comissao.administradora || '-'}</TableCell>
                  <TableCell>{comissao.vendedor || '-'}</TableCell>
                  <TableCell>{money(comissao.valor_carta)}</TableCell>
                  <TableCell className="font-semibold">{money(comissao.valor_comissao_total)}</TableCell>
                  <TableCell className="text-green-700 font-semibold">{money(comissao.valor_comissao_vendedor)}</TableCell>
                  <TableCell>{comissao.data_prevista_pagamento || '-'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[comissao.status_comissao] || ''}>
                      {STATUS_LABEL[comissao.status_comissao] || comissao.status_comissao}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled className="text-xs font-semibold text-gray-400">Alterar status</DropdownMenuItem>
                        {STATUS_LIST.filter((s) => s !== comissao.status_comissao).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => updateMutation.mutate({ id: comissao.id, status: s })}>
                            {STATUS_LABEL[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
