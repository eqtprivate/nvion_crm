import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Building2, TrendingUp } from 'lucide-react';

export default function Reports() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  // Lead Status Distribution
  const leadStatusData = React.useMemo(() => {
    const statusCounts = { new: 0, contacted: 0, qualified: 0, unqualified: 0 };
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // Top Accounts by Revenue
  const topAccounts = React.useMemo(() => {
    return [...accounts]
      .filter(acc => acc.annual_revenue)
      .sort((a, b) => (b.annual_revenue || 0) - (a.annual_revenue || 0))
      .slice(0, 10);
  }, [accounts]);

  // Opportunities by Owner
  const opportunitiesByOwner = React.useMemo(() => {
    const ownerCounts = {};
    opportunities.forEach(opp => {
      const owner = opp.owner || 'Unassigned';
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
    });
    return Object.entries(ownerCounts).map(([name, value]) => ({ name, value }));
  }, [opportunities]);

  // Contact Source Distribution
  const contactSourceData = React.useMemo(() => {
    const sourceCounts = {};
    contacts.forEach(contact => {
      const source = contact.source || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
  }, [contacts]);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

  const exportReportData = () => {
    const reportData = {
      summary: {
        totalAccounts: accounts.length,
        totalContacts: contacts.length,
        totalLeads: leads.length,
        totalOpportunities: opportunities.length,
      },
      leadStatus: leadStatusData,
      opportunitiesByOwner: opportunitiesByOwner,
      contactSource: contactSourceData,
      topAccounts: topAccounts.map(a => ({
        name: a.name,
        revenue: a.annual_revenue,
        industry: a.industry,
        employees: a.employees,
      })),
    };

    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Accounts', accounts.length],
      ['Total Contacts', contacts.length],
      ['Total Leads', leads.length],
      ['Total Opportunities', opportunities.length],
      ['', ''],
      ['Top Accounts by Revenue', ''],
      ['Account Name', 'Annual Revenue'],
      ...topAccounts.map(a => [a.name, a.annual_revenue || 0]),
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Analyze your business performance</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportToCSV} className="w-full sm:w-auto">
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportReportData} className="w-full sm:w-auto">
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Accounts</p>
                <p className="text-3xl font-bold mt-1">{accounts.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Contacts</p>
                <p className="text-3xl font-bold mt-1">{contacts.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-3xl font-bold mt-1">{leads.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Opportunities</p>
                <p className="text-3xl font-bold mt-1">{opportunities.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opportunities by Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={opportunitiesByOwner}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contactSourceData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Accounts by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-500">
                      No revenue data available
                    </TableCell>
                  </TableRow>
                ) : (
                  topAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-right">
                        ${account.annual_revenue?.toLocaleString()}
                      </TableCell>
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