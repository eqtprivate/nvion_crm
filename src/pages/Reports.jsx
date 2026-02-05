import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Analyze your business performance</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reports Coming Soon</h2>
          <p className="text-gray-500 max-w-md">
            Generate detailed reports on sales performance, revenue, customer acquisition, and more.
          </p>
        </div>
      </div>
    </div>
  );
}