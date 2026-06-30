import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Target, MoreVertical, Download, Flame, Thermometer, Snowflake, Upload, CheckCircle2, AlertCircle, Clock3, UserX, ListTodo } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LeadDialog, { LEAD_STATUSES, ORIGENS, TIPOS_PROXIMA_ACAO } from '../components/forms/LeadDialog';
import EditLeadDialog from '../components/forms/EditLeadDialog';
import KPICard from '../components/leads/KPICard';
import LeadFilters from '../components/leads/LeadFilters';
import LeadsAnalytics from '../components/leads/LeadsAnalytics';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import { formatCurrency, formatPercent, formatPhone } from '@/components/forms/MaskedInputs';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuote = false;
    for (const char of line) {
      if (char === '"') { inQuote = !inQuote; }
      else if (char === ',' && !inQuote) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  }).filter(row => Object.values(row).some(v => v));
}

const CSV_FIELD_MAP = {
  nome: 'name', name: 'name',
  email: 'email',
  telefone: 'phone', phone: 'phone', fone: 'phone',
  origem: 'origem',
  campanha: 'campanha',
  produto: 'produto_interesse', 'produto de interesse': 'produto_interesse',
  'valor estimado': 'valor_estimado_carta', valor: 'valor_estimado_carta',
  administradora: 'administradora_interesse',
  vendedor: 'vendedor_responsavel', 'vendedor responsavel': 'vendedor_responsavel',
  lider: 'lider_vinculado', 'lider vinculado': 'lider_vinculado',
  temperatura: 'temperatura',
  status: 'status',
  'tipo proxima acao': 'tipo_proxima_acao', 'tipo próxima ação': 'tipo_proxima_acao',
  'data proxima acao': 'data_proxima_acao', 'data próxima ação': 'data_proxima_acao',
  'proxima acao': 'proxima_acao', 'próxima ação': 'proxima_acao',
  observacoes: 'observacoes', 'observações': 'observacoes',
};

function ImportCSVDialog({ open, onOpenChange, onImport, isLoading }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleFile = (e) => {
    setError(''); setRows([]); setDone(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (parsed.length === 0) { setError('Arquivo vazio ou formato inválido.'); return; }
        const mapped = parsed.map(row => {
          const lead = {};
          Object.entries(row).forEach(([k, v]) => {
            const field = CSV_FIELD_MAP[k.toLowerCase()];
            if (field && v) lead[field] = v;
          });
          return lead;
        }).filter(l => l.name);
        if (mapped.length === 0) { setError('Nenhum lead com nome encontrado. Verifique se o CSV tem coluna "nome" ou "name".'); return; }
        setRows(mapped);
      } catch {
        setError('Erro ao processar o arquivo CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = () => {
    onImport(rows, () => { setDone(true); setRows([]); if (fileRef.current) fileRef.current.value = ''; });
  };

  const handleClose = () => { setRows([]); setError(''); setDone(false); if (fileRef.current) fileRef.current.value = ''; onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar Leads via CSV</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">O arquivo deve ter cabeçalhos em português ou inglês. Colunas reconhecidas: <strong>nome, email, telefone, origem, campanha, produto, valor estimado, administradora, vendedor, lider, temperatura, status, tipo próxima ação, data próxima ação, próxima ação, observações</strong>.</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
          {error && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
          {done && <div className="flex items-center gap-2 text-green-700 text-sm"><CheckCircle2 className="w-4 h-4" />{rows.length || 'Os'} leads importados com sucesso!</div>}
          {rows.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">{rows.length} lead(s) encontrado(s) — prévia:</p>
              <div className="overflow-x-auto border rounded">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Telefone</th><th className="p-2 text-left">Origem</th><th className="p-2 text-left">Produto</th><th className="p-2 text-left">Vendedor</th></tr></thead>
                  <tbody>{rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t"><td className="p-2">{r.name || '-'}</td><td className="p-2">{r.email || '-'}</td><td className="p-2">{formatPhone(r.phone) || '-'}</td><td className="p-2">{r.origem || '-'}</td><td className="p-2">{r.produto_interesse || '-'}</td><td className="p-2">{r.vendedor_responsavel || '-'}</td></tr>)}</tbody>
                </table>
                {rows.length > 5 && <p className="text-xs text-gray-400 p-2">… e mais {rows.length - 5} linha(s)</p>}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Fechar</Button>
          {rows.length > 0 && <Button onClick={handleImport} disabled={isLoading}>{isLoading ? 'Importando...' : `Importar ${rows.length} lead(s)`}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_LABELS = Object.fromEntries(LEAD_STATUSES.map(s => [s.value, s.label]));
const ORIGEM_LABELS = Object.fromEntries(ORIGENS.map(o => [o.value, o.label]));
const TIPO_ACAO_LABELS = Object.fromEntries(TIPOS_PROXIMA_ACAO.map(t => [t.value, t.label]));

const STATUS_COLORS = {
  novo_contato: 'bg-blue-100 text-blue-800 border border-blue-200',
  qualificacao: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  simulacao: 'bg-violet-100 text-violet-800 border border-violet-200',
  proposta_enviada: 'bg-amber-100 text-amber-800 border border-amber-200',
  documentacao: 'bg-orange-100 text-orange-800 border border-orange-200',
  em_aprovacao: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  venda_concluida: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  perdida: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const STAGE_VISUALS = {
  all: {
    dot: 'bg-slate-500',
    card: 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70',
    active: 'border-slate-700 bg-slate-100 shadow-sm ring-1 ring-slate-200',
    progress: 'bg-slate-500',
    row: 'border-l-slate-300',
    avatar: 'bg-slate-100 text-slate-700',
  },
  novo_contato: {
    dot: 'bg-blue-500',
    card: 'border-blue-200 bg-blue-50/70 hover:bg-blue-100/70',
    active: 'border-blue-600 bg-blue-100 shadow-sm ring-1 ring-blue-200',
    progress: 'bg-blue-500',
    row: 'border-l-blue-400',
    avatar: 'bg-blue-100 text-blue-700',
  },
  qualificacao: {
    dot: 'bg-indigo-500',
    card: 'border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70',
    active: 'border-indigo-600 bg-indigo-100 shadow-sm ring-1 ring-indigo-200',
    progress: 'bg-indigo-500',
    row: 'border-l-indigo-400',
    avatar: 'bg-indigo-100 text-indigo-700',
  },
  simulacao: {
    dot: 'bg-violet-500',
    card: 'border-violet-200 bg-violet-50/70 hover:bg-violet-100/70',
    active: 'border-violet-600 bg-violet-100 shadow-sm ring-1 ring-violet-200',
    progress: 'bg-violet-500',
    row: 'border-l-violet-400',
    avatar: 'bg-violet-100 text-violet-700',
  },
  proposta_enviada: {
    dot: 'bg-amber-500',
    card: 'border-amber-200 bg-amber-50/70 hover:bg-amber-100/70',
    active: 'border-amber-600 bg-amber-100 shadow-sm ring-1 ring-amber-200',
    progress: 'bg-amber-500',
    row: 'border-l-amber-400',
    avatar: 'bg-amber-100 text-amber-700',
  },
  documentacao: {
    dot: 'bg-orange-500',
    card: 'border-orange-200 bg-orange-50/70 hover:bg-orange-100/70',
    active: 'border-orange-600 bg-orange-100 shadow-sm ring-1 ring-orange-200',
    progress: 'bg-orange-500',
    row: 'border-l-orange-400',
    avatar: 'bg-orange-100 text-orange-700',
  },
  em_aprovacao: {
    dot: 'bg-cyan-500',
    card: 'border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100/70',
    active: 'border-cyan-600 bg-cyan-100 shadow-sm ring-1 ring-cyan-200',
    progress: 'bg-cyan-500',
    row: 'border-l-cyan-400',
    avatar: 'bg-cyan-100 text-cyan-700',
  },
  venda_concluida: {
    dot: 'bg-emerald-500',
    card: 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70',
    active: 'border-emerald-600 bg-emerald-100 shadow-sm ring-1 ring-emerald-200',
    progress: 'bg-emerald-500',
    row: 'border-l-emerald-400',
    avatar: 'bg-emerald-100 text-emerald-700',
  },
  perdida: {
    dot: 'bg-rose-500',
    card: 'border-rose-200 bg-rose-50/70 hover:bg-rose-100/70',
    active: 'border-rose-600 bg-rose-100 shadow-sm ring-1 ring-rose-200',
    progress: 'bg-rose-500',
    row: 'border-l-rose-400',
    avatar: 'bg-rose-100 text-rose-700',
  },
};

const TEMP_ICONS = {
  quente: <Flame className="w-3.5 h-3.5 text-red-500" />,
  morno: <Thermometer className="w-3.5 h-3.5 text-yellow-500" />,
  frio: <Snowflake className="w-3.5 h-3.5 text-blue-500" />,
};

const QUICK_FILTERS = [
  { value: 'all', label: 'Todos', icon: ListTodo },
  { value: 'hoje', label: 'Hoje', icon: Clock3 },
  { value: 'atrasados', label: 'Atrasados', icon: AlertCircle },
  { value: 'sem_responsavel', label: 'Sem responsável', icon: UserX },
  { value: 'sem_proxima_acao', label: 'Sem próxima ação', icon: Clock3 },
  { value: 'quentes', label: 'Quentes', icon: Flame },
];

function getStageVisual(status) {
  return STAGE_VISUALS[status] || STAGE_VISUALS.all;
}

function getStageProgress(status) {
  if (status === 'all') return 100;
  const index = LEAD_STATUSES.findIndex((stage) => stage.value === status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / LEAD_STATUSES.length) * 100);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isFinalStatus(status) {
  return ['venda_concluida', 'perdida'].includes(status);
}

function isDueToday(lead) {
  return !isFinalStatus(lead.status) && lead.data_proxima_acao === todayISO();
}

function isOverdue(lead) {
  return !isFinalStatus(lead.status) && lead.data_proxima_acao && lead.data_proxima_acao < todayISO();
}

function hasNoNextAction(lead) {
  return !isFinalStatus(lead.status) && !lead.proxima_acao && !lead.data_proxima_acao;
}

function formatDateBR(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
}

function matchesQuickFilter(lead, quickFilter) {
  if (quickFilter === 'hoje') return isDueToday(lead);
  if (quickFilter === 'atrasados') return isOverdue(lead);
  if (quickFilter === 'sem_responsavel') return !lead.vendedor_responsavel;
  if (quickFilter === 'sem_proxima_acao') return hasNoNextAction(lead);
  if (quickFilter === 'quentes') return lead.temperatura === 'quente';
  return true;
}

function NextActionBadge({ lead }) {
  if (!lead.proxima_acao && !lead.data_proxima_acao) {
    return <Badge className="bg-gray-100 text-gray-700">Sem próxima ação</Badge>;
  }

  const overdue = isOverdue(lead);
  const today = isDueToday(lead);
  const label = TIPO_ACAO_LABELS[lead.tipo_proxima_acao] || 'Ação';
  const dateText = lead.data_proxima_acao ? formatDateBR(lead.data_proxima_acao) : 'Sem data';

  return (
    <div className="space-y-1 max-w-[220px]">
      <Badge className={overdue ? 'bg-red-100 text-red-800' : today ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}>
        {label} · {dateText}
      </Badge>
      {lead.proxima_acao && <p className="text-xs text-gray-600 truncate">{lead.proxima_acao}</p>}
    </div>
  );
}

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [pendingOpportunityLead, setPendingOpportunityLead] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', origem: 'all', temperatura: 'all' });
  const [activeStage, setActiveStage] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const filterEmpresa = (items) => items.filter((item) => item.empresa_vinculada === empresa);

  const { data: allLeads = [], isLoading } = useQuery({
    queryKey: ['leads', empresa],
    queryFn: async () => { const all = await base44.entities.Lead.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); },
    enabled: !!empresa,
  });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtosConsorcio', empresa], queryFn: async () => filterEmpresa(await base44.entities.ProdutoConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const { data: administradoras = [] } = useQuery({ queryKey: ['accounts', empresa], queryFn: async () => filterEmpresa(await base44.entities.Account.list('-created_date')), enabled: Boolean(empresa) });
  const { data: vendedores = [] } = useQuery({ queryKey: ['vendedores', empresa], queryFn: async () => filterEmpresa(await base44.entities.Vendedores.list('-created_date')), enabled: Boolean(empresa) });
  const { data: equipes = [] } = useQuery({ queryKey: ['equipes', empresa], queryFn: async () => filterEmpresa(await base44.entities.EquipeComercial.list('-created_date')), enabled: Boolean(empresa) });

  const leads = useMemo(
    () => applyAccessFilter(allLeads, user, { liderField: 'lider_vinculado', vendedorField: 'vendedor_responsavel', teamMembers }),
    [allLeads, user, teamMembers]
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads', empresa] }); setDialogOpen(false); },
  });

  const importMutation = useMutation({
    mutationFn: async (rows) => {
      for (const row of rows) {
        await base44.entities.Lead.create({ ...row, status: row.status || 'novo_contato', temperatura: row.temperatura || 'morno', origem: row.origem || 'outro', empresa_vinculada: empresa });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads', empresa] }),
  });

  const handleImport = (rows, onDone) => {
    importMutation.mutate(rows, { onSuccess: onDone });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads', empresa] }); setEditDialogOpen(false); setSelectedLead(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads', empresa] }),
  });

  const convertToOpportunityMutation = useMutation({
    mutationFn: async (lead) => {
      const existing = await base44.entities.Opportunity.list('-created_date');
      const existingOpportunity = existing.find((op) =>
        op.empresa_vinculada === empresa &&
        (op.lead_vinculado === lead.id || op.lead_vinculado === lead.name)
      );

      if (existingOpportunity) return existingOpportunity;

      const opportunity = await base44.entities.Opportunity.create({
        name: `Oportunidade - ${lead.name}`,
        empresa_vinculada: empresa,
        cliente_vinculado: lead.name,
        lead_vinculado: lead.id,
        vendedor: lead.vendedor_responsavel || '',
        lider: lead.lider_vinculado || '',
        administradora_pretendida: lead.administradora_interesse || '',
        produto: lead.produto_interesse || '',
        valor_carta: Number(lead.valor_estimado_carta || 0),
        previsao_fechamento: '',
        probabilidade: lead.temperatura === 'quente' ? 70 : lead.temperatura === 'frio' ? 30 : 50,
        status: 'aberta',
        stage: lead.status && !['novo_contato', 'perdida', 'venda_concluida'].includes(lead.status)
          ? lead.status
          : 'qualificacao',
      });

      await base44.entities.Lead.update(lead.id, {
        status: lead.status === 'venda_concluida' ? lead.status : 'simulacao',
      });

      return opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', empresa] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', empresa] });
    },
  });

  const handleEdit = (lead) => { setSelectedLead(lead); setEditDialogOpen(true); };
  const handleFilterChange = (key, value) => setFilters(p => ({ ...p, [key]: value }));
  const handleClearFilters = () => { setFilters({ status: 'all', origem: 'all', temperatura: 'all' }); setActiveStage('all'); setQuickFilter('all'); };
  const handleConfirmOpportunityFromLead = () => {
    if (!pendingOpportunityLead) return;
    convertToOpportunityMutation.mutate(pendingOpportunityLead);
    setPendingOpportunityLead(null);
  };

  const funnelStages = useMemo(() => {
    const stages = [{ value: 'all', label: 'Todos' }, ...LEAD_STATUSES];
    return stages.map((stage) => {
      const items = stage.value === 'all' ? leads : leads.filter((lead) => lead.status === stage.value);
      return {
        ...stage,
        count: items.length,
        valueTotal: items.reduce((sum, lead) => sum + Number(lead.valor_estimado_carta || 0), 0),
        progress: getStageProgress(stage.value),
        visual: getStageVisual(stage.value),
      };
    });
  }, [leads]);

  const quickCounts = useMemo(() => Object.fromEntries(
    QUICK_FILTERS.map((item) => [item.value, leads.filter((lead) => matchesQuickFilter(lead, item.value)).length])
  ), [leads]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return leads.filter(lead => {
      const matchSearch = !term ||
        lead.name?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.phone?.toLowerCase().includes(term) ||
        formatPhone(lead.phone).toLowerCase().includes(term) ||
        lead.produto_interesse?.toLowerCase().includes(term) ||
        lead.campanha?.toLowerCase().includes(term) ||
        lead.vendedor_responsavel?.toLowerCase().includes(term) ||
        lead.lider_vinculado?.toLowerCase().includes(term);
      const matchStage = activeStage === 'all' || lead.status === activeStage;
      const matchStatus = filters.status === 'all' || lead.status === filters.status;
      const matchOrigem = filters.origem === 'all' || lead.origem === filters.origem;
      const matchTemp = filters.temperatura === 'all' || lead.temperatura === filters.temperatura;
      const matchQuick = matchesQuickFilter(lead, quickFilter);
      return matchSearch && matchStage && matchStatus && matchOrigem && matchTemp && matchQuick;
    });
  }, [leads, searchTerm, filters, activeStage, quickFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const ativos = filtered.filter(l => !['venda_concluida', 'perdida'].includes(l.status)).length;
    const concluidos = filtered.filter(l => l.status === 'venda_concluida').length;
    const perdidos = filtered.filter(l => l.status === 'perdida').length;
    const valorTotal = filtered.reduce((s, l) => s + Number(l.valor_estimado_carta || 0), 0);
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    const taxa = total > 0 ? ((concluidos / total) * 100).toFixed(1) : 0;
    const atrasados = filtered.filter(isOverdue).length;
    const semResponsavel = filtered.filter(l => !l.vendedor_responsavel).length;
    const semProximaAcao = filtered.filter(hasNoNextAction).length;
    return { total, ativos, concluidos, perdidos, valorTotal, ticketMedio, taxa, atrasados, semResponsavel, semProximaAcao };
  }, [filtered]);

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Origem', 'Campanha', 'Produto', 'Valor Estimado (R$)', 'Administradora', 'Vendedor', 'Líder', 'Temperatura', 'Status', 'Último Contato', 'Tipo Próxima Ação', 'Data Próxima Ação', 'Próxima Ação'];
    const rows = filtered.map(l => [
      l.name || '', l.email || '', l.phone || '',
      ORIGEM_LABELS[l.origem] || l.origem || '', l.campanha || '',
      l.produto_interesse || '', l.valor_estimado_carta || 0,
      l.administradora_interesse || '', l.vendedor_responsavel || '',
      l.lider_vinculado || '', l.temperatura || '', STATUS_LABELS[l.status] || l.status || '',
      l.data_ultimo_contato || '', TIPO_ACAO_LABELS[l.tipo_proxima_acao] || l.tipo_proxima_acao || '', l.data_proxima_acao || '', l.proxima_acao || '',
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
          <p className="text-gray-500 mt-1">Cockpit de leads, ações comerciais e conversão para oportunidades</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Importar CSV</span>
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary-dark" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo Lead
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Funil de Prospecção</p>
            <p className="text-xs text-gray-500">Cada etapa possui cor própria para facilitar leitura do pipeline</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setActiveStage('all')}>Limpar etapa</Button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-max flex gap-3 p-3">
            {funnelStages.map((stage) => {
              const visual = stage.visual;
              return (
                <button
                  type="button"
                  key={stage.value}
                  onClick={() => setActiveStage(stage.value)}
                  className={`text-left rounded-xl border px-3 py-3 min-w-[165px] transition ${activeStage === stage.value ? visual.active : visual.card}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${visual.dot}`} />
                      <p className="text-xs font-semibold text-gray-700 truncate">{stage.label}</p>
                    </div>
                    {activeStage === stage.value && <span className="text-[10px] font-semibold text-gray-500 uppercase">ativo</span>}
                  </div>
                  <div className="flex items-end justify-between gap-3 mt-2">
                    <p className="text-2xl font-bold text-gray-900">{stage.count}</p>
                    <p className="text-xs font-medium text-gray-600">{formatCurrency(stage.valueTotal)}</p>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/80 border border-white overflow-hidden">
                    <div className={`h-full rounded-full ${visual.progress}`} style={{ width: `${stage.progress}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <KPICard title="Total de Leads" value={kpis.total} Icon={Target} color="blue" />
        <KPICard title="Em Andamento" value={kpis.ativos} Icon={Target} color="orange" />
        <KPICard title="Vendas Concluídas" value={kpis.concluidos} Icon={Target} color="green" />
        <KPICard title="Perdidos" value={kpis.perdidos} Icon={Target} color="red" />
        <KPICard title="Valor em Carteira" value={formatCurrency(kpis.valorTotal)} Icon={Target} color="purple" />
        <KPICard title="Taxa de Conversão" value={formatPercent(kpis.taxa)} Icon={Target} color="cyan" />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Buscar por nome, telefone, email, produto ou responsável..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <LeadFilters filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={quickFilter === item.value ? 'default' : 'outline'}
                  onClick={() => setQuickFilter(item.value)}
                  className="h-8"
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {item.label}
                  <span className="ml-1.5 text-xs opacity-75">{quickCounts[item.value] || 0}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="hidden lg:table-cell">Origem</TableHead>
                <TableHead className="hidden lg:table-cell">Produto / Valor</TableHead>
                <TableHead>Temp.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Responsável</TableHead>
                <TableHead>Próxima Ação</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-500"><div className="flex flex-col items-center gap-2"><Target className="w-12 h-12 text-gray-300" /><span className="font-medium">Nenhum lead encontrado</span></div></TableCell></TableRow>
              ) : (
                filtered.map(lead => {
                  const stageVisual = getStageVisual(lead.status);
                  return (
                    <TableRow key={lead.id} className={`hover:bg-gray-50 border-l-4 ${stageVisual.row}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${stageVisual.avatar}`}>{lead.name?.charAt(0)?.toUpperCase()}</div>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-xs text-gray-500">{lead.email || lead.vendedor_responsavel || ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{formatPhone(lead.phone) || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm"><Badge variant="outline">{ORIGEM_LABELS[lead.origem] || '-'}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm"><div><p>{lead.produto_interesse || '-'}</p>{lead.valor_estimado_carta && <p className="text-xs text-gray-500">{formatCurrency(lead.valor_estimado_carta)}</p>}</div></TableCell>
                      <TableCell><div className="flex items-center gap-1">{TEMP_ICONS[lead.temperatura]}<span className="text-xs hidden sm:inline capitalize">{lead.temperatura || '-'}</span></div></TableCell>
                      <TableCell>
                        <Select value={lead.status || 'novo_contato'} onValueChange={v => updateMutation.mutate({ id: lead.id, data: { status: v } })}>
                          <SelectTrigger className="h-7 text-xs w-36 border-0 p-0 shadow-none">
                            <Badge className={STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800'}>{STATUS_LABELS[lead.status] || lead.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm"><p>{lead.vendedor_responsavel || '-'}</p>{lead.lider_vinculado && <p className="text-xs text-gray-500">Líder: {lead.lider_vinculado}</p>}</TableCell>
                      <TableCell><NextActionBadge lead={lead} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(lead)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem disabled={convertToOpportunityMutation.isPending} onClick={() => setPendingOpportunityLead(lead)}>Criar oportunidade</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(lead.id)}>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t bg-gray-50 px-4 py-3 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <div><p className="text-gray-500">Valor filtrado</p><p className="font-semibold text-green-700">{formatCurrency(kpis.valorTotal)}</p></div>
          <div><p className="text-gray-500">Ticket médio</p><p className="font-semibold">{formatCurrency(kpis.ticketMedio)}</p></div>
          <div><p className="text-gray-500">Total</p><p className="font-semibold">{kpis.total}</p></div>
          <div><p className="text-gray-500">Atrasados</p><p className="font-semibold text-red-700">{kpis.atrasados}</p></div>
          <div><p className="text-gray-500">Sem responsável</p><p className="font-semibold text-orange-700">{kpis.semResponsavel}</p></div>
          <div><p className="text-gray-500">Sem próxima ação</p><p className="font-semibold text-gray-700">{kpis.semProximaAcao}</p></div>
        </div>
      </div>

      <LeadsAnalytics leads={filtered} />

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={data => createMutation.mutate(data)} isLoading={createMutation.isPending} currentUser={user} produtos={produtos} administradoras={administradoras} vendedores={vendedores} equipes={equipes} />
      <EditLeadDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} lead={selectedLead} onSubmit={data => updateMutation.mutate({ id: selectedLead.id, data })} isLoading={updateMutation.isPending} produtos={produtos} administradoras={administradoras} vendedores={vendedores} equipes={equipes} />
      <ImportCSVDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={handleImport} isLoading={importMutation.isPending} />
      <AlertDialog open={Boolean(pendingOpportunityLead)} onOpenChange={(open) => { if (!open) setPendingOpportunityLead(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar criação da oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>Será criada uma oportunidade para {pendingOpportunityLead?.name || 'este lead'} usando os dados comerciais do lead. O status do lead será atualizado após a criação.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOpportunityFromLead} disabled={convertToOpportunityMutation.isPending}>{convertToOpportunityMutation.isPending ? 'Criando...' : 'Confirmar criação'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
