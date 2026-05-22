'use client';

import { Calendar, Clock, MessageSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface DashboardTabsProps {
  appointmentsQueue: React.ReactNode;
  availabilitySettings: React.ReactNode;
  notificationSettings: React.ReactNode;
}

export default function DashboardTabs({
  appointmentsQueue,
  availabilitySettings,
  notificationSettings,
}: DashboardTabsProps) {
  return (
    <Tabs defaultValue="appointments" className="space-y-6">
      {/* Navigation Tabs */}
      <TabsList variant="line" className="w-full justify-start border-b border-slate-800 p-0 h-auto gap-0 bg-transparent">
        <TabsTrigger
          value="appointments"
          className="flex items-center gap-2 px-6 py-3 border-b-2 border-transparent data-active:border-teal-500 data-active:text-teal-400 bg-transparent text-slate-400 hover:text-slate-200 rounded-none h-auto transition-all cursor-pointer font-semibold text-sm"
        >
          <Calendar className="w-4 h-4" />
          Fila de Agendamentos
        </TabsTrigger>
        <TabsTrigger
          value="availability"
          className="flex items-center gap-2 px-6 py-3 border-b-2 border-transparent data-active:border-teal-500 data-active:text-teal-400 bg-transparent text-slate-400 hover:text-slate-200 rounded-none h-auto transition-all cursor-pointer font-semibold text-sm"
        >
          <Clock className="w-4 h-4" />
          Configurações da Agenda
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          className="flex items-center gap-2 px-6 py-3 border-b-2 border-transparent data-active:border-teal-500 data-active:text-teal-400 bg-transparent text-slate-400 hover:text-slate-200 rounded-none h-auto transition-all cursor-pointer font-semibold text-sm"
        >
          <MessageSquare className="w-4 h-4" />
          Mensagens e Lembretes
        </TabsTrigger>
      </TabsList>

      {/* Tab Content */}
      <TabsContent value="appointments" className="transition-all duration-300">
        {appointmentsQueue}
      </TabsContent>
      <TabsContent value="availability" className="transition-all duration-300">
        {availabilitySettings}
      </TabsContent>
      <TabsContent value="notifications" className="transition-all duration-300">
        {notificationSettings}
      </TabsContent>
    </Tabs>
  );
}
