import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { MoneyInput, PercentInput, formatCurrency } from '@/components/forms/MaskedInputs';

const emptyForm = { cliente: '', oportunidade_vinculada: '', vendedor: '', lider: '', equipe: '', administradora: '', produto: '', grupo: '', cota: '', valor_carta: '', data_venda: '', percentual_comissao_prevista: '', percentual_vendedor: '', percentual_lider: '', num_parcelas_comissao: '', prazo_primeira_parcela_dias: '', data_prevista_pagamento: '', observacoes: '', status_operacional: 'lancada', status_conciliacao: 'nao_conciliada', status_financeiro: 'comissao_prevista' };
const statusConciliacaoLabel = { nao_conciliada: 'Não conciliada', em_conciliacao: 'Em conciliação', conciliada: 'Conciliada', divergente: 'Divergente' };
const statusOperacionalLabel = { lancada: 'Lançada', documentacao: 'Documentação', em_aprovacao: 'Em aprovação', aprovada: 'Aprovada', concluida: 'Concluída', cancelada: 'Cancelada' };
function money(value) { return formatCurrency(value); }
function calcComissao(valor, percentual) { return Number(valor || 0) * Number(percentual || 0) / 100; }
function fallbackNumber(value, fallback = 0) {
  const parsed = Number(value || 0);
  return parsed || Number(fallback || 0);
}
function isMissingNumber(value) {
  return value === null || value === undefined || value === '' || Number(value || 0) === 0;
}

function VendaDialog({ open, onOpenChange, venda, oportunidades, produtos, equipes, regras, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);
  React.useEffect(() => { setForm(venda ? { ...emptyForm, ...venda } : emptyForm); }, [venda, open]);

  const valorComissao = calcComissao(form.valor_carta, form.percentual_comissao_prevista);
  const valorVendedor = calcComissao(valorComissao, form.percentual_vendedor);
  const valorLider = calcComissao(valorComissao, form.percentual_lider);

  const applyRegra = (nomeProduto, administradora, currentForm) => {
    const regra = regras.find(r => r.status === 'ativa' && r.produto === nomeProduto && (!r.administradora || r.administradora === administradora));
    if (!regra) return currentForm;
    return { ...currentForm, percentual_comissao_prevista: regra.percentual_base || currentForm.percentual_comissao_prevista, percentual_vendedor: regra.percentual_vendedor || '', percentual_lider: regra.percentual_lider || '', num_parcelas_comissao: regra.num_parcelas_comissao || currentForm.num_parcelas_comissao, prazo_primeira_parcela_dias: regra.prazo_primeira_parcela_dias || currentForm.prazo_primeira_parcela_dias };
  };

  const handleOpportunity = (id) => {
    const oportunidade = oportunidades.find((item) => item.id === id);
    const next = { ...form, oportunidade_vinculada: id, cliente: oportunidade?.cliente_vinculado || form.cliente, vendedor: oportunidade?.vendedor || form.vendedor, lider: oportunidade?.lider || form.lider, administradora: oportunidade?.administradora_pretendida || form.administradora, produto: oportunidade?.produto || form.produto, valor_carta: oportunidade?.valor_carta || form.valor_carta };
    setForm(applyRegra(next.produto, next.administradora, next));
  };

  const handleProduto = (nome) => {
    const produto = produtos.find((item) => item.nome_produto === nome);
    const next = { ...form, produto: nome, administradora: produto?.administradora_vinculada || form.administradora };
    setForm(applyRegra(nome, next.administradora, next));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...form, valor_carta: Number(form.valor_carta || 0), percentual_comissao_prevista: Number(form.percentual_comissao_prevista || 0), percentual_vendedor: Number(form.percentual_vendedor || 0), percentual_lider: Number(form.percentual_lider || 0), num_parcelas_comissao: Number(form.num_parcelas_comissao || 1), prazo_primeira_parcela_dias: Number(form.prazo_primeira_parcela_dias || 30), valor_comissao_prevista: valorComissao, valor_comissao_vendedor: valorVendedor, valor_comissao_lider: valorLider });
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
            <div><Label>Valor da carta *</Label><MoneyInput required value={form.valor_carta || ''} onChange={(value) => setForm({ ...form, valor_carta: value })} /></div>
            <div><Label>Grupo</Label><Input value={form.grupo || ''} onChange={(e) => setForm({ ...form, grupo: e.target.value })} /></div>
            <div><Label>Cota</Label><Input value={form.cota || ''} onChange={(e) => setForm({ ...form, cota: e.target.value })} /></div>
            <div><Label>Comissão base</Label><PercentInput value={form.percentual_comissao_prevista || ''} onChange={(value) => setForm({ ...form, percentual_comissao_prevista: value })} /></div>
            <div><Label>Percentual do vendedor</Label><PercentInput value={form.percentual_vendedor || ''} onChange={(value) => setForm({ ...form, percentual_vendedor: value })} /></div>
            <div><Label>Percentual do líder</Label><PercentInput value={form.percentual_lider || ''} onChange={(value) => setForm({ ...form, percentual_lider: value })} /></div>
            <div><Label>Comissão total prevista</Label><Input value={money(valorComissao)} disabled /></div>
            <div><Label>Comissão vendedor</Label><Input value={money(valorVendedor)} disabled /></div>
            <div><Label>Comissão líder</Label><Input value={money(valorLider)} disabled /></div>
            <div><Label>Nº de parcelas da comissão</Label><Input type="number" min="1" max="60" placeholder="Ex: 3" value={form.num_parcelas_comissao || ''} onChange={(e) => setForm({ ...form, num_parcelas_comissao: e.target.value })} /></div>
            <div><Label>Prazo 1ª parcela (dias)</Label><Input type="number" min="1" placeholder="Ex: 30" value={form.prazo_primeira_parcela_dias || ''} onChange={(e) => setForm({ ...form, prazo_primeira_parcela_dias: e.target.value })} /></div>
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
  const backfillKeyRef = useRef('');
  const filterEmpresa = (items) => items.filter((item) => item.empresa_vinculada === empresa);

  const { data: allVendas = [], isLoading } = useQuery({ queryKey: ['vendasConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.VendasConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const vendas = useMemo(
    () => applyAccessFilter(allVendas, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }),
    [allVendas, user, teamMembers]
  );
  const { data: oportunidades = [] } = useQuery({ queryKey: ['opportunities', empresa], queryFn: async () => filterEmpresa(await base44.entities.Opportunity.list('-created_date')), enabled: Boolean(empresa) });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtosConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.ProdutoConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const { data: equipes = [] } = useQuery({ queryKey: ['equipes', empresa], queryFn: async () => filterEmpresa(await base44.entities.EquipeComercial.list('-created_date')), enabled: Boolean(empresa) });
  const { data: regras = [] } = useQuery({ queryKey: ['regrasComissao', empresa], queryFn: async () => filterEmpresa(await base44.entities.RegrasComissao.list('-created_date')), enabled: Boolean(empresa) });
  const { data: comissoes = [], isLoading: isLoadingComissoes } = useQuery({ queryKey: ['comissoes', empresa], queryFn: async () => filterEmpresa(await base44.entities.Comissoes.list('-created_date')), enabled: Boolean(empresa) });

  const encontrarRegraAtiva = (venda) =>
    regras.find((r) => r.status === 'ativa' && r.produto === venda.produto && (!r.administradora || r.administradora === venda.administradora));

  const gerarComissao = async (vendaId, data) => {
    const regra = encontrarRegraAtiva(data);
    const valorCarta = Number(data.valor_carta || 0);
    const percentualBase = fallbackNumber(data.percentual_comissao_prevista, regra?.percentual_base);
    const valorComissaoTotal = fallbackNumber(data.valor_comissao_prevista, calcComissao(valorCarta, percentualBase));
    const percentualVendedor = fallbackNumber(data.percentual_vendedor, regra?.percentual_vendedor);
    const percentualLider = fallbackNumber(data.percentual_lider, regra?.percentual_lider);
    const valorComissaoVendedor = fallbackNumber(data.valor_comissao_vendedor, calcComissao(valorComissaoTotal, percentualVendedor));
    const valorComissaoLider = fallbackNumber(data.valor_comissao_lider, calcComissao(valorComissaoTotal, percentualLider));

    return base44.entities.Comissoes.create({
      empresa_vinculada: empresa,
      venda_vinculada: vendaId,
      cliente: data.cliente,
      administradora: data.administradora,
      produto: data.produto,
      vendedor: data.vendedor,
      lider: data.lider,
      equipe: data.equipe,
      valor_carta: valorCarta,
      regra_comissao: regra?.nome_regra || '',
      percentual_base: percentualBase,
      valor_comissao_total: valorComissaoTotal,
      percentual_vendedor: percentualVendedor,
      valor_comissao_vendedor: valorComissaoVendedor,
      percentual_lider: percentualLider,
      valor_comissao_lider: valorComissaoLider,
      data_prevista_pagamento: data.data_prevista_pagamento,
      status_comissao: 'prevista',
      origem: 'venda',
    });
  };

  const repararComissaoExistente = async (venda, comissao) => {
    const camposReparaveis = [
      'percentual_vendedor',
      'valor_comissao_vendedor',
      'percentual_lider',
      'valor_comissao_lider',
    ];
    const precisaReparo = camposReparaveis.some((campo) => isMissingNumber(comissao[campo]));
    if (!precisaReparo) return false;

    const regra = encontrarRegraAtiva(venda);
    const valorCarta = Number(venda.valor_carta || comissao.valor_carta || 0);
    const percentualBase = fallbackNumber(comissao.percentual_base, fallbackNumber(venda.percentual_comissao_prevista, regra?.percentual_base));
    const valorComissaoTotal = fallbackNumber(comissao.valor_comissao_total, fallbackNumber(venda.valor_comissao_prevista, calcComissao(valorCarta, percentualBase)));
    const percentualVendedor = fallbackNumber(comissao.percentual_vendedor, regra?.percentual_vendedor);
    const percentualLider = fallbackNumber(comissao.percentual_lider, regra?.percentual_lider);
    const valorComissaoVendedor = fallbackNumber(comissao.valor_comissao_vendedor, calcComissao(valorComissaoTotal, percentualVendedor));
    const valorComissaoLider = fallbackNumber(comissao.valor_comissao_lider, calcComissao(valorComissaoTotal, percentualLider));

    await base44.entities.Comissoes.update(comissao.id, {
      percentual_vendedor: percentualVendedor,
      valor_comissao_vendedor: valorComissaoVendedor,
      percentual_lider: percentualLider,
      valor_comissao_lider: valorComissaoLider,
    });
    return true;
  };

  const gerarRecebiveis = async (vendaId, comissaoId, data) => {
    const numParcelas = Number(data.num_parcelas_comissao || 1);
    const prazo = Number(data.prazo_primeira_parcela_dias || 30);
    const valorTotal = Number(data.valor_comissao_prevista || 0);
    const valorParcela = numParcelas > 0 ? valorTotal / numParcelas : valorTotal;
    const dataBase = data.data_venda || new Date().toISOString().slice(0, 10);
    for (let i = 0; i < numParcelas; i++) {
      const d = new Date(dataBase + 'T00:00:00');
      d.setDate(d.getDate() + prazo + i * 30);
      await base44.entities.RecebiveisConsorcio.create({
        empresa_vinculada: empresa,
        venda_vinculada: vendaId,
        comissao_vinculada: comissaoId || '',
        cliente: data.cliente,
        administradora: data.administradora,
        produto: data.produto,
        vendedor: data.vendedor,
        lider: data.lider,
        valor_carta: Number(data.valor_carta || 0),
        valor_recebivel: valorParcela,
        numero_parcela: i + 1,
        total_parcelas: numParcelas,
        data_prevista_recebimento: d.toISOString().slice(0, 10),
        status_recebivel: 'previsto',
        elegivel_antecipacao: false,
      });
    }
  };

  const cancelarRecebiveisDaVenda = async (vendaId) => {
    const todos = await base44.entities.RecebiveisConsorcio.list('-created_date');
    const vinculados = filterEmpresa(todos).filter((r) => r.venda_vinculada === vendaId && r.status_recebivel === 'previsto');
    await Promise.all(vinculados.map((r) => base44.entities.RecebiveisConsorcio.update(r.id, { status_recebivel: 'cancelado' })));
  };

  const cancelarComissoesDaVenda = async (vendaId) => {
    const todas = await base44.entities.Comissoes.list('-created_date');
    const vinculadas = filterEmpresa(todas).filter((comissao) => comissao.venda_vinculada === vendaId);
    await Promise.all(vinculadas.map((comissao) =>
      base44.entities.Comissoes.update(comissao.id, { status_comissao: 'cancelada' })
    ));
  };

  const concluirOportunidadeVinculada = async (data) => {
    if (!data.oportunidade_vinculada) return;

    const oportunidade = oportunidades.find((item) =>
      item.id === data.oportunidade_vinculada || item.name === data.oportunidade_vinculada
    );
    if (!oportunidade) return;

    await base44.entities.Opportunity.update(oportunidade.id, {
      status: 'ganha',
      stage: 'venda_concluida',
    });

    if (!oportunidade.lead_vinculado) return;

    const leads = filterEmpresa(await base44.entities.Lead.list('-created_date'));
    const lead = leads.find((item) =>
      item.id === oportunidade.lead_vinculado || item.name === oportunidade.lead_vinculado
    );

    if (lead) {
      await base44.entities.Lead.update(lead.id, { status: 'venda_concluida' });
    }
  };

  const atualizarComissao = async (vendaId, data) => {
    const todas = await base44.entities.Comissoes.list('-created_date');
    const existente = filterEmpresa(todas).find((c) => c.venda_vinculada === vendaId);
    const payload = {
      cliente: data.cliente, administradora: data.administradora, produto: data.produto,
      vendedor: data.vendedor, lider: data.lider, equipe: data.equipe, valor_carta: data.valor_carta,
      percentual_base: data.percentual_comissao_prevista, valor_comissao_total: data.valor_comissao_prevista,
      percentual_vendedor: data.percentual_vendedor, valor_comissao_vendedor: data.valor_comissao_vendedor,
      percentual_lider: data.percentual_lider, valor_comissao_lider: data.valor_comissao_lider,
      data_prevista_pagamento: data.data_prevista_pagamento,
    };
    if (existente) {
      await base44.entities.Comissoes.update(existente.id, payload);
    } else {
      await gerarComissao(vendaId, data);
    }
  };

  useEffect(() => {
    if (!empresa || isLoading || isLoadingComissoes || vendas.length === 0 || regras.length === 0) return;

    const backfillKey = `${empresa}:${vendas.length}:${comissoes.length}:${regras.length}`;
    if (backfillKeyRef.current === backfillKey) return;

    const comissoesPorVenda = new Map(comissoes.map((comissao) => [comissao.venda_vinculada, comissao]).filter(([vendaId]) => Boolean(vendaId)));
    const vendasComComissao = new Set(comissoesPorVenda.keys());
    const vendasSemComissao = vendas.filter((venda) =>
      venda.id && venda.status_operacional !== 'cancelada' && !vendasComComissao.has(venda.id)
    );
    const reparos = vendas
      .filter((venda) => venda.id && venda.status_operacional !== 'cancelada' && comissoesPorVenda.has(venda.id))
      .map((venda) => repararComissaoExistente(venda, comissoesPorVenda.get(venda.id)));

    backfillKeyRef.current = backfillKey;
    const operacoes = [
      ...vendasSemComissao.map((venda) => gerarComissao(venda.id, venda)),
      ...reparos,
    ];
    if (operacoes.length === 0) return;

    Promise.all(operacoes)
      .then((resultados) => {
        if (vendasSemComissao.length > 0 || resultados.some(Boolean)) {
          queryClient.invalidateQueries({ queryKey: ['comissoes', empresa] });
        }
      })
      .catch((error) => console.error('Erro ao gerar comissões retroativas:', error));
  }, [comissoes, empresa, isLoading, isLoadingComissoes, queryClient, regras, vendas]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const venda = await base44.entities.VendasConsorcio.create({ ...data, empresa_vinculada: empresa });
      const comissao = await gerarComissao(venda.id, data);
      await gerarRecebiveis(venda.id, comissao?.id, data);
      await concluirOportunidadeVinculada(data);
      return venda;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] }); queryClient.invalidateQueries({ queryKey: ['comissoes', empresa] }); queryClient.invalidateQueries({ queryKey: ['recebiveis', empresa] }); queryClient.invalidateQueries({ queryKey: ['opportunities', empresa] }); queryClient.invalidateQueries({ queryKey: ['leads', empresa] }); setDialogOpen(false); setSelectedVenda(null); },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const venda = await base44.entities.VendasConsorcio.update(id, data);
      await atualizarComissao(id, data);
      return venda;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] }); queryClient.invalidateQueries({ queryKey: ['comissoes', empresa] }); setDialogOpen(false); setSelectedVenda(null); },
  });
  const cancelMutation = useMutation({
    mutationFn: async (venda) => {
      await base44.entities.VendasConsorcio.update(venda.id, {
        status_operacional: 'cancelada',
        status_financeiro: 'comissao_cancelada',
      });
      await cancelarComissoesDaVenda(venda.id);
      await cancelarRecebiveisDaVenda(venda.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] }); queryClient.invalidateQueries({ queryKey: ['comissoes', empresa] }); queryClient.invalidateQueries({ queryKey: ['recebiveis', empresa] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await cancelarComissoesDaVenda(id);
      await cancelarRecebiveisDaVenda(id);
      return base44.entities.VendasConsorcio.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] }); queryClient.invalidateQueries({ queryKey: ['comissoes', empresa] }); queryClient.invalidateQueries({ queryKey: ['recebiveis', empresa] }); },
  });

  const filtered = useMemo(() => { const term = searchTerm.toLowerCase(); return vendas.filter((item) => item.cliente?.toLowerCase().includes(term) || item.vendedor?.toLowerCase().includes(term) || item.administradora?.toLowerCase().includes(term) || item.produto?.toLowerCase().includes(term)); }, [vendas, searchTerm]);
  const kpis = useMemo(() => ({ total: vendas.length, valorCartas: vendas.reduce((sum, item) => sum + (item.valor_carta || 0), 0), comissaoPrevista: vendas.reduce((sum, item) => sum + (item.valor_comissao_prevista || 0), 0), comissaoVendedores: vendas.reduce((sum, item) => sum + (item.valor_comissao_vendedor || 0), 0), naoConciliadas: vendas.filter((item) => item.status_conciliacao === 'nao_conciliada').length }), [vendas]);
  const handleSubmit = (data) => { selectedVenda?.id ? updateMutation.mutate({ id: selectedVenda.id, data }) : createMutation.mutate(data); };
  const exportCSV = () => { const headers = ['Cliente', 'Produto', 'Administradora', 'Vendedor', 'Valor Carta', 'Comissão Prevista']; const rows = filtered.map((item) => [item.cliente, item.produto, item.administradora, item.vendedor, item.valor_carta, item.valor_comissao_prevista]); const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'vendas_consorcio.csv'; link.click(); window.URL.revokeObjectURL(url); };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4"><div><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendas de Consórcio</h1><p className="text-gray-500 mt-1">Registro das vendas realizadas e comissão prevista</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button><Button onClick={() => { setSelectedVenda(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nova Venda</Button></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Vendas</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Valor Total de Cartas</p><p className="text-2xl font-bold text-blue-700">{money(kpis.valorCartas)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Comissão Prevista</p><p className="text-2xl font-bold text-green-700">{money(kpis.comissaoPrevista)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-gray-500">Repasse Vendedores</p><p className="text-2xl font-bold text-primary">{money(kpis.comissaoVendedores)}</p></CardContent></Card></div>
      <div className="bg-white rounded-lg shadow"><div className="p-4 border-b"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar vendas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Produto</TableHead><TableHead>Administradora</TableHead><TableHead>Vendedor</TableHead><TableHead>Valor Carta</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead><TableHead>Conciliação</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando vendas...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-500"><ReceiptText className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhuma venda encontrada</TableCell></TableRow> : filtered.map((venda) => <TableRow key={venda.id}><TableCell>{venda.cliente}</TableCell><TableCell>{venda.produto || '-'}</TableCell><TableCell>{venda.administradora || '-'}</TableCell><TableCell>{venda.vendedor || '-'}</TableCell><TableCell>{money(venda.valor_carta)}</TableCell><TableCell>{money(venda.valor_comissao_prevista)}</TableCell><TableCell><Badge variant={venda.status_operacional === 'cancelada' ? 'secondary' : 'default'}>{statusOperacionalLabel[venda.status_operacional] || venda.status_operacional || '-'}</Badge></TableCell><TableCell><Badge>{statusConciliacaoLabel[venda.status_conciliacao] || venda.status_conciliacao}</Badge></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedVenda(venda); setDialogOpen(true); }}>Editar</DropdownMenuItem>{venda.status_operacional !== 'cancelada' && <DropdownMenuItem onClick={() => cancelMutation.mutate(venda)}>Cancelar venda</DropdownMenuItem>}<DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(venda.id)}>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div></div>
      <VendaDialog open={dialogOpen} onOpenChange={setDialogOpen} venda={selectedVenda} oportunidades={oportunidades} produtos={produtos} equipes={equipes} regras={regras} onSubmit={handleSubmit} loading={createMutation.isPending || updateMutation.isPending || cancelMutation.isPending} />
    </div>
  );
}
