import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

const data = [
  { month: 'Jan', prospecting: 16000, qualification: 8000, negotiation: 5000 },
  { month: 'Feb', prospecting: 12000, qualification: 10000, negotiation: 6000 },
  { month: 'Mar', prospecting: 20000, qualification: 5000, negotiation: 8000 },
  { month: 'Apr', prospecting: 14000, qualification: 9000, negotiation: 7000 },
  { month: 'May', prospecting: 18000, qualification: 6000, negotiation: 9000 },
  { month: 'Jun', prospecting: 24000, qualification: 7000, negotiation: 6000 }
];

export default function SalesFunnelChart() {
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Sales Funnel</CardTitle>
        <Button variant="ghost" size="sm" className="text-gray-500">
          <SlidersHorizontal className="mr-2 w-4 h-4" />
          Filters
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-sm text-gray-600">Prospecting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span className="text-sm text-gray-600">Qualification</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm text-gray-600">Negotiation</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Bar dataKey="prospecting" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="qualification" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="negotiation" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}