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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Megaphone, Plus, Search, Download, MoreVertical, Pencil, Trash2, PlayCircle, PauseCircle, CheckCircle2, Ban } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['rascunho', 'ativa', 'pausada', 'encerrada', 'cancelada'];
const TIPO_OPTIONS = ['digital', 'indicacao', 'parceria', 'evento', 'mailing', 'inbound', 'outbound', 'corban', 'institucional', 'outro'];
const CANAL_OPTIONS = ['whatsapp', 'email', 'landing_page', 'trafego_pago', 'organic_social', 'parceiro', 'evento', 'telefone', 'outro'];

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

const STATUS_COLORS = {
  rascunho: 'bg-gray-100 text-gray-700',
  ativa: 'bg-green-100 text-green-800',
  pausada: 'bg-yellow-100 text-yellow-800',
  encerrada: 'bg-blue-100 text-blue-800',
  cancelada: 'bg-red-100 text-red-800',
};

const TIPO_LABEL = {
  digital: 'Digital',
  indicacao: 'Indicação',
  parceria: 'Parceria',
  evento: 'Evento',
  mailing: 'Mailing',
  inbound: 'Inbound',
  outbound: 'Outbound',
  corban: 'Corban',
  institucional: 'Institucional',
  outro: 'Outro',
};

const CANAL_LABEL = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  landing_page: 'Landing Page',
  trafego_pago: 'Tráfego Pago',
  organic_social: 'Social Orgânico',
  parceiro: 'Parceiro',
  evento: 'Evento',
  telefone: 'Telefone',
  outro: 'Outro',
};

const EMPTY_FORM = {
  nome_campanha: '',
  codigo_campanha: '',
  tipo_campanha: 'digital',
  status_campanha: 'rascunho',
  data_inicio: '',
  data_fim: '',
  orcamento_previsto: '',
  orcamento_realizado: '',
  meta_leads: '',
  meta_oportunidades: '',
  meta_vendas: '',
  meta_valor_cartas: '',
  produto_foco: '',
  administradora_foco: '',
  equipe_responsavel: '',
  responsavel: '',
  canal: 'outro',
  origem: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  publico_alvo: '',
  descricao: '',
  observacoes: '',
};

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(value) {
  if (!Number.isFinite(value)) return '0,0%';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function campaignKeys(campanha) {
  return [campanha?.nome_campanha, campanha?.codigo_campanha]
    .map(normalize)
    .filter(Boolean);
}

function matchesCampaign(record, campanha) {
  const keys = campaignKeys(campanha);
  if (keys.length === 0) return false;
  const values = [record?.campanha, record?.campanha_vinculada, record?.codigo_campanha, record?.utm_campaign]
    .map(normalize)
    .filter(Boolean);
  return values.some((value) => keys.includes(value));
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePayload(form) {
  return {
    ...form,
    nome_campanha: String(form.nome_campanha || '').trim(),
    codigo_campanha: String(form.codigo_campanha || '').trim(),
    orcamento_previsto: toNumber(form.orcamento_previsto),
    orcamento_realizado: toNumber(form.orcamento_realizado),
    meta_leads: toNumber(form.meta_leads),
    meta_oportunidades: toNumber(form.meta_oportunidades),
    meta_vendas: toNumber(form.meta_vendas),
    meta_valor_cartas: toNumber(form.meta_valor_cartas),
  };
}

function buildCampaignMetrics(campanha, { leads, oportunidades, vendas, comissoes }) {
  const linkedLeads = leads.filter((lead) => matchesCampaign(lead, campanha));
  const linkedOportunidades = oportunidades.filter((opp) => matchesCampaign(opp, campanha));
  const linkedVendas = vendas.filter((venda) => matchesCampaign(venda, campanha));
  const vendaIds = new Set(linkedVendas.map((venda) => venda.id).filter(Boolean));
  const linkedComissoes = comissoes.filter((comissao) => matchesCampaign(comissao, campanha) || vendaIds.has(comissao.venda_vinculada));
  const valorCartas = linkedVendas.reduce((sum, venda) => sum + toNumber(venda.valor_carta), 0);
  const comissaoPrevista = linkedComissoes.reduce((sum, comissao) => sum + toNumber(comissao.valor_comissao_total), 0);
  const leadsCount = linkedLeads.length;
  const vendasCount = linkedVendas.length;
  const orcamentoRealizado = toNumber(campanha.orcamento_realizado);

  return {
    leads_gerados: leadsCount,
    oportunidades_geradas: linkedOportunidades.length,
    vendas_geradas: vendasCount,
    valor_cartas: valorCartas,
    comissao_prevista: comissaoPrevista,
    conversao_lead_oportunidade: leadsCount ? (linkedOportunidades.length / leadsCount) * 100 : 0,
    conversao_lead_venda: leadsCount ? (vendasCount / leadsCount) * 100 : 0,
    custo_por_lead: leadsCount ? orcamentoRealizado / leadsCount : 0,
    custo_por_venda: vendasCount ? orcamentoRealizado / vendasCount : 0,
  };
}

function CampanhaDialog({ open, onOpenChange, campanha, onSubmit, loading, produtos, administradoras, equipes, vendedores }) {
  const [form, setForm] = useState(EMPTY_FORM);

  React.useEffect(() => {
    setForm(campanha ? { ...EMPTY_FORM, ...campanha } : EMPTY_FORM);
  }, [campanha, open]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.nome_campanha.trim()) {
      toast.error('Informe o nome da campanha.');
      return;
    }
    onSubmit(normalizePayload(form));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campanha ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome da campanha *</Label>
              <Input value={form.nome_campanha || ''} onChange={(event) => set('nome_campanha', event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input value={form.codigo_campanha || ''} onChange={(event) => set('codigo_campanha', event.target.value)} placeholder="ex: JUL26-CONSORCIO" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status_campanha || 'rascunho'} onValueChange={(value) => set('status_campanha', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo_campanha || 'digital'} onValueChange={(value) => set('tipo_campanha', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_OPTIONS.map((tipo) => <SelectItem key={tipo} value={tipo}>{TIPO_LABEL[tipo]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Select value={form.canal || 'outro'} onValueChange={(value) => set('canal', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CANAL_OPTIONS.map((canal) => <SelectItem key={canal} value={canal}>{CANAL_LABEL[canal]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data início</Label>
              <Input type="date" value={form.data_inicio || ''} onChange={(event) => set('data_inicio', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data fim</Label>
              <Input type="date" value={form.data_fim || ''} onChange={(event) => set('data_fim', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Input value={form.origem || ''} onChange={(event) => set('origem', event.target.value)} placeholder="ex: Meta Ads, indicação, evento" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Orçamento previsto</Label>
              <Input type="number" step="0.01" min="0" value={form.orcamento_previsto || ''} onChange={(event) => set('orcamento_previsto', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Orçamento realizado</Label>
              <Input type="number" step="0.01" min="0" value={form.orcamento_realizado || ''} onChange={(event) => set('orcamento_realizado', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta leads</Label>
              <Input type="number" min="0" value={form.meta_leads || ''} onChange={(event) => set('meta_leads', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta vendas</Label>
              <Input type="number" min="0" value={form.meta_vendas || ''} onChange={(event) => set('meta_vendas', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta oportunidades</Label>
              <Input type="number" min="0" value={form.meta_oportunidades || ''} onChange={(event) => set('meta_oportunidades', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta valor cartas</Label>
              <Input type="number" step="0.01" min="0" value={form.meta_valor_cartas || ''} onChange={(event) => set('meta_valor_cartas', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Produto foco</Label>
              <Select value={form.produto_foco || ''} onValueChange={(value) => set('produto_foco', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{produtos.map((produto) => <SelectItem key={produto.id} value={produto.nome_produto}>{produto.nome_produto}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Administradora foco</Label>
              <Select value={form.administradora_foco || ''} onValueChange={(value) => set('administradora_foco', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{administradoras.map((adm) => <SelectItem key={adm.id} value={adm.razao_social || adm.name}>{adm.razao_social || adm.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Equipe responsável</Label>
              <Select value={form.equipe_responsavel || ''} onValueChange={(value) => set('equipe_responsavel', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{equipes.map((equipe) => <SelectItem key={equipe.id} value={equipe.nome_equipe}>{equipe.nome_equipe}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={form.responsavel || ''} onValueChange={(value) => set('responsavel', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{vendedores.map((vendedor) => <SelectItem key={vendedor.id} value={vendedor.nome}>{vendedor.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Público-alvo</Label>
              <Input value={form.publico_alvo || ''} onChange={(event) => set('publico_alvo', event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>UTM source</Label><Input value={form.utm_source || ''} onChange={(event) => set('utm_source', event.target.value)} /></div>
            <div className="space-y-1.5"><Label>UTM medium</Label><Input value={form.utm_medium || ''} onChange={(event) => set('utm_medium', event.target.value)} /></div>
            <div className="space-y-1.5"><Label>UTM campaign</Label><Input value={form.utm_campaign || ''} onChange={(event) => set('utm_campaign', event.target.value)} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.descricao || ''} onChange={(event) => set('descricao', event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Input value={form.observacoes || ''} onChange={(event) => set('observacoes', event.target.value)} /></div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar campanha'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Campanhas() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [canalFilter, setCanalFilter] = useState('todos');
  const [responsavelFilter, setResponsavelFilter] = useState('todos');
  const [mesFilter, setMesFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampanha, setSelectedCampanha] = useState(null);

  const filterEmpresa = (items) => (items || []).filter((item) => item.empresa_vinculada === empresa);

  const campanhasQuery = useQuery({
    queryKey: ['campanhas', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.Campanhas.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const { data: leads = [] } = useQuery({ queryKey: ['leads', empresa], queryFn: async () => filterEmpresa(await base44.entities.Lead.list('-created_date')), enabled: Boolean(empresa) });
  const { data: oportunidades = [] } = useQuery({ queryKey: ['opportunities', empresa], queryFn: async () => filterEmpresa(await base44.entities.Opportunity.list('-created_date')), enabled: Boolean(empresa) });
  const { data: vendas = [] } = useQuery({ queryKey: ['vendasConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.VendasConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const { data: comissoes = [] } = useQuery({ queryKey: ['comissoes', empresa], queryFn: async () => filterEmpresa(await base44.entities.Comissoes.list('-created_date')), enabled: Boolean(empresa) });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtosConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.ProdutoConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const { data: administradoras = [] } = useQuery({ queryKey: ['accounts', empresa], queryFn: async () => filterEmpresa(await base44.entities.Account.list('-created_date')), enabled: Boolean(empresa) });
  const { data: equipes = [] } = useQuery({ queryKey: ['equipes', empresa], queryFn: async () => filterEmpresa(await base44.entities.EquipeComercial.list('-created_date')), enabled: Boolean(empresa) });
  const { data: vendedores = [] } = useQuery({ queryKey: ['vendedores', empresa], queryFn: async () => filterEmpresa(await base44.entities.Vendedores.list('-created_date')), enabled: Boolean(empresa) });

  const campanhas = useMemo(
    () => applyAccessFilter(campanhasQuery.data || [], user, { vendedorField: 'responsavel', liderField: 'lider', teamMembers }),
    [campanhasQuery.data, teamMembers, user]
  );

  const enriched = useMemo(() => campanhas.map((campanha) => ({
    ...campanha,
    metrics: buildCampaignMetrics(campanha, { leads, oportunidades, vendas, comissoes }),
  })), [campanhas, leads, oportunidades, vendas, comissoes]);

  const responsaveis = useMemo(() => [...new Set(enriched.map((campanha) => campanha.responsavel).filter(Boolean))].sort(), [enriched]);

  const filtered = useMemo(() => {
    const term = normalize(searchTerm);
    return enriched.filter((campanha) => {
      if (statusFilter !== 'todos' && campanha.status_campanha !== statusFilter) return false;
      if (tipoFilter !== 'todos' && campanha.tipo_campanha !== tipoFilter) return false;
      if (canalFilter !== 'todos' && campanha.canal !== canalFilter) return false;
      if (responsavelFilter !== 'todos' && campanha.responsavel !== responsavelFilter) return false;
      if (mesFilter) {
        const inicioMes = campanha.data_inicio?.slice(0, 7);
        const fimMes = campanha.data_fim?.slice(0, 7);
        if (inicioMes !== mesFilter && fimMes !== mesFilter) return false;
      }
      if (!term) return true;
      return [campanha.nome_campanha, campanha.codigo_campanha, campanha.responsavel, campanha.origem, campanha.canal]
        .some((value) => normalize(value).includes(term));
    });
  }, [enriched, canalFilter, mesFilter, responsavelFilter, searchTerm, statusFilter, tipoFilter]);

  const kpis = useMemo(() => ({
    total: enriched.length,
    ativas: enriched.filter((campanha) => campanha.status_campanha === 'ativa').length,
    leads: enriched.reduce((sum, campanha) => sum + campanha.metrics.leads_gerados, 0),
    vendas: enriched.reduce((sum, campanha) => sum + campanha.metrics.vendas_geradas, 0),
    valorCartas: enriched.reduce((sum, campanha) => sum + campanha.metrics.valor_cartas, 0),
    orcamentoPrevisto: enriched.reduce((sum, campanha) => sum + toNumber(campanha.orcamento_previsto), 0),
    orcamentoRealizado: enriched.reduce((sum, campanha) => sum + toNumber(campanha.orcamento_realizado), 0),
  }), [enriched]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Campanhas.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanhas', empresa] });
      setDialogOpen(false);
      setSelectedCampanha(null);
      toast.success('Campanha criada com sucesso.');
    },
    onError: (error) => toast.error(error?.message || 'Erro ao criar campanha.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Campanhas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanhas', empresa] });
      setDialogOpen(false);
      setSelectedCampanha(null);
      toast.success('Campanha atualizada com sucesso.');
    },
    onError: (error) => toast.error(error?.message || 'Erro ao atualizar campanha.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Campanhas.update(id, { status_campanha: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campanhas', empresa] }),
    onError: (error) => toast.error(error?.message || 'Erro ao alterar status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campanhas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanhas', empresa] });
      toast.success('Campanha excluída.');
    },
    onError: (error) => toast.error(error?.message || 'Erro ao excluir campanha.'),
  });

  const handleSubmit = (data) => {
    if (selectedCampanha?.id) updateMutation.mutate({ id: selectedCampanha.id, data });
    else createMutation.mutate(data);
  };

  const exportCSV = () => {
    const headers = ['Campanha', 'Código', 'Tipo', 'Status', 'Canal', 'Responsável', 'Leads', 'Oportunidades', 'Vendas', 'Valor Cartas', 'Comissão Prevista', 'Orçamento Realizado', 'Conversão Lead Venda'];
    const rows = filtered.map((campanha) => [
      campanha.nome_campanha,
      campanha.codigo_campanha,
      TIPO_LABEL[campanha.tipo_campanha] || campanha.tipo_campanha,
      STATUS_LABEL[campanha.status_campanha] || campanha.status_campanha,
      CANAL_LABEL[campanha.canal] || campanha.canal,
      campanha.responsavel,
      campanha.metrics.leads_gerados,
      campanha.metrics.oportunidades_geradas,
      campanha.metrics.vendas_geradas,
      campanha.metrics.valor_cartas,
      campanha.metrics.comissao_prevista,
      campanha.orcamento_realizado,
      campanha.metrics.conversao_lead_venda,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campanhas.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const openCreate = () => { setSelectedCampanha(null); setDialogOpen(true); };
  const openEdit = (campanha) => { setSelectedCampanha(campanha); setDialogOpen(true); };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-500 mt-1">Crie, acompanhe e mensure campanhas comerciais do funil NVION.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />Exportar CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />Nova campanha
          </Button>
        </div>
      </div>

      {campanhasQuery.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {campanhasQuery.error?.message || 'Erro ao carregar campanhas. Verifique se a entidade Campanhas existe no Base44.'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Campanhas</p><p className="text-xl font-bold">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Ativas</p><p className="text-xl font-bold text-green-700">{kpis.ativas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Leads</p><p className="text-xl font-bold text-blue-700">{kpis.leads}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Vendas</p><p className="text-xl font-bold text-primary">{kpis.vendas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Valor cartas</p><p className="text-xl font-bold text-gray-900">{money(kpis.valorCartas)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Orç. previsto</p><p className="text-xl font-bold text-gray-900">{money(kpis.orcamentoPrevisto)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Orç. realizado</p><p className="text-xl font-bold text-gray-900">{money(kpis.orcamentoRealizado)}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar campanha, código ou responsável..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos status</SelectItem>{STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos tipos</SelectItem>{TIPO_OPTIONS.map((tipo) => <SelectItem key={tipo} value={tipo}>{TIPO_LABEL[tipo]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={canalFilter} onValueChange={setCanalFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos canais</SelectItem>{CANAL_OPTIONS.map((canal) => <SelectItem key={canal} value={canal}>{CANAL_LABEL[canal]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos responsáveis</SelectItem>{responsaveis.map((responsavel) => <SelectItem key={responsavel} value={responsavel}>{responsavel}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="month" value={mesFilter} onChange={(event) => setMesFilter(event.target.value)} className="w-44" />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Orçamento</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Valor cartas</TableHead>
                <TableHead>Conversão</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campanhasQuery.isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-10 text-gray-500">Carregando campanhas...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-12 text-gray-500"><Megaphone className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhuma campanha encontrada.</TableCell></TableRow>
              ) : filtered.map((campanha) => (
                <TableRow key={campanha.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{campanha.nome_campanha}</div>
                    <div className="text-xs text-gray-400 font-mono">{campanha.codigo_campanha || '-'}</div>
                  </TableCell>
                  <TableCell>{TIPO_LABEL[campanha.tipo_campanha] || campanha.tipo_campanha || '-'}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[campanha.status_campanha] || 'bg-gray-100 text-gray-700'}>{STATUS_LABEL[campanha.status_campanha] || campanha.status_campanha || '-'}</Badge></TableCell>
                  <TableCell>{formatDate(campanha.data_inicio)} → {formatDate(campanha.data_fim)}</TableCell>
                  <TableCell><div>{money(campanha.orcamento_realizado)}</div><div className="text-xs text-gray-400">prev. {money(campanha.orcamento_previsto)}</div></TableCell>
                  <TableCell>{campanha.metrics.leads_gerados}</TableCell>
                  <TableCell>{campanha.metrics.vendas_geradas}</TableCell>
                  <TableCell>{money(campanha.metrics.valor_cartas)}</TableCell>
                  <TableCell><div>{pct(campanha.metrics.conversao_lead_venda)}</div><div className="text-xs text-gray-400">lead → venda</div></TableCell>
                  <TableCell>{campanha.responsavel || '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(campanha)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: campanha.id, status: 'ativa' })}><PlayCircle className="w-4 h-4 mr-2" />Ativar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: campanha.id, status: 'pausada' })}><PauseCircle className="w-4 h-4 mr-2" />Pausar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: campanha.id, status: 'encerrada' })}><CheckCircle2 className="w-4 h-4 mr-2" />Encerrar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: campanha.id, status: 'cancelada' })}><Ban className="w-4 h-4 mr-2" />Cancelar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(campanha.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <CampanhaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        campanha={selectedCampanha}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        produtos={produtos}
        administradoras={administradoras}
        equipes={equipes}
        vendedores={vendedores}
      />
    </div>
  );
}
