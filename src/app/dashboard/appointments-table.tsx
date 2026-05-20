'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import CopyLinkButton from './copy-link-button';
import AppointmentActions from './appointment-actions';

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

interface AppointmentsTableProps {
  initialAppointments: Appointment[];
}

/**
 * Formats a Brazilian E.164 phone number, stripping the country code 55 for clean local display
 */
function formatPhone(phone: string) {
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove country code 55 if present
  if (cleaned.startsWith('55') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // Format as (DD) 9XXXX-XXXX or (DD) XXXX-XXXX
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  return phone;
}

export default function AppointmentsTable({ initialAppointments }: AppointmentsTableProps) {
  const [filter, setFilter] = useState<'active' | 'canceled' | 'all'>('active');

  const filteredAppointments = initialAppointments.filter((app) => {
    if (filter === 'active') {
      return app.status === 'PENDING' || app.status === 'CONFIRMED';
    }
    if (filter === 'canceled') {
      return app.status === 'CANCELED';
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-4">
      {/* Title & Filter Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-teal-400" />
          Fila de Agendamentos
        </h2>

        {/* Filter controls */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 self-start">
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => setFilter('canceled')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'canceled'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cancelados
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm bg-slate-900/20 border border-slate-850 rounded-3xl">
          Nenhum agendamento encontrado para este filtro.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="pb-4">Paciente</th>
                <th className="pb-4">WhatsApp</th>
                <th className="pb-4">Data da Consulta</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Token de Acesso</th>
                <th className="pb-4 text-right pr-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
              {filteredAppointments.map((app) => {
                const dateObj = app.appointmentDate ? new Date(app.appointmentDate) : null;
                const dateStr = dateObj
                  ? dateObj.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : '-';
                const timeStr = dateObj
                  ? dateObj.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-';

                return (
                  <tr key={app.id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="py-4 font-semibold text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      {app.customer.name}
                    </td>
                    <td className="py-4 text-slate-400">
                      <span className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {formatPhone(app.customer.phone)}
                      </span>
                    </td>
                    <td className="py-4 font-medium">
                      {app.status === 'PENDING' ? (
                        <span className="text-slate-500 italic text-xs">Aguardando escolha...</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                          {dateStr} <span className="text-teal-400 font-semibold">{timeStr}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      {app.status === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                          <CheckCircle className="w-3 h-3" />
                          Confirmado
                        </span>
                      )}
                      {app.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                      {app.status === 'CANCELED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          Cancelado
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-800 border border-slate-700/50 px-2 py-1 rounded-md text-slate-400">
                          {app.token.substring(0, 8)}...
                        </code>
                        <CopyLinkButton token={app.token} />
                      </div>
                    </td>
                    <td className="py-4 text-right pr-4">
                      <div className="inline-block text-left">
                        <AppointmentActions
                          appointmentId={app.id}
                          appointmentToken={app.token}
                          status={app.status}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
