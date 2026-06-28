import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LEAD_STATUSES, ORIGENS, TEMPERATURAS } from '../forms/LeadDialog';

const STATUS_LABELS = Object.fromEntries(LEAD_STATUSES.map(s => [s.value, s.label]));
const ORIGEM_LABELS = Object.fromEntries(ORIGENS.map(o => [o.value, o.label]));
const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

export default function LeadsAnalytics({ leads }) {
  const porEtapa = useMemo(() => {
    const map = {};
    leads.forEach(l => { map[l.status] = (map[l.status] || 0) + 1; });
    return LEAD_STATUSES.map(s => ({ name: s.label, count: map[s.value] || 0 })).filter(s => s.count > 0);
  }, [leads]);

  const porTemperatura = useMemo(() => {
    const map = {};
    leads.forEach(l => { const t = l.temperatura || 'morno'; map[t] = (map[t] || 0) + 1; });
    return TEMPERATURAS.map(t => ({ name: t.label, value: map[t.value] || 0 })).filter(t => t.value > 0);
  }, [leads]);

  const porOrigem = useMemo(() => {
    const map = {};
    leads.forEach(l => { const o = l.origem || 'outro'; map[o] = (map[o] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: ORIGEM_LABELS[k] || k, value: v }));
  }, [leads]);

  const valorPorEtapa = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      if (l.valor_estimado_carta) {
        map[l.status] = (map[l.status] || 0) + l.valor_estimado_carta;
      }
    });
    return LEAD_STATUSES.map(s => ({ name: s.label, valor: Math.round((map[s.value] || 0) / 1000) })).filter(s => s.valor > 0);
  }, [leads]);

  if (leads.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Leads por Etapa</CardTitle></CardHeader>
        <CardContent>
          {porEtapa.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porEtapa} layout="vertical" margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Temperatura dos Leads</CardTitle></CardHeader>
        <CardContent>
          {porTemperatura.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={porTemperatura} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}>
                  {porTemperatura.map((_, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6'][i % 3]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Leads por Origem</CardTitle></CardHeader>
        <CardContent>
          {porOrigem.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={porOrigem} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}>
                  {porOrigem.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valor Estimado por Etapa (R$ mil)</CardTitle></CardHeader>
        <CardContent>
          {valorPorEtapa.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={valorPorEtapa} layout="vertical" margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={v => `R$ ${v}k`} />
                <Bar dataKey="valor" fill="#10b981" name="Valor (R$ mil)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}