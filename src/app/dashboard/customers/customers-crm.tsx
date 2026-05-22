'use client';

import { useState, useTransition } from 'react';
import {
  Search,
  User,
  Phone,
  Calendar,
  FileText,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { updateCustomerNotes } from '../actions';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  appointmentDate: string | Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'NOSHOW';
  token: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  createdAt: string | Date;
  appointments: Appointment[];
}

interface CustomersCrmProps {
  initialCustomers: Customer[];
}

export default function CustomersCrm({ initialCustomers }: CustomersCrmProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialCustomers.length > 0 ? initialCustomers[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

  // Currently selected customer object
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const [notesDraft, setNotesDraft] = useState<string>(selectedCustomer?.notes || '');

  // Update notes draft when selecting a different customer
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    setNotesDraft(cust?.notes || '');
    setMobileView('details');
  };

  // Save notes handler
  const handleSaveNotes = () => {
    if (!selectedCustomer) return;

    startTransition(async () => {
      try {
        const res = await updateCustomerNotes(selectedCustomer.id, notesDraft);
        if (res.success) {
          toast.success('Anotações do paciente atualizadas!');
          // Update local state
          setCustomers((prev) =>
            prev.map((c) =>
              c.id === selectedCustomer.id ? { ...c, notes: notesDraft } : c
            )
          );
        } else {
          toast.error(res.error || 'Erro ao salvar anotações.');
        }
      } catch (error) {
        console.error('[CRM] Failed to save notes:', error);
        toast.error('Erro ao conectar ao servidor.');
      }
    });
  };

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.replace(/\D/g, '').includes(q) ||
      c.phone.includes(q)
    );
  });

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

  // Helper to count stats for selected customer
  const getStats = (cust: Customer) => {
    const total = cust.appointments.length;
    const confirmed = cust.appointments.filter((a) => a.status === 'CONFIRMED').length;
    const pending = cust.appointments.filter((a) => a.status === 'PENDING').length;
    const canceled = cust.appointments.filter((a) => a.status === 'CANCELED').length;
    const completed = cust.appointments.filter((a) => a.status === 'COMPLETED').length;
    const noshow = cust.appointments.filter((a) => a.status === 'NOSHOW').length;
    return { total, confirmed, pending, canceled, completed, noshow };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
      {/* LEFT COLUMN: Search & Patient List */}
      <div
        className={`md:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col h-full overflow-hidden ${
          mobileView === 'details' ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="space-y-4 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-teal-400" />
            Lista de Pacientes
          </h2>
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 z-10" />
            <Input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/40 border-slate-800/80 focus:border-teal-500/50 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 transition-all font-medium h-10"
            />
          </div>
        </div>

        {/* Patients Scroll List */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              Nenhum paciente encontrado.
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const isSelected = cust.id === selectedCustomerId;
              const stats = getStats(cust);
              return (
                <Button
                  key={cust.id}
                  variant="ghost"
                  type="button"
                  onClick={() => handleSelectCustomer(cust.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group h-auto ${
                    isSelected
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 shadow-md shadow-teal-500/5'
                      : 'bg-slate-950/30 border-slate-850 hover:bg-slate-850/30 text-slate-350 hover:text-slate-200'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-xs truncate">{cust.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {formatPhone(cust.phone)}
                    </p>
                    <div className="flex gap-1.5 pt-1">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-750 text-slate-400 font-medium">
                        {stats.total} {stats.total === 1 ? 'consulta' : 'consultas'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-teal-400' : ''}`} />
                </Button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Patient Detail, Notes & History */}
      <div
        className={`md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-full overflow-hidden ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedCustomer ? (
          <div className="flex flex-col h-full space-y-6">
            {/* Header / Info Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4 shrink-0">
              <div className="flex gap-3 items-center min-w-0">
                {/* Back button on mobile */}
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-2 bg-slate-950/40 border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition-all shrink-0 cursor-pointer h-9 w-9"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/10 text-base shrink-0">
                  {selectedCustomer.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-100 truncate">
                    {selectedCustomer.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {formatPhone(selectedCustomer.phone)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Cadastrado em: {new Date(selectedCustomer.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic WhatsApp Link */}
              <a
                href={`https://wa.me/${selectedCustomer.phone}`}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants(),
                  "self-start sm:self-center px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 border-none h-auto"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                Conversar no WhatsApp
              </a>
            </div>

            {/* Quick Metrics stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 shrink-0">
              {(() => {
                const s = getStats(selectedCustomer);
                return (
                  <>
                    <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">Agendamentos</span>
                      <span className="text-lg font-bold text-slate-200 mt-1 block">{s.total}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-teal-450 font-semibold block">Confirmados</span>
                      <span className="text-lg font-bold text-teal-450 mt-1 block">{s.confirmed}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-indigo-450 font-semibold block">Pendentes</span>
                      <span className="text-lg font-bold text-indigo-450 mt-1 block">{s.pending}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400/90 font-semibold block">Compareceram</span>
                      <span className="text-lg font-bold text-emerald-400 mt-1 block">{s.completed}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-orange-400/90 font-semibold block">Faltaram</span>
                      <span className="text-lg font-bold text-orange-400 mt-1 block">{s.noshow}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                      <span className="text-[9px] uppercase tracking-wider text-red-400/90 font-semibold block">Cancelados</span>
                      <span className="text-lg font-bold text-red-400 mt-1 block">{s.canceled}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Notes & History Container */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Internal notes card */}
              <div className="flex flex-col bg-slate-950 border border-slate-850 rounded-2xl p-4 overflow-hidden h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900 shrink-0">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-400" />
                    Anotações e Prontuário CRM
                  </h4>
                  
                  {/* Save indicator / button */}
                  <Button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isPending || selectedCustomer.notes === notesDraft}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer h-auto border-none",
                      selectedCustomer.notes !== notesDraft
                        ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/10'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-900'
                    )}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>

                <div className="flex-1 mt-3">
                  <Textarea
                    placeholder="Adicione observações importantes sobre o histórico de saúde do paciente, recomendações médicas, restrições ou observações internas..."
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    className="w-full h-full bg-transparent border-none resize-none text-xs text-slate-350 focus-visible:ring-0 placeholder-slate-600 leading-relaxed overflow-y-auto pr-1 min-h-[150px] shadow-none"
                  />
                </div>
              </div>

              {/* History list card */}
              <div className="flex flex-col bg-slate-950 border border-slate-850 rounded-2xl p-4 overflow-hidden h-full">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-3 border-b border-slate-900 shrink-0">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Histórico de Agendamentos
                </h4>

                <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5">
                  {selectedCustomer.appointments.length === 0 ? (
                    <div className="text-center py-12 text-slate-650 text-xs italic">
                      Nenhuma consulta registrada para este paciente.
                    </div>
                  ) : (
                    selectedCustomer.appointments.map((app) => {
                      const d = new Date(app.appointmentDate);
                      const formattedDate = d.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });
                      const formattedTime = d.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={app.id}
                          className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-200">
                              {formattedDate} - {formattedTime}
                            </span>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <span>Ref: {app.token.substring(0, 8)}</span>
                            </div>
                          </div>

                          <div>
                            {app.status === 'CONFIRMED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Confirmado
                              </span>
                            )}
                            {app.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Pendente
                              </span>
                            )}
                            {app.status === 'COMPLETED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Compareceu
                              </span>
                            )}
                            {app.status === 'NOSHOW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                <XCircle className="w-2.5 h-2.5" />
                                Não Compareceu
                              </span>
                            )}
                            {app.status === 'CANCELED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                                <XCircle className="w-2.5 h-2.5" />
                                Cancelado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs italic">
            <User className="w-12 h-12 text-slate-700 mb-2 animate-pulse" />
            Selecione ou busque um paciente para ver seus dados e histórico.
          </div>
        )}
      </div>
    </div>
  );
}
