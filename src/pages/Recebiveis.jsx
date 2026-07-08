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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Download, Search, Wallet, MoreVertical, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { validate, recebivelSchema } from '@/lib/validation';

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function addDays(dateStr, days) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function agingLabel(dateStr) {
  if (!dateStr) return null;
  const hoje = new Date();
  const prev = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((prev - hoje) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atrasado`, color: 'text-red-600' };
  if (diff === 0) return { label: 'Vence hoje', color: 'text-orange-600' };
  if (diff <= 7) return { label: `${diff}d`, color: 'text-orange-500' };
  if (diff <= 30) return { label: `${diff}d`, color: 'text-yellow-600' };
  return { label: `${diff}d`, color: 'text-gray-500' };
}

const STATUS_LIST = ['previsto', 'confirmado', 'recebido', 'atrasado', 'cancelado'];
const STATUS_LABEL = { previsto: 'Previsto', confirmado: 'Confirmado', recebido: 'Recebido', atrasado: 'Atrasado', cancelado: 'Cancelado' };
const STATUS_COLORS = {
  previsto: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  recebido: 'bg-green-100 text-green-800',
  atrasado: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-500',
};

function EditDialog({ open, onOpenChange, recebivel, onSubmit, loading }) {
  const [form, setForm] = useState({});
  React.useEffect(() => {
    if (recebivel) setForm({ valor_recebivel: recebivel.valor_recebivel, data_prevista_recebimento: recebivel.data_prevista_recebimento, data_recebimento_real: recebivel.data_recebimento_real || '', elegivel_antecipacao: recebivel.elegivel_antecipacao || false, motivo_inelegibilidade: recebivel.motivo_inelegibilidade || '', observacoes: recebivel.observacoes || '' });
  }, [recebivel, open]);
  const handleSubmit = (e) => {
    e.preventDefault();
    const { ok, errors } = validate(recebivelSchema, form);
    if (!ok) {
      toast.error(Object.values(errors)[0] || 'Verifique os campos do recebível.');
      return;
    }
    if (!form.elegivel_antecipacao && !String(form.motivo_inelegibilidade || '').trim()) {
      toast.error('Informe o motivo da inelegibilidade quando o recebível não for elegível para antecipação.');
      return;
    }
    onSubmit(form);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar Recebível — Parcela {recebivel?.numero_parcela}/{recebivel?.total_parcelas}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Valor da parcela</Label><Input type="number" step="0.01" value={form.valor_recebivel || ''} onChange={(e) => setForm({ ...form, valor_recebivel: e.target.value })} /></div>
            <div><Label>Data prevista recebimento</Label><Input type="date" value={form.data_prevista_recebimento || ''} onChange={(e) => setForm({ ...form, data_prevista_recebimento: e.target.value })} /></div>
            <div><Label>Data recebimento real</Label><Input type="date" value={form.data_recebimento_real || ''} onChange={(e) => setForm({ ...form, data_recebimento_real: e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="elegivel" checked={form.elegivel_antecipacao || false} onChange={(e) => setForm({ ...form, elegivel_antecipacao: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="elegivel">Elegível para antecipação</Label>
            </div>
            <div className="col-span-2"><Label>Motivo inelegibilidade</Label><Input value={form.motivo_inelegibilidade || ''} onChange={(e) => setForm({ ...form, motivo_inelegibilidade: e.target.value })} placeholder="Se não elegível, informe o motivo" /></div>
            <div className="col-span-2"><Label>Observações</Label><Input value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
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

export default function Recebiveis() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterVendedor, setFilterVendedor] = useState('todos');
  const [filterAdministradora, setFilterAdministradora] = useState('todos');
  const [filterMes, setFilterMes] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: allRecebiveis = [], isLoading } = useQuery({
    queryKey: ['recebiveis', empresa],
    queryFn: async () => {
      const all = await db.RecebiveisConsorcio.list('-created_date');
      return all.filter((item) => item.empresa_vinculada === empresa);
    },
    enabled: Boolean(empresa),
  });

  const recebiveis = useMemo(
    () => applyAccessFilter(allRecebiveis, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }),
    [allRecebiveis, user, teamMembers]
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.RecebiveisConsorcio.update(id, {
      ...data,
      valor_recebivel: Number(data.valor_recebivel || 0),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recebiveis', empresa] }); setEditOpen(false); setSelected(null); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => db.RecebiveisConsorcio.update(id, { status_recebivel: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recebiveis', empresa] }),
  });

  const vendedores = useMemo(() => [...new Set(recebiveis.map((r) => r.vendedor).filter(Boolean))].sort(), [recebiveis]);
  const administradoras = useMemo(() => [...new Set(recebiveis.map((r) => r.administradora).filter(Boolean))].sort(), [recebiveis]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return recebiveis.filter((item) => {
      if (filterStatus !== 'todos' && item.status_recebivel !== filterStatus) return false;
      if (filterVendedor !== 'todos' && item.vendedor !== filterVendedor) return false;
      if (filterAdministradora !== 'todos' && item.administradora !== filterAdministradora) return false;
      if (filterMes && item.data_prevista_recebimento?.slice(0, 7) !== filterMes) return false;
      if (term && !item.cliente?.toLowerCase().includes(term) && !item.vendedor?.toLowerCase().includes(term) && !item.produto?.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [recebiveis, filterStatus, filterVendedor, filterAdministradora, filterMes, searchTerm]);

  const kpis = useMemo(() => {
    const ativos = recebiveis.filter((r) => r.status_recebivel !== 'cancelado');
    const aReceber = ativos.filter((r) => ['previsto', 'confirmado', 'atrasado'].includes(r.status_recebivel));
    const recebido = ativos.filter((r) => r.status_recebivel === 'recebido');
    const atrasado = ativos.filter((r) => r.status_recebivel === 'atrasado');
    const elegivel = ativos.filter((r) => r.elegivel_antecipacao);
    return {
      carteira: ativos.reduce((s, r) => s + (r.valor_recebivel || 0), 0),
      aReceber: aReceber.reduce((s, r) => s + (r.valor_recebivel || 0), 0),
      recebido: recebido.reduce((s, r) => s + (r.valor_recebivel || 0), 0),
      atrasado: atrasado.reduce((s, r) => s + (r.valor_recebivel || 0), 0),
      elegivel: elegivel.reduce((s, r) => s + (r.valor_recebivel || 0), 0),
    };
  }, [recebiveis]);

  const exportCSV = () => {
    const headers = ['Cliente', 'Produto', 'Administradora', 'Vendedor', 'Parcela', 'Total Parcelas', 'Valor Recebível', 'Data Prevista', 'Data Real', 'Status', 'Elegível Antecipação'];
    const rows = filtered.map((r) => [r.cliente, r.produto, r.administradora, r.vendedor, r.numero_parcela, r.total_parcelas, r.valor_recebivel, r.data_prevista_recebimento, r.data_recebimento_real, r.status_recebivel, r.elegivel_antecipacao ? 'Sim' : 'Não']);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recebiveis.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recebíveis</h1>
          <p className="text-gray-500 mt-1">Parcelas de comissão a receber por venda de consórcio</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" />Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Carteira Total</p><p className="text-xl font-bold text-gray-900">{money(kpis.carteira)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">A Receber</p><p className="text-xl font-bold text-blue-700">{money(kpis.aReceber)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Recebido</p><p className="text-xl font-bold text-green-700">{money(kpis.recebido)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Atrasado</p><p className="text-xl font-bold text-red-700">{money(kpis.atrasado)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Elegível Antecipação</p><p className="text-xl font-bold text-primary">{money(kpis.elegivel)}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
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
          <Input type="month" value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="w-44" title="Filtrar por mês de vencimento" />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto / Administradora</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Antecipável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8">Carregando recebíveis...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                    <Wallet className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Nenhum recebível encontrado
                  </TableCell>
                </TableRow>
              ) : filtered.map((r) => {
                const aging = agingLabel(r.data_prevista_recebimento);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.cliente || '-'}</TableCell>
                    <TableCell>
                      <div>{r.produto || '-'}</div>
                      <div className="text-xs text-gray-400">{r.administradora || '-'}</div>
                    </TableCell>
                    <TableCell>{r.vendedor || '-'}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{r.numero_parcela}/{r.total_parcelas}</span>
                    </TableCell>
                    <TableCell className="font-semibold">{money(r.valor_recebivel)}</TableCell>
                    <TableCell>{r.data_prevista_recebimento || '-'}</TableCell>
                    <TableCell>
                      {aging && r.status_recebivel !== 'recebido' && r.status_recebivel !== 'cancelado' ? (
                        <span className={`text-xs font-medium ${aging.color}`}>{aging.label}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {r.elegivel_antecipacao
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <AlertCircle className="w-4 h-4 text-gray-300" title={r.motivo_inelegibilidade || ''} />}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[r.status_recebivel] || ''}>
                        {STATUS_LABEL[r.status_recebivel] || r.status_recebivel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelected(r); setEditOpen(true); }}>Editar</DropdownMenuItem>
                          <DropdownMenuItem disabled className="text-xs font-semibold text-gray-400">Alterar status</DropdownMenuItem>
                          {STATUS_LIST.filter((s) => s !== r.status_recebivel).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => updateStatusMutation.mutate({ id: r.id, status: s })}>
                              {STATUS_LABEL[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        recebivel={selected}
        onSubmit={(data) => updateMutation.mutate({ id: selected.id, data })}
        loading={updateMutation.isPending}
      />
    </div>
  );
}
