import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ReportKPICard({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
  };

  const colorClass = colorClasses[color];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`w-10 h-10 rounded-lg ${colorClass.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colorClass.text}`} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-600 mt-1">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}