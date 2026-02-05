import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const data = [
  { month: 'Jan', amount: 5000, weighted: 3000, count: 8 },
  { month: 'Feb', amount: 12000, weighted: 7000, count: 12 },
  { month: 'Mar', amount: 8000, weighted: 5000, count: 10 },
  { month: 'Apr', amount: 20000, weighted: 15000, count: 18 },
  { month: 'May', amount: 15000, weighted: 10000, count: 14 },
  { month: 'Jun', amount: 18000, weighted: 12000, count: 16 },
  { month: 'Jul', amount: 10000, weighted: 7000, count: 11 }
];

export default function OpportunitiesChart() {
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Opportunities by user</CardTitle>
        <Button variant="ghost" size="sm" className="text-gray-500">
          Month <ChevronDown className="ml-1 w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Amount</span>
            <p className="text-lg font-bold">3,85,835.05</p>
          </div>
          <div>
            <span className="text-gray-500">Amount Weighted</span>
            <p className="text-lg font-bold">10.45%</p>
          </div>
          <div>
            <span className="text-gray-500">Count</span>
            <p className="text-lg font-bold">15.25%</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="weighted" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}