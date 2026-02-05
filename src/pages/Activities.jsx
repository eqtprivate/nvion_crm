import React from 'react';
import { Activity } from 'lucide-react';

export default function Activities() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-500 mt-1">Track your sales activities</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Activities Coming Soon</h2>
          <p className="text-gray-500 max-w-md">
            Track all your sales activities including calls, emails, meetings, and tasks in one place.
          </p>
        </div>
      </div>
    </div>
  );
}