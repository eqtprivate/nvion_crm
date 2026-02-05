import React from 'react';
import { Users, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import StatsCard from '../components/analytics/StatsCard';
import OpportunitiesChart from '../components/analytics/OpportunitiesChart';
import LeadSourceChart from '../components/analytics/LeadSourceChart';
import SalesFunnelChart from '../components/analytics/SalesFunnelChart';
import OpportunitiesStageChart from '../components/analytics/OpportunitiesStageChart';

export default function SalesAnalytics() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Month
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Customers"
          value="2,425"
          change={8.5}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Revenue"
          value="$5,142"
          change={-10.1}
          icon={DollarSign}
          iconColor="text-cyan-600"
        />
        <StatsCard
          title="Invoices"
          value="2,425"
          change={11.5}
          icon={FileText}
          iconColor="text-yellow-600"
        />
        <StatsCard
          title="Profit"
          value="70%"
          change={-0.5}
          icon={TrendingUp}
          iconColor="text-orange-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <OpportunitiesChart />
        <LeadSourceChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesFunnelChart />
        <OpportunitiesStageChart />
      </div>
    </div>
  );
}