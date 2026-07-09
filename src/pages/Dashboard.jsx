import React, { useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, DollarSign, CheckCircle, Percent, Receipt, Gauge } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import OnboardingBanner from '@/components/onboarding/OnboardingBanner';
import EmptyState from '@/components/EmptyState';
import { CardsSkeleton } from '@/components/Skeletons';
import { useChartPalette } from '@/lib/chartPalette';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';

const STAGE_LABEL = {
  novo_contato: 'Novo contato', qualificacao: 'Qualificação', simulacao: 'Simulação',
  proposta_enviada: 'Proposta', documentacao: 'Documentação', em_aprovacao: 'Em aprovação',
  venda_concluida: 'Concluída', perdida: 'Perdida',
};
const LEAD_STATUS_LABEL = {
  novo_contato: 'Novo', qualificacao: 'Qualificação', simulacao: 'Simulação',
  proposta_enviada: 'Proposta', documentacao: 'Documentação', em_aprovacao: 'Aprovação',
  venda_concluida: 'Concluída', perdida: 'Perdida',
};
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-900 dark:text-gray-100 mb-0.5">{label}</p>
      <p className="text-gray-600 dark:text-gray-300">{formatter ? formatter(payload[0].value) : payload[0].value}</p>
    </div>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function KPI({ title, value, Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);

  const { data: allLeads = [], isLoading: loadingLeads } = useQuery({ queryKey: ['leads', empresa], queryFn: async () => { const all = await db.Lead.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); }, enabled: !!empresa });
  const { data: allOportunidades = [], isLoading: loadingOps } = useQuery({ queryKey: ['opportunities', empresa], queryFn: async () => { const all = await db.Opportunity.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); }, enabled: !!empresa });
  const isLoading = loadingLeads || loadingOps;

  const leads = useMemo(() => applyAccessFilter(allLeads, user, { liderField: 'lider_vinculado', vendedorField: 'vendedor_responsavel', teamMembers }), [allLeads, user, teamMembers]);
  const oportunidades = useMemo(() => applyAccessFilter(allOportunidades, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }), [allOportunidades, user, teamMembers]);

  const kpis = useMemo(() => {
    const totalLeads = leads.length;
    const leadsAtivos = leads.filter((lead) => !['venda_concluida', 'perdida'].includes(lead.status)).length;
    const abertas = oportunidades.filter((item) => item.status === 'aberta');
    const ganhas = oportunidades.filter((item) => item.status === 'ganha');
    const perdidas = oportunidades.filter((item) => item.status === 'perdida');
    const pipelineAberto = abertas.reduce((sum, item) => sum + (item.valor_carta || 0), 0);
    const valorGanho = ganhas.reduce((sum, item) => sum + (item.valor_carta || 0), 0);
    const conversao = totalLeads > 0 ? ((leads.filter((lead) => lead.status === 'venda_concluida').length / totalLeads) * 100).toFixed(1) : '0.0';

    // Novos indicadores.
    const ticketMedio = ganhas.length > 0 ? valorGanho / ganhas.length : 0;
    const decididas = ganhas.length + perdidas.length;
    const winRate = decididas > 0 ? ((ganhas.length / decididas) * 100).toFixed(1) : '0.0';
    const pipelinePonderado = abertas.reduce((sum, item) => sum + (item.valor_carta || 0) * ((item.probabilidade || 0) / 100), 0);
    const now = new Date();
    const vendasMes = ganhas.filter((item) => {
      const ref = item.previsao_fechamento || item.created_date;
      if (!ref) return false;
      const d = new Date(ref);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return { totalLeads, leadsAtivos, abertas: abertas.length, ganhas: ganhas.length, pipelineAberto, valorGanho, conversao, ticketMedio, winRate, pipelinePonderado, vendasMes };
  }, [leads, oportunidades]);

  const palette = useChartPalette();

  const charts = useMemo(() => {
    // Pipeline por estágio (oportunidades abertas).
    const abertas = oportunidades.filter((o) => o.status === 'aberta');
    const stageCount = {};
    abertas.forEach((o) => { const k = o.stage || 'novo_contato'; stageCount[k] = (stageCount[k] || 0) + 1; });
    const pipeline = Object.keys(STAGE_LABEL)
      .filter((k) => k !== 'perdida' && stageCount[k])
      .map((k) => ({ name: STAGE_LABEL[k], value: stageCount[k] }));

    // Leads por status.
    const leadCount = {};
    leads.forEach((l) => { const k = l.status || 'novo_contato'; leadCount[k] = (leadCount[k] || 0) + 1; });
    const leadsStatus = Object.keys(LEAD_STATUS_LABEL)
      .filter((k) => leadCount[k])
      .map((k) => ({ name: LEAD_STATUS_LABEL[k], value: leadCount[k] }));

    // Evolução de valor ganho nos últimos 6 meses.
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: MESES[d.getMonth()], value: 0 });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    oportunidades.filter((o) => o.status === 'ganha').forEach((o) => {
      const ref = o.previsao_fechamento || o.created_date;
      if (!ref) return;
      const d = new Date(ref);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (k in idx) buckets[idx[k]].value += o.valor_carta || 0;
    });

    return { pipeline, leadsStatus, evolucao: buckets };
  }, [oportunidades, leads]);

  const recentes = [...oportunidades].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Painel Geral</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral da operação comercial de consórcios</p>
      </div>

      <OnboardingBanner />

      {isLoading ? <div className="mb-6"><CardsSkeleton count={10} /></div> : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <KPI title="Total de Leads" value={kpis.totalLeads} Icon={Target} />
        <KPI title="Leads Ativos" value={kpis.leadsAtivos} Icon={Target} />
        <KPI title="Taxa de Conversão" value={kpis.conversao + '%'} Icon={TrendingUp} />
        <KPI title="Win Rate" value={kpis.winRate + '%'} Icon={Percent} />
        <KPI title="Vendas no Mês" value={kpis.vendasMes} Icon={CheckCircle} />
        <KPI title="Oportunidades Abertas" value={kpis.abertas} Icon={DollarSign} />
        <KPI title="Oportunidades Ganhas" value={kpis.ganhas} Icon={CheckCircle} />
        <KPI title="Ticket Médio" value={money(kpis.ticketMedio)} Icon={Receipt} />
        <KPI title="Pipeline Aberto" value={money(kpis.pipelineAberto)} Icon={DollarSign} />
        <KPI title="Pipeline Ponderado" value={money(kpis.pipelinePonderado)} Icon={Gauge} />
      </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Valor ganho por mês (últimos 6 meses)</CardTitle></CardHeader>
            <CardContent>
              {charts.evolucao.every((b) => b.value === 0) ? (
                <EmptyState icon={TrendingUp} title="Sem vendas ganhas no período" description="O valor ganho por mês aparecerá aqui." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={charts.evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradGanho" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={palette.blue} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={palette.blue} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: palette.text, fontSize: 12 }} axisLine={{ stroke: palette.grid }} tickLine={false} />
                    <YAxis tick={{ fill: palette.text, fontSize: 12 }} axisLine={false} tickLine={false} width={72}
                      tickFormatter={(v) => `R$ ${(v / 1000).toLocaleString('pt-BR')}k`} />
                    <Tooltip content={<ChartTooltip formatter={money} />} cursor={{ stroke: palette.axis, strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="value" stroke={palette.blue} strokeWidth={2} fill="url(#gradGanho)" dot={{ r: 3, fill: palette.blue }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline por estágio</CardTitle></CardHeader>
            <CardContent>
              {charts.pipeline.length === 0 ? (
                <EmptyState icon={DollarSign} title="Sem oportunidades abertas" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={charts.pipeline} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: palette.text, fontSize: 11 }} axisLine={{ stroke: palette.grid }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={54} />
                    <YAxis allowDecimals={false} tick={{ fill: palette.text, fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: palette.grid, fillOpacity: 0.3 }} />
                    <Bar dataKey="value" fill={palette.blue} radius={[4, 4, 0, 0]} maxBarSize={44}>
                      {charts.pipeline.map((_, i) => <Cell key={i} fill={palette.blue} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Leads por status</CardTitle></CardHeader>
            <CardContent>
              {charts.leadsStatus.length === 0 ? (
                <EmptyState icon={Target} title="Sem leads cadastrados" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={charts.leadsStatus} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: palette.text, fontSize: 11 }} axisLine={{ stroke: palette.grid }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={54} />
                    <YAxis allowDecimals={false} tick={{ fill: palette.text, fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: palette.grid, fillOpacity: 0.3 }} />
                    <Bar dataKey="value" fill={palette.aqua} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Oportunidades Recentes</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-14 bg-primary/5 rounded-lg animate-pulse" />)}</div>
          ) : recentes.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Nenhuma oportunidade ainda" description="As oportunidades mais recentes aparecerão aqui." />
          ) : (
            <div className="space-y-3">
              {recentes.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{op.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{op.cliente_vinculado || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{money(op.valor_carta)}</p>
                    <Badge className="text-xs">{op.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
