'use client';

import { useState, useTransition } from 'react';
import { updateWeeklyHours } from './actions';
import { Check, Save, Calendar } from 'lucide-react';

interface WeeklySettingsProps {
  initialWeeklyHours: Record<string, string[]>;
}

const WEEKDAYS = [
  { index: '1', name: 'Segunda-feira' },
  { index: '2', name: 'Terça-feira' },
  { index: '3', name: 'Quarta-feira' },
  { index: '4', name: 'Quinta-feira' },
  { index: '5', name: 'Sexta-feira' },
  { index: '6', name: 'Sábado' },
  { index: '0', name: 'Domingo' },
];

const ALL_POSSIBLE_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = String(i + 7).padStart(2, '0');
  return `${hour}:00`;
});

export default function WeeklySettings({ initialWeeklyHours }: WeeklySettingsProps) {
  // Ensure we have a default list of slots for each day if not set in DB
  const normalizeWeeklyHours = () => {
    const hours: Record<string, string[]> = {};
    for (const day of WEEKDAYS) {
      hours[day.index] = initialWeeklyHours[day.index] || [];
    }
    return hours;
  };

  const [weeklyHours, setWeeklyHours] = useState<Record<string, string[]>>(normalizeWeeklyHours());
  const [selectedDay, setSelectedDay] = useState<string>('1'); // Default to Monday
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeDayName = WEEKDAYS.find((d) => d.index === selectedDay)?.name || '';
  const currentDaySlots = weeklyHours[selectedDay] || [];

  const handleToggleSlot = (slot: string) => {
    setWeeklyHours((prev) => {
      const daySlots = prev[selectedDay] || [];
      const updatedSlots = daySlots.includes(slot)
        ? daySlots.filter((s) => s !== slot)
        : [...daySlots, slot];
      return {
        ...prev,
        [selectedDay]: updatedSlots,
      };
    });
  };

  const handleSelectAllForDay = () => {
    setWeeklyHours((prev) => ({
      ...prev,
      [selectedDay]: ALL_POSSIBLE_SLOTS,
    }));
  };

  const handleClearAllForDay = () => {
    setWeeklyHours((prev) => ({
      ...prev,
      [selectedDay]: [],
    }));
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateWeeklyHours(weeklyHours);
      if (result.success) {
        setMessage({ type: 'success', text: 'Agenda semanal salva com sucesso!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao salvar agenda semanal.' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Weekdays list */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block px-2">
            Dias da Semana
          </span>
          <div className="space-y-1">
            {WEEKDAYS.map((day) => {
              const isActive = selectedDay === day.index;
              const slotCount = (weeklyHours[day.index] || []).length;

              return (
                <button
                  key={day.index}
                  type="button"
                  onClick={() => setSelectedDay(day.index)}
                  className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between border text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    {day.name}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      slotCount > 0
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {slotCount} horários
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Slots configuration grid for active day */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Horários de {activeDayName}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Selecione os horários de atendimento para este dia da semana.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAllForDay}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Selecionar Todos
              </button>
              <button
                type="button"
                onClick={handleClearAllForDay}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Limpar Todos
              </button>
            </div>
          </div>

          {/* Grid of Slots */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {ALL_POSSIBLE_SLOTS.map((slot) => {
              const isSelected = currentDaySlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleToggleSlot(slot)}
                  className={`p-3.5 rounded-2xl border text-sm font-semibold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.08)]'
                      : 'bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <span>{slot}</span>
                  {isSelected ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-teal-500/20 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-teal-400" />
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
        <div>
          {message && (
            <p
              className={`text-sm font-semibold ${
                message.type === 'success' ? 'text-teal-400' : 'text-red-400'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-teal-500/10 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Salvando...' : 'Salvar Agenda Semanal'}
        </button>
      </div>
    </div>
  );
}
