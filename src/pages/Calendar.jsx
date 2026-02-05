import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function Calendar() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">View and manage your schedule</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar Coming Soon</h2>
          <p className="text-gray-500 max-w-md">
            The calendar feature is under development. You'll be able to schedule meetings, tasks, and view your upcoming events here.
          </p>
        </div>
      </div>
    </div>
  );
}