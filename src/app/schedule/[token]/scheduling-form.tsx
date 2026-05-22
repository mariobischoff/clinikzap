'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, AlertCircle, User } from 'lucide-react';
import { confirmAppointment, getAvailableSlots, type AppointmentDetails } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SchedulingFormProps {
  appointment: AppointmentDetails;
}

export default function SchedulingForm({ appointment }: SchedulingFormProps) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState(appointment.customer.name);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate the next 14 available days (skipping Sundays)
  const [datesList, setDatesList] = useState<{ dayName: string; dayNum: string; fullDate: string }[]>([]);

  useEffect(() => {
    const list = [];
    const today = new Date();
    
    for (let i = 0; list.length < 10; i++) {
      const current = new Date(today);
      current.setDate(today.getDate() + i);
      
      // Skip Sundays (0)
      if (current.getDay() === 0) continue;

      const dayName = current.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNum = current.getDate().toString().padStart(2, '0');
      
      // Format YYYY-MM-DD
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const fullDate = `${year}-${month}-${day}`;

      list.push({ dayName, dayNum, fullDate });
    }
    setDatesList(list);
    // Select first date by default
    setSelectedDate(list[0].fullDate);
  }, []);

  // Fetch slots whenever the selected date changes
  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const slots = await getAvailableSlots(selectedDate, appointment.user.id);
        setAvailableSlots(slots);
        setSelectedTime(''); // Reset selected time
      } catch (err) {
        console.error('Error fetching available slots:', err);
        setError('Erro ao carregar horários disponíveis.');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, appointment.user.id]);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !patientName.trim()) {
      setError('Por favor, preencha todas as informações.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await confirmAppointment(
        appointment.token,
        selectedDate,
        selectedTime,
        patientName.trim()
      );

      if (result.success) {
        setStep(4);
      } else {
        setError(result.error || 'Erro ao confirmar agendamento.');
      }
    } catch (err) {
      console.error('Error confirming appointment:', err);
      setError('Erro ao enviar confirmação.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFormattedSelectedDate = () => {
    if (!selectedDate) return '';
    const date = new Date(selectedDate + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-100 p-4 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl z-10">
        
        {/* Step Indicator Header (Hide on Success Step) */}
        {step < 4 && (
          <div className="mb-6">
            <span className="text-xs uppercase tracking-widest text-teal-400 font-semibold">
              Agendamento Online
            </span>
            <h1 className="text-2xl font-bold mt-1 text-slate-100">
              {appointment.user.name}
            </h1>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    s <= step ? 'bg-gradient-to-r from-teal-500 to-indigo-500' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: SELECT DATE */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-slate-350 flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-teal-400" />
                Selecione o Dia da Consulta
              </Label>
              
              {/* Horizontal Scroll Days List */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
                {datesList.map((d) => (
                  <Button
                    key={d.fullDate}
                    variant="outline"
                    onClick={() => setSelectedDate(d.fullDate)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[70px] border transition-all cursor-pointer h-auto ${
                      selectedDate === d.fullDate
                        ? 'bg-gradient-to-br from-teal-500 to-indigo-550 border-teal-400 text-white shadow-lg shadow-teal-500/20 scale-[1.03]'
                        : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-teal-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-xs uppercase font-medium tracking-wider opacity-80">
                      {d.dayName}
                    </span>
                    <span className="text-xl font-bold mt-1">
                      {d.dayNum}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!selectedDate}
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] border-none h-auto"
            >
              Escolher Horário
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP 2: SELECT TIME */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium text-slate-350 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  Horários para {getFormattedSelectedDate()}
                </Label>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-teal-400 hover:underline cursor-pointer"
                >
                  Alterar data
                </button>
              </div>

              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-3 py-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-12 bg-slate-900/50 border border-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {availableSlots.map((slot) => (
                    <Button
                      variant="outline"
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-3 rounded-2xl border font-semibold text-center transition-all cursor-pointer h-auto ${
                        selectedTime === slot
                          ? 'bg-gradient-to-br from-teal-500 to-indigo-550 border-teal-400 text-white shadow-lg shadow-teal-500/20 hover:text-white'
                          : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-teal-500/40 hover:bg-slate-900'
                      }`}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Não há horários disponíveis para este dia. Por favor, selecione outra data.
                </div>
              )}
            </div>

            <Button
              onClick={() => setStep(3)}
              disabled={!selectedTime}
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] border-none h-auto"
            >
              Confirmar Seus Dados
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP 3: PATIENT CONFIRMATION FORM */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-5 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Clínica:</span>
                <span className="font-semibold text-slate-100">{appointment.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Data:</span>
                <span className="font-semibold text-slate-100">{getFormattedSelectedDate()}</span>
              </div>
              <div className="flex justify-between">
                <span>Horário:</span>
                <span className="font-semibold text-teal-400">{selectedTime}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="pname" className="text-sm font-medium text-slate-350 flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-teal-400" />
                Seu Nome Completo
              </Label>
              <Input
                id="pname"
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
                placeholder="Como quer ser chamado(a)?"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex-1 bg-slate-900/80 hover:bg-slate-800 border border-white/5 text-slate-300 font-semibold py-3 px-4 rounded-2xl transition-colors cursor-pointer disabled:opacity-50 h-auto"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || !patientName.trim()}
                className="flex-1 bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none h-auto"
              >
                {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION SCREEN */}
        {step === 4 && (
          <div className="text-center py-8 space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-teal-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-100">Agendamento Confirmado!</h2>
              <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                Tudo certo, {patientName}! Sua consulta na clínica <strong>{appointment.user.name}</strong> foi reservada.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-5 max-w-sm mx-auto text-sm text-slate-300 space-y-2 text-left">
              <div className="flex justify-between">
                <span>Data:</span>
                <span className="font-semibold text-slate-100">{getFormattedSelectedDate()}</span>
              </div>
              <div className="flex justify-between">
                <span>Horário:</span>
                <span className="font-semibold text-teal-450">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Paciente:</span>
                <span className="font-semibold text-slate-100">{patientName}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 pt-4">
              Enviamos um comprovante com os detalhes para seu WhatsApp.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
