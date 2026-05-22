'use client';

import { useState, useTransition } from 'react';
import { updateWeeklyHours, updateClinicDuration } from './actions';
import { Check, Save, Calendar, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WeeklySettingsProps {
  initialWeeklyHours: Record<string, string[]>;
  initialDuration: number;
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

export function generateSlotsForDuration(durationMinutes: number): string[] {
  const slots: string[] = [];
  const startHour = 7;
  const endHour = 22; // 07:00 to 22:00
  let currentMins = startHour * 60;
  const endMins = endHour * 60;
  
  while (currentMins <= endMins) {
    const hours = Math.floor(currentMins / 60);
    const minutes = currentMins % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    currentMins += durationMinutes;
  }
  return slots;
}

export default function WeeklySettings({ initialWeeklyHours, initialDuration }: WeeklySettingsProps) {
  const [duration, setDuration] = useState<number>(initialDuration);
  const [isUpdatingDuration, startDurationTransition] = useTransition();

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
  const allPossibleSlots = generateSlotsForDuration(duration);

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
      [selectedDay]: allPossibleSlots,
    }));
  };

  const handleClearAllForDay = () => {
    setWeeklyHours((prev) => ({
      ...prev,
      [selectedDay]: [],
    }));
  };

  const handleDurationChange = (newDuration: number) => {
    setMessage(null);
    startDurationTransition(async () => {
      const result = await updateClinicDuration(newDuration);
      if (result.success) {
        setDuration(newDuration);
        setMessage({ type: 'success', text: 'Duração da consulta atualizada com sucesso!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao atualizar duração.' });
      }
    });
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
      {/* Configuration of default slot duration */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">Duração Padrão da Consulta</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha a duração de cada sessão. O grid de horários abaixo será recalculado.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(duration)}
            disabled={isUpdatingDuration}
            onValueChange={(val) => handleDurationChange(Number(val))}
          >
            <SelectTrigger className="w-[180px] bg-slate-950/40 border-white/5 text-slate-200 font-semibold cursor-pointer">
              <SelectValue placeholder="Selecione a duração" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border border-white/10 text-slate-200">
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="45">45 minutos</SelectItem>
              <SelectItem value="60">1 hora (60 min)</SelectItem>
            </SelectContent>
          </Select>
          {isUpdatingDuration && <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />}
        </div>
      </div>

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
                <Button
                  key={day.index}
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedDay(day.index)}
                  className={cn(
                    "w-full h-auto py-3 px-4 rounded-2xl flex items-center justify-between border text-sm font-semibold transition-all cursor-pointer",
                    isActive
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.05)] hover:bg-teal-500/15 hover:text-teal-400"
                      : "bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    {day.name}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full font-bold",
                      slotCount > 0
                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                        : "bg-slate-900 text-slate-500 border border-slate-800"
                    )}
                  >
                    {slotCount} horários
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Slots configuration grid for active day */}
        <div className="flex-1 glass-panel rounded-3xl p-6 space-y-6">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllForDay}
                className="bg-slate-950/40 hover:bg-slate-900/40 border border-white/5 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Selecionar Todos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAllForDay}
                className="bg-slate-950/40 hover:bg-slate-900/40 border border-white/5 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Limpar Todos
              </Button>
            </div>
          </div>

          {/* Grid of Slots */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {allPossibleSlots.map((slot) => {
              const isSelected = currentDaySlots.includes(slot);
              return (
                <Button
                  key={slot}
                  type="button"
                  variant="outline"
                  onClick={() => handleToggleSlot(slot)}
                  className={cn(
                    "h-auto p-3.5 rounded-2xl border text-sm font-semibold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1.5",
                    isSelected
                      ? "bg-teal-500/10 border-teal-500/40 text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.08)] hover:bg-teal-500/15 hover:text-teal-400"
                      : "bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-500 hover:text-slate-400"
                  )}
                >
                  <span>{slot}</span>
                  {isSelected ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-teal-500/20 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-teal-400" />
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
        <div>
          {message && (
            <p
              className={cn(
                "text-sm font-semibold",
                message.type === 'success' ? 'text-teal-400' : 'text-red-400'
              )}
            >
              {message.text}
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full sm:w-auto h-12 flex items-center justify-center gap-2 px-6 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-teal-500/10 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Salvando...' : 'Salvar Agenda Semanal'}
        </Button>
      </div>
    </div>
  );
}
