import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LEAD_STATUSES, ORIGENS, TEMPERATURAS } from '../forms/LeadDialog';

const STATUS_LABELS = Object.fromEntries(LEAD_STATUSES.map(s => [s.value, s.label]));
const ORIGEM_LABELS = Object.fromEntries(ORIGENS.map(o => [o.value, o.label]));
const TEMP_COLORS = { frio: '#3b82f6', morno: '#f59e0b', quente: '#ef4444' };
const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function LeadsAnalytics({ leads }) {
  const byStatus = React.useMemo(() => {
    const counts = {};
    leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return LEAD_STATUSES.map(s => ({ name: s.label, value: counts[s.value] || 0 })).filter(s => s.value > 0);
  }, [leads]);

  const byOrigem = React.useMemo(() => {
    const counts = {};
    leads.forEach(l => { if (l.origem) counts[l.origem] = (counts[l.origem] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: ORIGEM_LABELS[k] || k, value: v }));
  }, [leads]);

  const byTemperatura = React.useMemo(() => {
    const counts = { frio: 0, morno: 0, quente: 0 };
    leads.forEach(l => { if (l.temperatura) counts[l.temperatura]++; });
    return TEMPERATURAS.map(t => ({ name: t.label, value: counts[t.value], fill: TEMP_COLORS[t.value] }));
  }, [leads]);

  const valorPorStatus = React.useMemo(() => {
    const totals = {};
    leads.forEach(l => {
      if (l.valor_estimado_carta) totals[l.status] = (totals[l.status] || 0) + l.valor_estimado_carta;
    });
    return LEAD_STATUSES.map(s => ({
      name: s.label,
      valor: Math.round((totals[s.value] || 0) / 1000),
    })).filter(s => s.valor > 0);
  }, [leads]);

  if (leads.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Leads por Etapa</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byStatus} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Temperatura dos Leads</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byTemperatura} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                {byTemperatura.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Origem dos Leads</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byOrigem} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {byOrigem.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valor Estimado por Etapa (R$ mil)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={valorPorStatus} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={v => `R$ ${v}k`} />
              <Bar dataKey="valor" fill="#10b981" name="Valor (R$ mil)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
