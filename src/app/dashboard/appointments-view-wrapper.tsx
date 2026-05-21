'use client';

import { useState } from 'react';
import { List, Calendar as CalendarIcon } from 'lucide-react';
import AppointmentsTable from './appointments-table';
import AppointmentsCalendar from './appointments-calendar';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Appointment {
  id: string;
  customerId: string;
  userId: string;
  appointmentDate: Date | string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  token: string;
  reminderSent: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  customer: Customer;
}

interface AppointmentsViewWrapperProps {
  initialAppointments: Appointment[];
}

export default function AppointmentsViewWrapper({
  initialAppointments,
}: AppointmentsViewWrapperProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  return (
    <div className="space-y-4">
      {/* View switcher control at the top right of the section */}
      <div className="flex justify-end">
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-850 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendário
          </button>
        </div>
      </div>

      {/* Renders the selected panel component dynamically */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg transition-all duration-300">
        {viewMode === 'list' ? (
          <AppointmentsTable initialAppointments={initialAppointments} />
        ) : (
          <AppointmentsCalendar appointments={initialAppointments} />
        )}
      </div>
    </div>
  );
}
