import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Target, TrendingUp, Users, Building2, DollarSign } from 'lucide-react';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Indicador({ title, value, Icon }) {
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

export default function Reports() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;

  const { data: leads = [] } = useQuery({ queryKey: ['leads', empresa], queryFn: async () => { const all = await base44.entities.Lead.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: oportunidades = [] } = useQuery({ queryKey: ['opportunities', empresa], queryFn: async () => { const all = await base44.entities.Opportunity.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: clientes = [] } = useQuery({ queryKey: ['contacts', empresa], queryFn: async () => { const all = await base44.entities.Contact.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: administradoras = [] } = useQuery({ queryKey: ['accounts', empresa], queryFn: async () => { const all = await base44.entities.Account.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });

  const resumo = useMemo(() => {
    const abertas = oportunidades.filter((item) => item.status === 'aberta');
    const ganhas = oportunidades.filter((item) => item.status === 'ganha');
    const perdidas = oportunidades.filter((item) => item.status === 'perdida');
    const valorAberto = abertas.reduce((sum, item) => sum + (item.valor_carta || 0), 0);
    const valorGanho = ganhas.reduce((sum, item) => sum + (item.valor_carta || 0), 0);
    const conversao = oportunidades.length ? ((ganhas.length / oportunidades.length) * 100).toFixed(1) : '0.0';
    return { abertas, ganhas, perdidas, valorAberto, valorGanho, conversao };
  }, [oportunidades]);

  const rankingVendedores = useMemo(() => {
    const map = {};
    oportunidades.forEach((item) => {
      const vendedor = item.vendedor || 'Sem vendedor';
      if (!map[vendedor]) map[vendedor] = { nome: vendedor, quantidade: 0, valor: 0 };
      map[vendedor].quantidade += 1;
      map[vendedor].valor += item.valor_carta || 0;
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [oportunidades]);

  const rankingAdministradoras = useMemo(() => {
    const map = {};
    oportunidades.forEach((item) => {
      const administradora = item.administradora_pretendida || 'Não informada';
      if (!map[administradora]) map[administradora] = { nome: administradora, quantidade: 0, valor: 0 };
      map[administradora].quantidade += 1;
      map[administradora].valor += item.valor_carta || 0;
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [oportunidades]);

  const exportarOportunidades = () => {
    const headers = ['Nome', 'Cliente', 'Produto', 'Valor da Carta', 'Status', 'Etapa', 'Vendedor', 'Líder', 'Administradora'];
    const rows = oportunidades.map((item) => [item.name || '', item.cliente_vinculado || '', item.produto || '', item.valor_carta || 0, item.status || '', item.stage || '', item.vendedor || '', item.lider || '', item.administradora_pretendida || '']);
    const csv = [headers, ...rows].map((row) => row.map((cell) => '"' + String(cell).replaceAll('"', '') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_oportunidades.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Relatórios Gerenciais</h1>
          <p className="text-gray-500 text-sm mt-1">Análises comerciais, operacionais e indicadores do sistema</p>
        </div>
        <Button variant="outline" onClick={exportarOportunidades} disabled={oportunidades.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Oportunidades
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Indicador title="Total de Leads" value={leads.length} Icon={Target} />
        <Indicador title="Clientes Cadastrados" value={clientes.length} Icon={Users} />
        <Indicador title="Administradoras" value={administradoras.length} Icon={Building2} />
        <Indicador title="Oportunidades" value={oportunidades.length} Icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Resumo do Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Oportunidades abertas</span><strong>{resumo.abertas.length}</strong></div>
            <div className="flex justify-between"><span className="text-gray-600">Oportunidades ganhas</span><strong>{resumo.ganhas.length}</strong></div>
            <div className="flex justify-between"><span className="text-gray-600">Oportunidades perdidas</span><strong>{resumo.perdidas.length}</strong></div>
            <div className="flex justify-between"><span className="text-gray-600">Taxa de conversão</span><strong>{resumo.conversao}%</strong></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Valores Comerciais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Pipeline aberto</span><strong>{money(resumo.valorAberto)}</strong></div>
            <div className="flex justify-between"><span className="text-gray-600">Valor ganho</span><strong>{money(resumo.valorGanho)}</strong></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Próximos Relatórios</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Os relatórios de vendas, comissões, conciliação, recebíveis e antecipação serão adicionados após os próximos módulos financeiros.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Ranking de Vendedores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rankingVendedores.length === 0 ? <p className="text-sm text-gray-500">Sem dados.</p> : rankingVendedores.map((item, index) => (
              <div key={item.nome} className="flex justify-between border-b pb-2 last:border-0"><span>#{index + 1} {item.nome}</span><strong>{money(item.valor)}</strong></div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ranking de Administradoras</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rankingAdministradoras.length === 0 ? <p className="text-sm text-gray-500">Sem dados.</p> : rankingAdministradoras.map((item, index) => (
              <div key={item.nome} className="flex justify-between border-b pb-2 last:border-0"><span>#{index + 1} {item.nome}</span><strong>{money(item.valor)}</strong></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
