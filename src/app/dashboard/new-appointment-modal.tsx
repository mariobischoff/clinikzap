'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Phone, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { searchCustomers, createManualAppointment, getAdminAvailableSlots } from './actions';
import { useRouter } from 'next/navigation';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultTime?: string;
}

export default function NewAppointmentModal({
  isOpen,
  onClose,
  defaultDate = '',
  defaultTime = '',
}: NewAppointmentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Sync props with state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate);
      setTime(defaultTime);
    }
  }, [isOpen, defaultDate, defaultTime]);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelectedSuggestion, setIsSelectedSuggestion] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Time slots states
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Format phone helper
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerPhone(formatted);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerName(e.target.value);
    setIsSelectedSuggestion(false);
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete query effect
  useEffect(() => {
    if (isSelectedSuggestion) return;
    if (!customerName || customerName.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCustomers(customerName);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerName, isSelectedSuggestion]);

  // Available slots loader effect
  useEffect(() => {
    if (!date) {
      setSlots([]);
      setTime('');
      return;
    }

    let active = true;
    setIsLoadingSlots(true);
    setTime('');

    const fetchSlots = async () => {
      try {
        const available = await getAdminAvailableSlots(date);
        if (active) {
          setSlots(available);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
      } finally {
        if (active) {
          setIsLoadingSlots(false);
        }
      }
    };

    fetchSlots();

    return () => {
      active = false;
    };
  }, [date]);

  // Handle select suggestion
  const handleSelectSuggestion = (cust: { name: string; phone: string }) => {
    setCustomerName(cust.name);
    setCustomerPhone(formatPhoneNumber(cust.phone));
    setIsSelectedSuggestion(true);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Reset form helper
  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDate('');
    setTime('');
    setSuggestions([]);
    setShowSuggestions(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Por favor, informe o nome do paciente.');
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }

    if (!date) {
      setErrorMsg('Por favor, selecione a data do agendamento.');
      return;
    }

    if (!time) {
      setErrorMsg('Por favor, selecione um horário disponível.');
      return;
    }

    startTransition(async () => {
      const res = await createManualAppointment({
        date,
        time,
        customerName: customerName.trim(),
        customerPhone,
      });

      if (res.success) {
        if (res.warning) {
          setSuccessMsg(`Agendamento criado com sucesso! Note: ${res.warning}`);
        } else {
          setSuccessMsg('Agendamento criado com sucesso! Confirmação enviada via WhatsApp.');
        }
        router.refresh();
        setTimeout(() => {
          handleClose();
        }, res.warning ? 4500 : 2000);
      } else {
        setErrorMsg(res.error || 'Erro ao criar agendamento.');
      }
    });
  };

  // Get tomorrow's date string for min date (or today)
  const getMinDateStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h2 className="text-xl font-bold text-slate-100">Novo Agendamento</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-450 rounded-2xl flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Patient Name Search / Autocomplete */}
              <div className="space-y-2 relative" ref={suggestionsRef}>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nome do Paciente
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={handleNameChange}
                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                    placeholder="Digite o nome do paciente..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  {isSearching && (
                    <div className="absolute right-3.5 top-3.5">
                      <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Autocomplete suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-900"
                    >
                      {suggestions.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(cust)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-900/60 transition-colors flex items-center justify-between text-sm cursor-pointer"
                        >
                          <span className="font-medium text-slate-200">{cust.name}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3" />
                            {cust.phone}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* WhatsApp Phone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> WhatsApp (com DDD)
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:outline-none transition-all placeholder:text-slate-600 font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Um disparo automático de confirmação será enviado a este número.
                </p>
              </div>

              {/* Grid Date & Time Slots */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data da Consulta
                </label>
                <input
                  type="date"
                  required
                  min={getMinDateStr()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:outline-none transition-all cursor-pointer select-none"
                />
              </div>

              {/* Time Slots Section */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Horários Disponíveis
                </label>

                {isLoadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-950 border border-slate-900 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : !date ? (
                  <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 border border-slate-850/50 rounded-2xl">
                    Selecione uma data para ver os horários disponíveis.
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-6 text-amber-500/70 text-xs bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Nenhum horário disponível para esta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slots.map((s) => {
                      const isSelected = time === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTime(s)}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold font-mono border transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.25)] font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-350 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-2xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || isLoadingSlots || !time}
                  className="flex-1 py-3 px-4 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:shadow-none"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Confirmar Agendamento'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
