'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Plus,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import NewAppointmentModal from './new-appointment-modal';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/confirmation-modal';

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

interface AppointmentsCalendarProps {
  appointments: Appointment[];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 11 }).map((_, i) => i + 8); // 8:00 to 18:00

export default function AppointmentsCalendar({ appointments }: AppointmentsCalendarProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  
  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [defaultDateForModal, setDefaultDateForModal] = useState<string>('');
  
  // Selected appointment details modal
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [isPendingAction, startTransition] = useTransition();
  const [actionType, setActionType] = useState<'cancel' | 'reschedule' | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [appToCancel, setAppToCancel] = useState<Appointment | null>(null);
  const [appToReschedule, setAppToReschedule] = useState<Appointment | null>(null);

  // Formats a phone number for local Brazilian view
  const formatPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('55') && cleaned.length > 10) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  };

  // Convert Date or string to a local Date object safely
  const parseAppDate = (dateVal: Date | string | null): Date | null => {
    if (!dateVal) return null;
    return new Date(dateVal);
  };

  // Memoized appointments grouped by ISO date string (YYYY-MM-DD)
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((app) => {
      const parsed = parseAppDate(app.appointmentDate);
      if (!parsed) return;
      
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(app);
    });
    
    // Sort each day's list by time
    Object.keys(map).forEach((dateStr) => {
      map[dateStr].sort((a, b) => {
        const dateA = parseAppDate(a.appointmentDate) || new Date();
        const dateB = parseAppDate(b.appointmentDate) || new Date();
        return dateA.getTime() - dateB.getTime();
      });
    });
    
    return map;
  }, [appointments]);

  // Navigate handlers
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  // Generate calendar days for MONTH view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start alignment (Sunday of first week)
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End alignment (Saturday of last week)
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days: Date[] = [];
    const temp = new Date(startDate);
    while (temp <= endDate) {
      days.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Generate calendar days for WEEK view
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
    
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Open modal preselected with a date
  const handleOpenNewWithDate = (dateObj: Date) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setDefaultDateForModal(`${year}-${month}-${day}`);
    setIsNewModalOpen(true);
  };

  // Actions handlers
  const handleCancelAppointment = (app: Appointment) => {
    setAppToCancel(app);
  };

  const executeCancel = (app: Appointment) => {
    setActionType('cancel');
    startTransition(async () => {
      try {
        const response = await fetch('/api/appointments/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: app.token }),
        });

        if (!response.ok) {
          const err = await response.json();
          toast.error(`Erro: ${err.error || 'Erro desconhecido'}`);
        } else {
          toast.success('Consulta cancelada com sucesso!');
          setSelectedApp(null);
          router.refresh();
        }
      } catch (error) {
        console.error('[Calendar] Failed to cancel:', error);
        toast.error('Erro ao cancelar consulta.');
      } finally {
        setActionType(null);
      }
    });
  };

  const handleRescheduleAppointment = (app: Appointment) => {
    setAppToReschedule(app);
  };

  const executeReschedule = (app: Appointment) => {
    setActionType('reschedule');
    startTransition(async () => {
      try {
        const response = await fetch('/api/appointments/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: app.id }),
        });

        if (!response.ok) {
          const err = await response.json();
          toast.error(`Erro: ${err.error || 'Erro desconhecido'}`);
        } else {
          toast.success('Reagendamento solicitado! Link enviado ao paciente.');
          setSelectedApp(null);
          router.refresh();
        }
      } catch (error) {
        console.error('[Calendar] Failed to reschedule:', error);
        toast.error('Erro ao reagendar.');
      } finally {
        setActionType(null);
      }
    });
  };

  const handleCopyLink = (token: string) => {
    const schedulingUrl = `${window.location.origin}/schedule/${token}`;
    navigator.clipboard.writeText(schedulingUrl);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // Format date helper for ISO lookup
  const getISODateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Date Display and Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 rounded-2xl border border-slate-850 p-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-slate-100 font-sans">
            {viewMode === 'month' ? (
              <>
                {MONTH_NAMES[currentDate.getMonth()]}{' '}
                <span className="text-teal-400 font-semibold">{currentDate.getFullYear()}</span>
              </>
            ) : (
              <>
                Semana de{' '}
                <span className="text-teal-400 font-semibold">
                  {weekDays[0].getDate()} de {MONTH_NAMES[weekDays[0].getMonth()]}
                </span>
              </>
            )}
          </h2>
        </div>

        {/* View Mode Switcher and Create Button */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Mês / Semana Toggles */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-850">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Quick Create Button */}
          <button
            type="button"
            onClick={() => {
              setDefaultDateForModal('');
              setIsNewModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-teal-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Novo
          </button>
        </div>
      </div>

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <div className="border border-slate-850 rounded-3xl overflow-hidden bg-slate-950">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-850 bg-slate-900/60">
            {WEEKDAY_NAMES.map((name) => (
              <div key={name} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                {name}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-850/70 border-t border-slate-850/70">
            {monthDays.map((day, idx) => {
              const dateStr = getISODateStr(day);
              const dayApps = appointmentsByDate[dateStr] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 flex flex-col group relative transition-colors ${
                    isCurrentMonth ? 'bg-slate-900/20' : 'bg-slate-950/20 text-slate-600'
                  } hover:bg-slate-900/30`}
                >
                  {/* Day number & Quick Add */}
                  <div className="flex justify-between items-center mb-1">
                    <button
                      type="button"
                      onClick={() => handleOpenNewWithDate(day)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded-lg text-teal-400 transition-all cursor-pointer"
                      title="Agendar neste dia"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className={`text-xs font-bold font-mono w-5 h-5 rounded-full flex items-center justify-center ${
                        isCurrentDay
                          ? 'bg-teal-500 text-slate-950 font-bold'
                          : isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Appointments list */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-none">
                    {dayApps.slice(0, 3).map((app) => {
                      const timeStr = parseAppDate(app.appointmentDate)?.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }) || '';

                      let statusStyle = '';
                      if (app.status === 'CONFIRMED') {
                        statusStyle = 'bg-teal-500/10 border-teal-500/20 text-teal-400';
                      } else if (app.status === 'PENDING') {
                        statusStyle = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
                      } else {
                        statusStyle = 'bg-red-500/10 border-red-500/20 text-red-400 line-through';
                      }

                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className={`w-full text-left px-1.5 py-0.5 rounded-lg text-[10px] font-medium border truncate block transition-all cursor-pointer hover:brightness-125 ${statusStyle}`}
                        >
                          <span className="font-bold mr-1">{timeStr}</span>
                          {app.customer.name}
                        </button>
                      );
                    })}

                    {dayApps.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentDate(day);
                          setViewMode('week');
                        }}
                        className="w-full text-center py-0.5 text-[10px] text-teal-400 hover:text-teal-350 font-bold block bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 cursor-pointer"
                      >
                        + {dayApps.length - 3} mais
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW GRID */}
      {viewMode === 'week' && (
        <div className="border border-slate-850 rounded-3xl overflow-hidden bg-slate-950 flex flex-col">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-slate-850 bg-slate-900/60 text-center font-bold text-xs uppercase tracking-wider">
            {/* Hour column empty header */}
            <div className="py-4 border-r border-slate-850/50 text-slate-500 text-[10px] flex items-center justify-center">
              Hora
            </div>
            {/* Days columns headers */}
            {weekDays.map((day, idx) => {
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={idx}
                  className={`py-3 flex flex-col items-center justify-center gap-1 ${
                    isCurrentDay ? 'bg-teal-500/5 text-teal-400' : 'text-slate-400'
                  }`}
                >
                  <span className="text-[10px]">{WEEKDAY_NAMES[day.getDay()]}</span>
                  <span
                    className={`font-mono text-sm w-6 h-6 rounded-full flex items-center justify-center ${
                      isCurrentDay ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Slots Rows */}
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin divide-y divide-slate-850/50">
            {HOURS.map((hr) => {
              const hourLabel = `${String(hr).padStart(2, '0')}:00`;

              return (
                <div key={hr} className="grid grid-cols-8 min-h-[70px]">
                  {/* Hour Label */}
                  <div className="border-r border-slate-850/50 pr-2 pt-2 text-right text-[10px] font-bold text-slate-500 font-mono">
                    {hourLabel}
                  </div>

                  {/* Day cells for this hour */}
                  {weekDays.map((day, dayIdx) => {
                    const dateStr = getISODateStr(day);
                    const dayApps = appointmentsByDate[dateStr] || [];
                    
                    // Filter appointments starting in this specific hour (e.g. 14:00 to 14:59)
                    const hourApps = dayApps.filter((app) => {
                      const parsed = parseAppDate(app.appointmentDate);
                      return parsed && parsed.getHours() === hr;
                    });

                    return (
                      <div
                        key={dayIdx}
                        className="p-1 border-r border-slate-850/20 hover:bg-slate-900/10 transition-colors relative group flex flex-col gap-1 justify-start"
                      >
                        {/* Quick Add Button on hover */}
                        <button
                          type="button"
                          onClick={() => handleOpenNewWithDate(day)}
                          className="opacity-0 group-hover:opacity-100 absolute right-1.5 top-1.5 p-0.5 hover:bg-slate-800 rounded text-teal-400 cursor-pointer transition-all z-10"
                          title="Agendar neste horário"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Appointments cards in this hour cell */}
                        {hourApps.map((app) => {
                          const parsed = parseAppDate(app.appointmentDate);
                          const timeStr = parsed?.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) || '';

                          let statusStyle = '';
                          if (app.status === 'CONFIRMED') {
                            statusStyle = 'bg-teal-500/10 border-l-4 border-l-teal-500 border-slate-800/80 text-teal-400';
                          } else if (app.status === 'PENDING') {
                            statusStyle = 'bg-indigo-500/10 border-l-4 border-l-indigo-500 border-slate-800/80 text-indigo-400';
                          } else {
                            statusStyle = 'bg-red-500/10 border-l-4 border-l-red-500 border-slate-800/80 text-red-400 line-through';
                          }

                          return (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => setSelectedApp(app)}
                              className={`w-full text-left p-1.5 rounded-xl text-[10px] font-medium border truncate block transition-all cursor-pointer hover:brightness-125 shadow-sm ${statusStyle}`}
                            >
                              <span className="font-bold mr-1 block text-[9px] opacity-80">{timeStr}</span>
                              <span className="font-semibold block truncate">{app.customer.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* APPOINTMENT DETAILS OVERLAY MODAL */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              onClick={() => setSelectedApp(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <div
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-teal-400" />
                  Detalhes do Agendamento
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Details Body */}
              <div className="space-y-4 text-sm">
                {/* Patient */}
                <div className="flex items-start gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                  <User className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Paciente</span>
                    <h4 className="font-bold text-slate-100 mt-0.5">{selectedApp.customer.name}</h4>
                  </div>
                </div>

                {/* Phone & WhatsApp Link */}
                <div className="flex items-start gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                  <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">WhatsApp</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-slate-200">{formatPhone(selectedApp.customer.phone)}</span>
                      <a
                        href={`https://wa.me/${selectedApp.customer.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-teal-400 hover:text-teal-350 flex items-center gap-1 font-semibold"
                      >
                        Abrir Chat <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Date & Time & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                    <Clock className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Horário</span>
                      <p className="font-semibold text-slate-200 mt-0.5">
                        {selectedApp.appointmentDate ? (
                          <>
                            {new Date(selectedApp.appointmentDate).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}{' '}
                            <span className="text-teal-400 font-mono">
                              {new Date(selectedApp.appointmentDate).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        ) : (
                          '-'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                    <CheckCircle2 className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Status</span>
                      <div className="mt-0.5">
                        {selectedApp.status === 'CONFIRMED' && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                            Confirmado
                          </span>
                        )}
                        {selectedApp.status === 'PENDING' && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            Pendente
                          </span>
                        )}
                        {selectedApp.status === 'CANCELED' && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                            Cancelado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token / Copy Link Section */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Link de Agendamento</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/schedule/${selectedApp.token}`}
                      className="bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl px-3 py-2 flex-1 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(selectedApp.token)}
                      className="px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-teal-400 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      {copiedToken ? 'Copiado!' : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {selectedApp.status !== 'CANCELED' && (
                <div className="flex gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    disabled={isPendingAction}
                    onClick={() => handleRescheduleAppointment(selectedApp)}
                    className="flex-1 py-3 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPendingAction && actionType === 'reschedule' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Reagendar
                  </button>

                  <button
                    type="button"
                    disabled={isPendingAction}
                    onClick={() => handleCancelAppointment(selectedApp)}
                    className="flex-1 py-3 px-4 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPendingAction && actionType === 'cancel' ? (
                      <Trash2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* New Appointment Modal inside Calendar */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultDate={defaultDateForModal}
      />

      {/* Confirmation modals */}
      <ConfirmationModal
        isOpen={!!appToCancel}
        title="Cancelar Consulta"
        message="Deseja realmente cancelar esta consulta? Esta ação não pode ser desfeita."
        confirmText="Confirmar"
        cancelText="Voltar"
        isDanger={true}
        onConfirm={() => {
          if (appToCancel) executeCancel(appToCancel);
          setAppToCancel(null);
        }}
        onCancel={() => setAppToCancel(null)}
      />

      <ConfirmationModal
        isOpen={!!appToReschedule}
        title="Solicitar Reagendamento"
        message="Deseja realmente reagendar esta consulta? O agendamento atual será cancelado e o paciente receberá um novo link de agendamento por WhatsApp."
        confirmText="Reagendar"
        cancelText="Voltar"
        isDanger={false}
        onConfirm={() => {
          if (appToReschedule) executeReschedule(appToReschedule);
          setAppToReschedule(null);
        }}
        onCancel={() => setAppToReschedule(null)}
      />
    </div>
  );
}
