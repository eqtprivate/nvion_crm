import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

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

  const { data: leads = [] } = useQuery({ queryKey: ['leads', empresa], queryFn: () => base44.entities.Lead.filter({ empresa_vinculada: empresa }), enabled: !!empresa });
  const { data: oportunidades = [] } = useQuery({ queryKey: ['opportunities', empresa], queryFn: () => base44.entities.Opportunity.filter({ empresa_vinculada: empresa }), enabled: !!empresa });

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
        <CardHeader>
          <CardTitle className="text-base">Oportunidades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Sem oportunidades cadastradas.</p>
          ) : (
            <div className="space-y-3">
              {recentes.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.produto || '-'} · {money(item.valor_carta)}</p>
                  </div>
                  <Badge>{item.status || '-'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
