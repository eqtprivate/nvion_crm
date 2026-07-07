import React, { useMemo, useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Wallet, TrendingUp, AlertTriangle, CheckCircle2, CalendarClock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid,
} from 'recharts';
import { computeRecebiveisMetrics } from '@/lib/recebiveisMetrics';

// Cores validadas (paleta categórica CVD-safe, modo claro).
const COLOR = { blue: '#2a78d6', vencido: '#e34948', neutral: '#94a3b8', grid: '#ececeb', axis: '#6b7280' };

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function moneyShort(v) {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return money(n);
}
function pct(v) {
  return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
function mesLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${m}/${y.slice(2)}`;
}

function ChartTooltip({ active, payload, label, labelKey }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md border bg-white px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-gray-700">{labelKey ? payload[0]?.payload?.[labelKey] : label}</p>
      <p className="text-gray-900 font-semibold">{money(payload[0].value)}</p>
    </div>
  );
}

function KPI({ title, value, Icon, tone = 'default', sub }) {
  const tones = {
    default: 'text-gray-900', blue: 'text-blue-700', green: 'text-green-700',
    red: 'text-red-700', primary: 'text-primary',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500">{title}</p>
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        </div>
        <p className={`text-xl font-bold ${tones[tone]}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function PainelRecebiveis() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);

  const [filterAdministradora, setFilterAdministradora] = useState('todos');
  const [filterVendedor, setFilterVendedor] = useState('todos');
  const [filterElegibilidade, setFilterElegibilidade] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

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

  const administradoras = useMemo(() => [...new Set(recebiveis.map((r) => r.administradora).filter(Boolean))].sort(), [recebiveis]);
  const vendedores = useMemo(() => [...new Set(recebiveis.map((r) => r.vendedor).filter(Boolean))].sort(), [recebiveis]);

  const filtrados = useMemo(() => recebiveis.filter((r) => {
    if (filterAdministradora !== 'todos' && r.administradora !== filterAdministradora) return false;
    if (filterVendedor !== 'todos' && r.vendedor !== filterVendedor) return false;
    if (filterStatus !== 'todos' && r.status_recebivel !== filterStatus) return false;
    if (filterElegibilidade === 'elegivel' && !r.elegivel_antecipacao) return false;
    if (filterElegibilidade === 'inelegivel' && r.elegivel_antecipacao) return false;
    return true;
  }), [recebiveis, filterAdministradora, filterVendedor, filterStatus, filterElegibilidade]);

  const m = useMemo(() => computeRecebiveisMetrics(filtrados), [filtrados]);

  const fluxoData = m.fluxoPorMes.map((x) => ({ ...x, label: mesLabel(x.mes) }));

  const exportCSV = () => {
    const linhas = [
      ['Indicador', 'Valor'],
      ['Carteira ativa', m.resumo.carteira],
      ['A receber', m.resumo.aReceber],
      ['Recebido', m.resumo.recebido],
      ['Atrasado', m.resumo.atrasado],
      ['Elegível para antecipação', m.resumo.elegivel],
      ['% elegível', m.elegibilidade.elegivelPct.toFixed(1)],
      ['Índice de atraso (%)', m.indiceAtraso.indice.toFixed(1)],
      ['Taxa de conversão (%)', m.realizadoVsPrevisto.taxaConversao.toFixed(1)],
      ['Prazo médio previsto (dias)', m.prazos.prazoMedioPrevisto],
      ['Meses de operação', m.historico.mesesOperacao],
      ['Volume recebido (histórico)', m.historico.volumeRecebido],
      [],
      ['Fluxo por mês', ''],
      ...m.fluxoPorMes.map((x) => [x.mes, x.valor]),
      [],
      ['Aging', ''],
      ...m.aging.map((a) => [a.label, a.valor]),
      [],
      ['Concentração por administradora', ''],
      ...m.concentracaoAdministradora.map((c) => [c.chave, c.valor]),
    ];
    const csv = linhas.map((row) => row.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'painel_recebiveis.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const elegTotal = m.elegibilidade.elegivelValor + m.elegibilidade.inelegivelValor;

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel de Recebíveis</h1>
          <p className="text-gray-500 mt-1">Indicadores da carteira, elegibilidade e base para antecipação</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtrados.length === 0}>
          <Download className="w-4 h-4 mr-2" />Exportar indicadores
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3">
        <Select value={filterAdministradora} onValueChange={setFilterAdministradora}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Administradora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas administradoras</SelectItem>
            {administradoras.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterVendedor} onValueChange={setFilterVendedor}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Vendedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos vendedores</SelectItem>
            {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterElegibilidade} onValueChange={setFilterElegibilidade}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Elegibilidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Elegibilidade: todas</SelectItem>
            <SelectItem value="elegivel">Somente elegíveis</SelectItem>
            <SelectItem value="inelegivel">Somente inelegíveis</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {['previsto', 'confirmado', 'recebido', 'atrasado', 'cancelado'].map((s) => (
              <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KPI title="Carteira ativa" value={moneyShort(m.resumo.carteira)} Icon={Wallet} />
        <KPI title="A receber" value={moneyShort(m.resumo.aReceber)} Icon={CalendarClock} tone="blue" sub={`${m.resumo.qtdAReceber} parcela(s)`} />
        <KPI title="Recebido (histórico)" value={moneyShort(m.resumo.recebido)} Icon={CheckCircle2} tone="green" />
        <KPI title="Atrasado" value={moneyShort(m.resumo.atrasado)} Icon={AlertTriangle} tone="red" sub={`Índice ${pct(m.indiceAtraso.indice)}`} />
        <KPI title="Elegível p/ antecipação" value={moneyShort(m.resumo.elegivel)} Icon={TrendingUp} tone="primary" sub={`${pct(m.elegibilidade.elegivelPct)} da carteira`} />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">Carregando indicadores...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <Wallet className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          Nenhum recebível encontrado para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Fluxo por mês */}
            <Card>
              <CardHeader><CardTitle className="text-base">Fluxo previsto por mês de vencimento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fluxoData} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={COLOR.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLOR.axis }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11, fill: COLOR.axis }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<ChartTooltip labelKey="label" />} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
                    <Bar dataKey="valor" fill={COLOR.blue} radius={[4, 4, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="valor" position="top" formatter={moneyShort} style={{ fontSize: 11, fill: COLOR.axis }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Aging */}
            <Card>
              <CardHeader><CardTitle className="text-base">Aging da carteira a receber</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={m.aging} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={COLOR.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLOR.axis }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11, fill: COLOR.axis }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<ChartTooltip labelKey="label" />} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {m.aging.map((a) => <Cell key={a.key} fill={a.key === 'vencido' ? COLOR.vencido : COLOR.blue} />)}
                      <LabelList dataKey="valor" position="top" formatter={moneyShort} style={{ fontSize: 11, fill: COLOR.axis }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLOR.vencido }} /> Vencido = já passou do vencimento previsto
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Concentração por administradora */}
            <Card>
              <CardHeader><CardTitle className="text-base">Concentração por administradora</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart layout="vertical" data={m.concentracaoAdministradora} margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke={COLOR.grid} />
                    <XAxis type="number" tickFormatter={moneyShort} tick={{ fontSize: 11, fill: COLOR.axis }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="chave" tick={{ fontSize: 12, fill: COLOR.axis }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip content={<ChartTooltip labelKey="chave" />} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
                    <Bar dataKey="valor" fill={COLOR.blue} radius={[0, 4, 4, 0]} maxBarSize={26}>
                      <LabelList dataKey="valor" position="right" formatter={moneyShort} style={{ fontSize: 11, fill: COLOR.axis }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Elegibilidade + base histórica */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Elegibilidade para antecipação</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between mb-2 text-sm">
                    <span className="text-blue-700 font-semibold">Elegível {money(m.elegibilidade.elegivelValor)}</span>
                    <span className="text-gray-500">Inelegível {money(m.elegibilidade.inelegivelValor)}</span>
                  </div>
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full" style={{ width: `${elegTotal > 0 ? (m.elegibilidade.elegivelValor / elegTotal) * 100 : 0}%`, background: COLOR.blue }} title={`Elegível ${pct(m.elegibilidade.elegivelPct)}`} />
                    <div className="h-full" style={{ width: `${elegTotal > 0 ? (m.elegibilidade.inelegivelValor / elegTotal) * 100 : 0}%`, background: COLOR.neutral }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{pct(m.elegibilidade.elegivelPct)} da carteira a receber é elegível.</p>

                  {m.elegibilidade.porMotivo.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Inelegíveis por motivo</p>
                      <div className="space-y-1.5">
                        {m.elegibilidade.porMotivo.slice(0, 5).map((mo) => (
                          <div key={mo.motivo} className="flex justify-between text-sm">
                            <span className="text-gray-600 truncate mr-2">{mo.motivo}</span>
                            <span className="font-medium text-gray-800">{money(mo.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Base histórica (para o motor de limite)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-xs text-gray-500">Meses de operação</p><p className="text-xl font-bold text-gray-900">{m.historico.mesesOperacao}</p></div>
                  <div><p className="text-xs text-gray-500">Volume recebido</p><p className="text-xl font-bold text-green-700">{moneyShort(m.historico.volumeRecebido)}</p></div>
                  <div><p className="text-xs text-gray-500">Conversão</p><p className="text-xl font-bold text-primary">{pct(m.realizadoVsPrevisto.taxaConversao)}</p></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
