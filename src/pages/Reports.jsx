import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Target, TrendingUp, Users, Building2 } from 'lucide-react';

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
  const teamMembers = useTeamMembers(user);

  const { data: allLeads = [] } = useQuery({ queryKey: ['leads', empresa], queryFn: async () => { const all = await base44.entities.Lead.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: allOportunidades = [] } = useQuery({ queryKey: ['opportunities', empresa], queryFn: async () => { const all = await base44.entities.Opportunity.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: allClientes = [] } = useQuery({ queryKey: ['contacts', empresa], queryFn: async () => { const all = await base44.entities.Contact.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: administradoras = [] } = useQuery({ queryKey: ['accounts', empresa], queryFn: async () => { const all = await base44.entities.Account.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });
  const { data: allVendas = [] } = useQuery({ queryKey: ['vendasConsorcio', empresa], queryFn: async () => { const all = await base44.entities.VendasConsorcio.list('-created_date'); return all.filter((item) => item.empresa_vinculada === empresa); }, enabled: Boolean(empresa) });

  const leads = useMemo(() => applyAccessFilter(allLeads, user, { liderField: 'lider_vinculado', vendedorField: 'vendedor_responsavel', teamMembers }), [allLeads, user, teamMembers]);
  const oportunidades = useMemo(() => applyAccessFilter(allOportunidades, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }), [allOportunidades, user, teamMembers]);
  const clientes = useMemo(() => applyAccessFilter(allClientes, user, { vendedorField: 'vendedor_responsavel', teamMembers }), [allClientes, user, teamMembers]);
  const vendas = useMemo(() => applyAccessFilter(allVendas, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }), [allVendas, user, teamMembers]);

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

  const comissaoPorVendedor = useMemo(() => {
    const map = {};
    vendas.forEach((item) => {
      const vendedor = item.vendedor || 'Sem vendedor';
      if (!map[vendedor]) map[vendedor] = { nome: vendedor, vendas: 0, comissaoTotal: 0, comissaoVendedor: 0 };
      map[vendedor].vendas += 1;
      map[vendedor].comissaoTotal += item.valor_comissao_prevista || 0;
      map[vendedor].comissaoVendedor += item.valor_comissao_vendedor || 0;
    });
    return Object.values(map).sort((a, b) => b.comissaoVendedor - a.comissaoVendedor).slice(0, 5);
  }, [vendas]);

  const topProdutos = useMemo(() => {
    const map = {};
    vendas.forEach((item) => {
      const produto = item.produto || 'Não informado';
      if (!map[produto]) map[produto] = { nome: produto, quantidade: 0, valorTotal: 0 };
      map[produto].quantidade += 1;
      map[produto].valorTotal += item.valor_carta || 0;
    });
    return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal).slice(0, 5);
  }, [vendas]);

  const funil = useMemo(() => ({
    leads: leads.length,
    oportunidades: oportunidades.length,
    vendas: vendas.length,
    taxaLeadOp: leads.length ? ((oportunidades.length / leads.length) * 100).toFixed(1) : '0.0',
    taxaOpVenda: oportunidades.length ? ((vendas.length / oportunidades.length) * 100).toFixed(1) : '0.0',
  }), [leads, oportunidades, vendas]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Funil de Conversão</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Leads</span><strong>{funil.leads}</strong></div>
            <div className="flex justify-between"><span className="text-gray-600">Oportunidades</span><strong>{funil.oportunidades} <span className="text-xs text-gray-400">({funil.taxaLeadOp}% dos leads)</span></strong></div>
            <div className="flex justify-between"><span className="text-gray-600">Vendas fechadas</span><strong>{funil.vendas} <span className="text-xs text-gray-400">({funil.taxaOpVenda}% das oport.)</span></strong></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Comissão por Vendedor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {comissaoPorVendedor.length === 0 ? <p className="text-sm text-gray-500">Sem dados de vendas.</p> : comissaoPorVendedor.map((item, index) => (
              <div key={item.nome} className="flex justify-between border-b pb-2 last:border-0">
                <span className="text-sm">#{index + 1} {item.nome} <span className="text-xs text-gray-400">({item.vendas} venda{item.vendas !== 1 ? 's' : ''})</span></span>
                <strong className="text-green-700">{money(item.comissaoVendedor)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Produtos Vendidos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topProdutos.length === 0 ? <p className="text-sm text-gray-500">Sem dados de vendas.</p> : topProdutos.map((item, index) => (
              <div key={item.nome} className="flex justify-between border-b pb-2 last:border-0">
                <span className="text-sm">#{index + 1} {item.nome}</span>
                <strong>{money(item.valorTotal)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
