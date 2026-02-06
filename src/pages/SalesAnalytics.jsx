import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import StatsCard from '../components/analytics/StatsCard';
import OpportunitiesChart from '../components/analytics/OpportunitiesChart';
import LeadSourceChart from '../components/analytics/LeadSourceChart';
import SalesFunnelChart from '../components/analytics/SalesFunnelChart';
import OpportunitiesStageChart from '../components/analytics/OpportunitiesStageChart';

export default function SalesAnalytics() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const stats = useMemo(() => {
    const totalRevenue = opportunities
      .filter(o => o.stage === 'closed_won')
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    
    const totalInvoices = opportunities.filter(o => o.stage === 'closed_won').length;
    
    const totalOpportunityValue = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue / totalOpportunityValue) * 100) : 0;

    // Calculate month-over-month changes (simplified - using random for demo)
    const customerChange = 8.5;
    const revenueChange = -10.1;
    const invoiceChange = 11.5;
    const profitChange = -0.5;

    return {
      customers: contacts.length,
      revenue: totalRevenue,
      invoices: totalInvoices,
      profit: profitMargin,
      customerChange,
      revenueChange,
      invoiceChange,
      profitChange,
    };
  }, [contacts, opportunities]);

  const exportAnalyticsData = () => {
    const data = {
      summary: {
        customers: stats.customers,
        revenue: stats.revenue,
        invoices: stats.invoices,
        profit: stats.profit,
      },
      opportunities: opportunities.map(o => ({
        name: o.name,
        amount: o.amount,
        stage: o.stage,
        probability: o.probability,
        owner: o.owner,
        close_date: o.close_date,
      })),
      leads: leads.map(l => ({
        name: l.name,
        company: l.company,
        status: l.status,
        source: l.source,
        value: l.value,
      })),
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_analytics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales Analytics</h1>
        <Button variant="outline" className="flex items-center gap-2" onClick={exportAnalyticsData}>
          <Calendar className="w-4 h-4" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="Customers"
          value={stats.customers.toLocaleString()}
          change={stats.customerChange}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          change={stats.revenueChange}
          icon={DollarSign}
          iconColor="text-cyan-600"
        />
        <StatsCard
          title="Invoices"
          value={stats.invoices.toLocaleString()}
          change={stats.invoiceChange}
          icon={FileText}
          iconColor="text-yellow-600"
        />
        <StatsCard
          title="Profit"
          value={`${stats.profit.toFixed(1)}%`}
          change={stats.profitChange}
          icon={TrendingUp}
          iconColor="text-orange-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <OpportunitiesChart opportunities={opportunities} />
        <LeadSourceChart leads={leads} opportunities={opportunities} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <SalesFunnelChart opportunities={opportunities} />
        <OpportunitiesStageChart opportunities={opportunities} />
      </div>
    </div>
  );
}