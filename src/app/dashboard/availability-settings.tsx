'use client';

import WeeklySettings from './weekly-settings';
import ExceptionSettings from './exception-settings';
import { Calendar, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ExceptionRecord {
  id: string;
  date: string;
  slots: string[];
}

interface AvailabilitySettingsProps {
  initialWeeklyHours: Record<string, string[]>;
  exceptions: ExceptionRecord[];
  initialDuration: number;
}

export default function AvailabilitySettings({
  initialWeeklyHours,
  exceptions,
  initialDuration,
}: AvailabilitySettingsProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6">
      <Tabs defaultValue="weekly" className="space-y-6">
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
          <TabsList className="bg-slate-950/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 self-start">
            <TabsTrigger
              value="weekly"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer data-active:bg-teal-500 data-active:text-slate-950"
            >
              <Clock className="w-3.5 h-3.5" />
              Agenda Semanal
            </TabsTrigger>
            
            <TabsTrigger
              value="exceptions"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer data-active:bg-teal-500 data-active:text-slate-950"
            >
              <Calendar className="w-3.5 h-3.5" />
              Exceções e Bloqueios
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Sub Tabs Content */}
        <TabsContent value="weekly" className="pt-2 outline-none">
          <WeeklySettings initialWeeklyHours={initialWeeklyHours} initialDuration={initialDuration} />
        </TabsContent>
        <TabsContent value="exceptions" className="pt-2 outline-none">
          <ExceptionSettings exceptions={exceptions} duration={initialDuration} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
