'use client';

import { useState } from 'react';
import WeeklySettings from './weekly-settings';
import ExceptionSettings from './exception-settings';
import { Calendar, Clock } from 'lucide-react';

interface ExceptionRecord {
  id: string;
  date: string;
  slots: string[];
}

interface AvailabilitySettingsProps {
  initialWeeklyHours: Record<string, string[]>;
  exceptions: ExceptionRecord[];
}

export default function AvailabilitySettings({
  initialWeeklyHours,
  exceptions,
}: AvailabilitySettingsProps) {
  const [subTab, setSubTab] = useState<'weekly' | 'exceptions'>('weekly');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-6">
      {/* Sub tabs header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            Configuração da Agenda
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Defina sua disponibilidade padrão e gerencie exceções pontuais no calendário.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 self-start">
          <button
            type="button"
            onClick={() => setSubTab('weekly')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'weekly'
                ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Agenda Semanal
          </button>
          
          <button
            type="button"
            onClick={() => setSubTab('exceptions')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'exceptions'
                ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Exceções e Bloqueios
          </button>
        </div>
      </div>

      {/* Sub Tabs Content */}
      <div className="pt-2">
        {subTab === 'weekly' ? (
          <WeeklySettings initialWeeklyHours={initialWeeklyHours} />
        ) : (
          <ExceptionSettings exceptions={exceptions} />
        )}
      </div>
    </div>
  );
}
