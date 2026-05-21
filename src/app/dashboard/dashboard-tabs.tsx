'use client';

import { useState } from 'react';
import { Calendar, Clock, MessageSquare } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'appointments' | 'availability' | 'notifications'>('appointments');

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'border-teal-500 text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Fila de Agendamentos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'availability'
              ? 'border-teal-500 text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Configurações da Agenda
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-teal-500 text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Mensagens e Lembretes
        </button>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === 'appointments' && appointmentsQueue}
        {activeTab === 'availability' && availabilitySettings}
        {activeTab === 'notifications' && notificationSettings}
      </div>
    </div>
  );
}
