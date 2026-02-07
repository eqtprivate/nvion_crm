import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  TrendingDown,
  Activity
} from 'lucide-react';
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  startOfYear,
  isWithinInterval,
  parseISO,
  differenceInDays
} from 'date-fns';
import GlobalFilters from '../components/reports/GlobalFilters';
import ReportKPICard from '../components/reports/ReportKPICard';
import SalesOverviewTab from '../components/reports/SalesOverviewTab';
import PipelineForecastTab from '../components/reports/PipelineForecastTab';
import ActivityProductivityTab from '../components/reports/ActivityProductivityTab';
import LeadSourcesTab from '../components/reports/LeadSourcesTab';

export default function Reports() {
  const [filters, setFilters] = useState({
    dateRange: 'thisMonth',
    stage: 'all',
    source: 'all',
    status: 'all',
  });

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

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list(),
  });

  // Filter data based on global filters
  const filteredData = useMemo(() => {
    // Date range filtering
    let dateStart = new Date(0);
    const now = new Date();
    
    if (filters.dateRange === 'today') dateStart = startOfDay(now);
    else if (filters.dateRange === 'thisWeek') dateStart = startOfWeek(now);
    else if (filters.dateRange === 'thisMonth') dateStart = startOfMonth(now);
    else if (filters.dateRange === 'ytd') dateStart = startOfYear(now);
    
    const filteredOpportunities = opportunities.filter(opp => {
      const dateMatch = filters.dateRange === 'all' || 
        (opp.created_date && isWithinInterval(parseISO(opp.created_date), { start: dateStart, end: now }));
      const stageMatch = filters.stage === 'all' || opp.stage === filters.stage;
      const sourceMatch = filters.source === 'all' || opp.source === filters.source;
      
      let statusMatch = true;
      if (filters.status === 'open') statusMatch = opp.stage !== 'closed_won' && opp.stage !== 'closed_lost';
      else if (filters.status === 'won') statusMatch = opp.stage === 'closed_won';
      else if (filters.status === 'lost') statusMatch = opp.stage === 'closed_lost';
      
      return dateMatch && stageMatch && sourceMatch && statusMatch;
    });

    const filteredLeads = leads.filter(lead => {
      const dateMatch = filters.dateRange === 'all' || 
        (lead.created_date && isWithinInterval(parseISO(lead.created_date), { start: dateStart, end: now }));
      const sourceMatch = filters.source === 'all' || lead.source === filters.source;
      return dateMatch && sourceMatch;
    });

    const filteredActivities = activities.filter(activity => {
      const dateMatch = filters.dateRange === 'all' || 
        (activity.date && isWithinInterval(parseISO(activity.date), { start: dateStart, end: now }));
      return dateMatch;
    });

    return { filteredOpportunities, filteredLeads, filteredActivities, filteredContacts: contacts, filteredAccounts: accounts };
  }, [opportunities, leads, activities, contacts, accounts, filters]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const { filteredOpportunities, filteredLeads } = filteredData;
    
    const totalLeads = filteredLeads.length;
    const openLeads = filteredLeads.filter(l => l.status === 'new' || l.status === 'contacted').length;
    
    const wonDeals = filteredOpportunities.filter(o => o.stage === 'closed_won');
    const lostDeals = filteredOpportunities.filter(o => o.stage === 'closed_lost');
    const openDeals = filteredOpportunities.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
    
    const wonDealsCount = wonDeals.length;
    const wonDealsValue = wonDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    const lostDealsCount = lostDeals.length;
    const lostDealsValue = lostDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    const conversionRate = wonDealsCount + lostDealsCount > 0
      ? ((wonDealsCount / (wonDealsCount + lostDealsCount)) * 100).toFixed(1)
      : 0;
    
    const pipelineValue = openDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    // Avg Sales Cycle
    const avgSalesCycle = wonDeals.length > 0
      ? Math.round(wonDeals.reduce((sum, deal) => {
          if (deal.created_date && deal.close_date) {
            return sum + differenceInDays(parseISO(deal.close_date), parseISO(deal.created_date));
          }
          return sum;
        }, 0) / wonDeals.length)
      : 0;

    return {
      totalLeads,
      openLeads,
      wonDealsCount,
      wonDealsValue,
      lostDealsCount,
      lostDealsValue,
      conversionRate,
      pipelineValue,
      avgSalesCycle,
    };
  }, [filteredData]);

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({
        dateRange: 'thisMonth',
        stage: 'all',
        source: 'all',
        status: 'all',
      });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const exportCSV = () => {
    const { filteredOpportunities } = filteredData;
    const headers = ['Deal Name', 'Account', 'Amount', 'Stage', 'Source', 'Owner', 'Close Date'];
    const rows = filteredOpportunities.map(opp => [
      opp.name || '',
      opp.account_name || '',
      opp.amount || 0,
      opp.stage || '',
      opp.source || '',
      opp.owner || '',
      opp.close_date || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    alert('PDF export functionality would use a library like jsPDF or html2canvas. Simulated for now.');
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Comprehensive CRM reporting hub</p>
        </div>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onExportCSV={exportCSV}
        onExportPDF={exportPDF}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <ReportKPICard
          title="Total Leads"
          value={kpis.totalLeads}
          icon={Target}
          color="blue"
          trend="up"
          trendValue="+12%"
        />
        <ReportKPICard
          title="Open Leads"
          value={kpis.openLeads}
          icon={Activity}
          color="orange"
        />
        <ReportKPICard
          title="Won Deals"
          value={kpis.wonDealsCount}
          subtitle={`$${(kpis.wonDealsValue / 1000).toFixed(0)}K`}
          icon={TrendingUp}
          color="green"
          trend="up"
          trendValue="+8%"
        />
        <ReportKPICard
          title="Lost Deals"
          value={kpis.lostDealsCount}
          subtitle={`$${(kpis.lostDealsValue / 1000).toFixed(0)}K`}
          icon={TrendingDown}
          color="red"
        />
        <ReportKPICard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          icon={Target}
          color="purple"
          trend="up"
          trendValue="+2%"
        />
        <ReportKPICard
          title="Pipeline Value"
          value={`$${(kpis.pipelineValue / 1000).toFixed(0)}K`}
          icon={DollarSign}
          color="cyan"
        />
        <ReportKPICard
          title="Avg Sales Cycle"
          value={`${kpis.avgSalesCycle}d`}
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="sales" className="text-xs sm:text-sm">Sales Overview</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs sm:text-sm">Pipeline & Forecast</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
          <TabsTrigger value="sources" className="text-xs sm:text-sm">Lead Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesOverviewTab 
            filteredOpportunities={filteredData.filteredOpportunities} 
            filteredLeads={filteredData.filteredLeads}
          />
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineForecastTab 
            filteredOpportunities={filteredData.filteredOpportunities}
            filteredActivities={filteredData.filteredActivities}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityProductivityTab 
            filteredActivities={filteredData.filteredActivities}
            filteredOpportunities={filteredData.filteredOpportunities}
          />
        </TabsContent>

        <TabsContent value="sources">
          <LeadSourcesTab 
            filteredLeads={filteredData.filteredLeads}
            filteredOpportunities={filteredData.filteredOpportunities}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}