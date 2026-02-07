import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';

export default function PipelineForecastTab({ filteredOpportunities, filteredActivities }) {
  const openOpps = filteredOpportunities.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');

  // Pipeline by Stage
  const pipelineByStage = React.useMemo(() => {
    const stageData = {};
    openOpps.forEach(opp => {
      const stage = opp.stage || 'unknown';
      if (!stageData[stage]) stageData[stage] = { stage, count: 0, value: 0 };
      stageData[stage].count++;
      stageData[stage].value += opp.amount || 0;
    });
    return Object.values(stageData);
  }, [openOpps]);

  // Forecast by Probability
  const forecastByProbability = React.useMemo(() => {
    const bands = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    openOpps.forEach(opp => {
      const prob = opp.probability || 0;
      if (prob <= 25) bands['0-25'] += opp.amount || 0;
      else if (prob <= 50) bands['26-50'] += opp.amount || 0;
      else if (prob <= 75) bands['51-75'] += opp.amount || 0;
      else bands['76-100'] += opp.amount || 0;
    });
    return Object.entries(bands).map(([band, value]) => ({ band, value }));
  }, [openOpps]);

  // Aging Pipeline
  const agingPipeline = React.useMemo(() => {
    const ageData = { '<30 days': 0, '30-60 days': 0, '60-90 days': 0, '>90 days': 0 };
    openOpps.forEach(opp => {
      const days = differenceInDays(new Date(), parseISO(opp.created_date));
      if (days < 30) ageData['<30 days']++;
      else if (days < 60) ageData['30-60 days']++;
      else if (days < 90) ageData['60-90 days']++;
      else ageData['>90 days']++;
    });
    return Object.entries(ageData).map(([age, count]) => ({ age, count }));
  }, [openOpps]);

  // Deals at Risk
  const dealsAtRisk = React.useMemo(() => {
    return openOpps.filter(opp => {
      const lastActivity = filteredActivities
        .filter(a => a.related_to_id === opp.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      const daysSinceActivity = lastActivity 
        ? differenceInDays(new Date(), parseISO(lastActivity.date))
        : 999;
      
      return daysSinceActivity > 14;
    }).slice(0, 20);
  }, [openOpps, filteredActivities]);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forecast by Probability</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={forecastByProbability}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ band, value }) => `${band}%: $${(value / 1000).toFixed(0)}K`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {forecastByProbability.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aging Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agingPipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Open Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openOpps.slice(0, 10).map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.stage}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${(deal.amount || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {openOpps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No open deals</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals at Risk (No Activity 14+ Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealsAtRisk.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No at-risk deals</TableCell>
                  </TableRow>
                ) : (
                  dealsAtRisk.map((deal) => (
                    <TableRow key={deal.id} className="bg-red-50">
                      <TableCell className="font-medium">{deal.name}</TableCell>
                      <TableCell>{deal.account_name}</TableCell>
                      <TableCell className="text-right">${(deal.amount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}