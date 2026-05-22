'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, AlertCircle, Plus, CheckCircle2, XCircle } from 'lucide-react';
import CopyLinkButton from './copy-link-button';
import AppointmentActions from './appointment-actions';
import NewAppointmentModal from './new-appointment-modal';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [filter, setFilter] = useState<'active' | 'finished' | 'all'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredAppointments = initialAppointments.filter((app) => {
    if (filter === 'active') {
      return app.status === 'PENDING' || app.status === 'CONFIRMED';
    }
    if (filter === 'finished') {
      return app.status === 'CANCELED' || app.status === 'COMPLETED' || app.status === 'NOSHOW';
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Novo Agendamento Button */}
          <Button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-teal-500/10 active:scale-95 border-none h-auto"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            Novo Agendamento
          </Button>

          {/* Filter controls */}
          <div className="flex bg-slate-950/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 self-start">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer h-auto hover:bg-transparent ${
                filter === 'active'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md hover:bg-teal-400 hover:text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ativos
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setFilter('finished')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer h-auto hover:bg-transparent ${
                filter === 'finished'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md hover:bg-teal-400 hover:text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Encerrados
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer h-auto hover:bg-transparent ${
                filter === 'all'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md hover:bg-teal-400 hover:text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </Button>
          </div>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm bg-slate-950/20 border border-white/5 rounded-3xl backdrop-blur-md">
          Nenhum agendamento encontrado para este filtro.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="border-b border-slate-800 text-slate-400 hover:bg-transparent">
                <TableHead className="pb-4 text-xs uppercase tracking-wider font-semibold text-slate-400 h-auto">Paciente</TableHead>
                <TableHead className="pb-4 text-xs uppercase tracking-wider font-semibold text-slate-400 h-auto">WhatsApp</TableHead>
                <TableHead className="pb-4 text-xs uppercase tracking-wider font-semibold text-slate-400 h-auto">Data da Consulta</TableHead>
                <TableHead className="pb-4 text-xs uppercase tracking-wider font-semibold text-slate-400 h-auto">Status</TableHead>
                <TableHead className="pb-4 text-xs uppercase tracking-wider font-semibold text-slate-400 h-auto">Token de Acesso</TableHead>
                <TableHead className="pb-4 text-right pr-4 text-xs uppercase tracking-wider font-semibold text-slate-400 h-auto">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-800/50 text-sm text-slate-300">
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
                  <TableRow key={app.id} className="hover:bg-slate-850/20 transition-colors border-none">
                    <TableCell className="py-4 font-semibold text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      {app.customer.name}
                    </TableCell>
                    <TableCell className="py-4 text-slate-400">
                      <span className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {formatPhone(app.customer.phone)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 font-medium">
                      {app.status === 'PENDING' ? (
                        <span className="text-slate-500 italic text-xs">Aguardando escolha...</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                          {dateStr} <span className="text-teal-400 font-semibold">{timeStr}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
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
                      {app.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Compareceu
                        </span>
                      )}
                      {app.status === 'NOSHOW' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400">
                          <XCircle className="w-3 h-3" />
                          Não Compareceu
                        </span>
                      )}
                      {app.status === 'CANCELED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          Cancelado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-800 border border-slate-700/50 px-2 py-1 rounded-md text-slate-400">
                          {app.token.substring(0, 8)}...
                        </code>
                        <CopyLinkButton token={app.token} />
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-4">
                      <div className="inline-block text-left">
                        <AppointmentActions
                          appointmentId={app.id}
                          appointmentToken={app.token}
                          status={app.status}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Appointment Modal */}
      <NewAppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
