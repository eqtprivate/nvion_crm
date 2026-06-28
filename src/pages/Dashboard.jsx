import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STAGE_LABELS = { novo_contato: 'Novo Contato', qualificacao: 'Qualificação', simulacao: 'Simulação', proposta_enviada: 'Proposta Enviada', documentacao: 'Documentação', em_aprovacao: 'Em Aprovação', venda_concluida: 'Venda Concluída', perdida: 'Perdida' };
const STATUS_BADGE = { aberta: 'bg-blue-100 text-blue-800', ganha: 'bg-green-100 text-green-800', perdida: 'bg-red-100 text-red-800', suspensa: 'bg-gray-100 text-gray-800' };
const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

function KPI({ title, value, Icon, color }) {
  const colors = { blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50', purple: 'text-purple-600 bg-purple-50', orange: 'text-orange-600 bg-orange-50', cyan: 'text-cyan-600 bg-cyan-50' };
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-500">{title}</span><div className={`p-1.5 rounded-lg ${colors[color]}`}><Icon className="w-4 h-4" /></div></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </CardContent></Card>
  );
}

export default function Dashboard() {
  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: () => base44.entities.Lead.list('-created_date') });
  const { data: oportunidades = [] } = useQuery({ queryKey: ['opportunities'], queryFn: () => base44.entities.Opportunity.list('-created_date') });

  const kpis = useMemo(() => {
    const totalLeads = leads.length;
    const leadsAtivos = leads.filter(l => !['venda_concluida', 'perdida'].includes(l.status)).length;
    const taxaConversao = totalLeads > 0 ? ((leads.filter(l => l.status === 'venda_concluida').length / totalLeads) * 100).toFixed(1) : 0;
    const oppAbertas = oportunidades.filter(o => o.status === 'aberta');
    const oppGanhas = oportunidades.filter(o => o.status === 'ganha');
    const valorPipelineAberto = oppAbertas.reduce((s, o) => s + (o.valor_carta || 0), 0);
    const valorGanho = oppGanhas.reduce((s, o) => s + (o.valor_carta || 0), 0);
    return { totalLeads, leadsAtivos, taxaConversao, oppAbertas: oppAbertas.length, oppGanhas: oppGanhas.length, valorPipelineAberto, valorGanho };
  }, [leads, oportunidades]);

  const pipelinePorEtapa = useMemo(() => {
    const counts = {}; const valores = {};
    oportunidades.filter(o => o.status === 'aberta').forEach(o => { counts[o.stage] = (counts[o.stage] || 0) + 1; valores[o.stage] = (valores[o.stage] || 0) + (o.valor_carta || 0); });
    return Object.keys(STAGE_LABELS).map(k => ({ name: STAGE_LABELS[k], count: counts[k] || 0, valor: Math.round((valores[k] || 0) / 1000) })).filter(s => s.count > 0);
  }, [oportunidades]);

  const rankingVendedores = useMemo(() => {
    const map = {};
    oportunidades.forEach(o => { const v = o.vendedor || 'Sem vendedor'; if (!map[v]) map[v] = { nome: v, ganhas: 0, valor: 0 }; if (o.status === 'ganha') { map[v].ganhas++; map[v].valor += o.valor_carta || 0; } });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [oportunidades]);

  const rankingAdministradoras = useMemo(() => {
    const map = {};
    oportunidades.filter(o => o.status === 'ganha').forEach(o => { const a = o.administradora_pretendida || 'Não informada'; if (!map[a]) map[a] = { nome: a, ganhas: 0, valor: 0 }; map[a].ganhas++; map[a].valor += o.valor_carta || 0; });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [oportunidades]);

  const leadsPorOrigem = useMemo(() => {
    const map = {};
    leads.forEach(l => { const o = l.origem || 'outro'; map[o] = (map[o] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v }));
  }, [leads]);

  const recentesOportunidades = useMemo(() => [...oportunidades].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5), [oportunidades]);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500 mt-1">Visão geral do pipeline de consórcio</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <KPI title="Total de Leads" value={kpis.totalLeads} Icon={Target} color="blue" />
        <KPI title="Leads Ativos" value={kpis.leadsAtivos} Icon={Target} color="orange" />
        <KPI title="Taxa de Conversão" value={`${kpis.taxaConversao}%`} Icon={TrendingUp} color="cyan" />
        <KPI title="Oportunidades Abertas" value={kpis.oppAbertas} Icon={DollarSign} color="purple" />
        <KPI title="Oportunidades Ganhas" value={kpis.oppGanhas} Icon={CheckCircle} color="green" />
        <KPI title="Pipeline Aberto" value={`R$${(kpis.valorPipelineAberto/1000).toFixed(0)}k`} Icon={DollarSign} color="blue" />
        <KPI title="Valor Ganho" value={`R$${(kpis.valorGanho/1000).toFixed(0)}k`} Icon={CheckCircle} color="green" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card><CardHeader><CardTitle className="text-base">Pipeline por Etapa (R$ mil)</CardTitle></CardHeader><CardContent>{pipelinePorEtapa.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sem oportunidades abertas</p> : <ResponsiveContainer width="100%" height={240}><BarChart data={pipelinePorEtapa} layout="vertical" margin={{ left: 100 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}k`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} /><Tooltip formatter={v => `R$ ${v}k`} /><Bar dataKey="valor" fill="#6366f1" name="Valor (R$ mil)" /></BarChart></ResponsiveContainer>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Leads por Origem</CardTitle></CardHeader><CardContent>{leadsPorOrigem.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sem leads</p> : <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={leadsPorOrigem} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>{leadsPorOrigem.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>}</CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card><CardHeader><CardTitle className="text-base">Ranking de Vendedores</CardTitle></CardHeader><CardContent>{rankingVendedores.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Sem dados</p> : <div className="space-y-3">{rankingVendedores.map((v, i) => <div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-5 text-xs font-bold text-gray-400">#{i+1}</span><div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">{v.nome.charAt(0).toUpperCase()}</div><span className="text-sm font-medium truncate max-w-[100px]">{v.nome}</span></div><div className="text-right"><p className="text-sm font-semibold text-green-600">R$ {(v.valor/1000).toFixed(0)}k</p><p className="text-xs text-gray-400">{v.ganhas} ganhas</p></div></div>)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Ranking de Administradoras</CardTitle></CardHeader><CardContent>{rankingAdministradoras.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Sem dados</p> : <div className="space-y-3">{rankingAdministradoras.map((a, i) => <div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-5 text-xs font-bold text-gray-400">#{i+1}</span><span className="text-sm font-medium truncate max-w-[120px]">{a.nome}</span></div><div className="text-right"><p className="text-sm font-semibold text-green-600">R$ ${(a.valor/1000).toFixed(0)}k</p><p className="text-xs text-gray-400">{a.ganhas} vendas</p></div></div>)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Oportunidades Recentes</CardTitle></CardHeader><CardContent>{recentesOportunidades.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Sem oportunidades</p> : <div className="space-y-3">{recentesOportunidades.map((op, i) => <div key={i} className="flex items-center justify-between"><div className="min-w-0"><p className="text-sm font-medium truncate">{op.name}</p><p className="text-xs text-gray-500">{op.produto || '-'} · {op.valor_carta ? `R$ ${op.valor_carta.toLocaleString('pt-BR')}` : '-'}</p></div><Badge className={`ml-2 flex-shrink-0 ${STATUS_BADGE[op.status] || 'bg-gray-100 text-gray-800'}`}>{op.status || '-'}</Badge></div>)}</div>}</CardContent></Card>
      </div>
    </div>
  );
}