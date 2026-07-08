import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function KPICard({ title, value, icon: Icon, iconColor = 'bg-primary' }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          </div>
          {Icon && (
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}