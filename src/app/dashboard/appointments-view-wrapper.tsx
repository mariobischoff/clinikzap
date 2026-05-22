'use client';

import { useState } from 'react';
import { List, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'NOSHOW';
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
        <div className="flex bg-slate-950/40 backdrop-blur-md p-1 rounded-2xl border border-white/5 shadow-inner">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer h-auto hover:bg-transparent',
              viewMode === 'list'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md hover:bg-teal-400 hover:text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <List className="w-3.5 h-3.5" />
            Tabela
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer h-auto hover:bg-transparent',
              viewMode === 'calendar'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md hover:bg-teal-400 hover:text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendário
          </Button>
        </div>
      </div>

      {/* Renders the selected panel component dynamically */}
      <div className="glass-panel rounded-3xl p-6 transition-all duration-300">
        {viewMode === 'list' ? (
          <AppointmentsTable initialAppointments={initialAppointments} />
        ) : (
          <AppointmentsCalendar appointments={initialAppointments} />
        )}
      </div>
    </div>
  );
}
