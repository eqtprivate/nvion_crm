import React, { useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import OnboardingBanner from '@/components/onboarding/OnboardingBanner';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function KPI({ title, value, Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">{title}</span>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);

  const { data: allLeads = [] } = useQuery({ queryKey: ['leads', empresa], queryFn: async () => { const all = await db.Lead.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); }, enabled: !!empresa });
  const { data: allOportunidades = [] } = useQuery({ queryKey: ['opportunities', empresa], queryFn: async () => { const all = await db.Opportunity.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); }, enabled: !!empresa });

  const leads = useMemo(() => applyAccessFilter(allLeads, user, { liderField: 'lider_vinculado', vendedorField: 'vendedor_responsavel', teamMembers }), [allLeads, user, teamMembers]);
  const oportunidades = useMemo(() => applyAccessFilter(allOportunidades, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }), [allOportunidades, user, teamMembers]);

  const kpis = useMemo(() => {
    const totalLeads = leads.length;
    const leadsAtivos = leads.filter((lead) => !['venda_concluida', 'perdida'].includes(lead.status)).length;
    const abertas = oportunidades.filter((item) => item.status === 'aberta');
    const ganhas = oportunidades.filter((item) => item.status === 'ganha');
    const pipelineAberto = abertas.reduce((sum, item) => sum + (item.valor_carta || 0), 0);
    const valorGanho = ganhas.reduce((sum, item) => sum + (item.valor_carta || 0), 0);
    const conversao = totalLeads > 0 ? ((leads.filter((lead) => lead.status === 'venda_concluida').length / totalLeads) * 100).toFixed(1) : '0.0';
    return { totalLeads, leadsAtivos, abertas: abertas.length, ganhas: ganhas.length, pipelineAberto, valorGanho, conversao };
  }, [leads, oportunidades]);

  const recentes = [...oportunidades].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel Geral</h1>
        <p className="text-gray-500 mt-1">Visão geral da operação comercial de consórcios</p>
      </div>

      <OnboardingBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <KPI title="Total de Leads" value={kpis.totalLeads} Icon={Target} />
        <KPI title="Leads Ativos" value={kpis.leadsAtivos} Icon={Target} />
        <KPI title="Taxa de Conversão" value={kpis.conversao + '%'} Icon={TrendingUp} />
        <KPI title="Oportunidades Abertas" value={kpis.abertas} Icon={DollarSign} />
        <KPI title="Oportunidades Ganhas" value={kpis.ganhas} Icon={CheckCircle} />
        <KPI title="Pipeline Aberto" value={money(kpis.pipelineAberto)} Icon={DollarSign} />
        <KPI title="Valor Ganho" value={money(kpis.valorGanho)} Icon={CheckCircle} />
      </div>

      <Card>
        <CardHeader><CardTitle>Oportunidades Recentes</CardTitle></CardHeader>
        <CardContent>
          {recentes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhuma oportunidade encontrada</p>
          ) : (
            <div className="space-y-3">
              {recentes.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{op.name}</p>
                    <p className="text-sm text-gray-500">{op.cliente_vinculado || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{money(op.valor_carta)}</p>
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
