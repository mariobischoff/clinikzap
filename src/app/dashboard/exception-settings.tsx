'use client';

import { useState, useTransition } from 'react';
import { setAvailabilityException, deleteAvailabilityException } from './actions';
import { Calendar, Plus, Trash2, Clock, Ban } from 'lucide-react';
import { generateSlotsForDuration } from './weekly-settings';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/confirmation-modal';

interface ExceptionRecord {
  id: string;
  date: string;
  slots: string[];
}

interface ExceptionSettingsProps {
  exceptions: ExceptionRecord[];
  duration: number;
}

export default function ExceptionSettings({ exceptions, duration }: ExceptionSettingsProps) {
  const allPossibleSlots = generateSlotsForDuration(duration);
  const [dateStr, setDateStr] = useState<string>('');
  const [blockAllDay, setBlockAllDay] = useState<boolean>(true);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exceptionToDelete, setExceptionToDelete] = useState<string | null>(null);

  // Set minimum date picker to today
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format

  const handleToggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSaveException = () => {
    if (!dateStr) {
      toast.error('Por favor, selecione uma data.');
      setMessage({ type: 'error', text: 'Por favor, selecione uma data.' });
      return;
    }

    if (!blockAllDay && selectedSlots.length === 0) {
      toast.error('Selecione pelo menos um horário ou bloqueie o dia todo.');
      setMessage({ type: 'error', text: 'Selecione pelo menos um horário ou bloqueie o dia todo.' });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await setAvailabilityException(dateStr, selectedSlots, blockAllDay);
      if (result.success) {
        toast.success('Exceção de agenda salva com sucesso!');
        setMessage({ type: 'success', text: 'Exceção de agenda salva com sucesso!' });
        setDateStr('');
        setSelectedSlots([]);
      } else {
        toast.error(result.error || 'Erro ao salvar exceção.');
        setMessage({ type: 'error', text: result.error || 'Erro ao salvar exceção.' });
      }
    });
  };

  const handleDeleteException = (id: string) => {
    setExceptionToDelete(id);
  };

  const executeDeleteException = (id: string) => {
    startTransition(async () => {
      const result = await deleteAvailabilityException(id);
      if (result.success) {
        toast.success('Exceção removida com sucesso!');
        setMessage({ type: 'success', text: 'Exceção removida com sucesso!' });
      } else {
        toast.error(result.error || 'Erro ao remover exceção.');
        setMessage({ type: 'error', text: result.error || 'Erro ao remover exceção.' });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left side: Add exception form */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-400" />
            Adicionar Exceção na Agenda
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Escolha uma data específica para bloquear o dia todo ou definir horários alternativos.
          </p>
        </div>

        {/* Date Selector */}
        <div className="space-y-2">
          <label htmlFor="exception-date" className="text-xs font-semibold text-slate-400">
            Selecione a Data
          </label>
          <input
            id="exception-date"
            type="date"
            min={todayStr}
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all text-sm [color-scheme:dark]"
          />
        </div>

        {/* Radio Option type */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-400 block">Tipo de Exceção</span>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setBlockAllDay(true)}
              className={`p-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                blockAllDay
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-slate-950 border-slate-900 text-slate-500 hover:border-slate-800'
              }`}
            >
              <Ban className="w-5 h-5" />
              Bloquear Dia Inteiro
            </button>

            <button
              type="button"
              onClick={() => setBlockAllDay(false)}
              className={`p-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                !blockAllDay
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                  : 'bg-slate-950 border-slate-900 text-slate-500 hover:border-slate-800'
              }`}
            >
              <Clock className="w-5 h-5" />
              Horários Customizados
            </button>
          </div>
        </div>

        {/* Customized hours grid (only visible if not blocking all day) */}
        {!blockAllDay && (
          <div className="space-y-3 animate-fadeIn">
            <span className="text-xs font-semibold text-slate-400 block">
              Selecione os horários disponíveis para este dia
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {allPossibleSlots.map((slot) => {
                const isSelected = selectedSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleToggleSlot(slot)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                        : 'bg-slate-950 border-slate-900 hover:border-slate-850 text-slate-500'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-850">
          <div>
            {message && (
              <p
                className={`text-xs font-semibold ${
                  message.type === 'success' ? 'text-teal-400' : 'text-red-400'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveException}
            disabled={isPending}
            className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Salvando...' : 'Adicionar Exceção'}
          </button>
        </div>
      </div>

      {/* Right side: List of current exceptions */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Exceções Ativas
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Lista de datas com bloqueios ou horários diferenciados da regra semanal padrão.
            </p>
          </div>

          {exceptions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              Nenhuma exceção configurada. O profissional segue a regra semanal padrão.
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {exceptions.map((exc) => {
                const isBlocked = exc.slots.length === 0;
                // Format date string YYYY-MM-DD to DD/MM/YYYY
                const [yr, mo, dy] = exc.date.split('-');
                const formattedDate = `${dy}/${mo}/${yr}`;

                return (
                  <div
                    key={exc.id}
                    className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-slate-100">{formattedDate}</span>
                      <div className="flex items-center gap-1.5">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                            <Ban className="w-2.5 h-2.5" />
                            Bloqueado o dia todo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                            <Clock className="w-2.5 h-2.5" />
                            {exc.slots.length} horários customizados
                          </span>
                        )}
                      </div>
                      {!isBlocked && (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[280px]">
                          {exc.slots.map((s) => (
                            <span key={s} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteException(exc.id)}
                      title="Excluir exceção (restaurar padrão)"
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!exceptionToDelete}
        title="Remover Exceção"
        message="Deseja realmente remover esta exceção e restaurar o horário semanal padrão para este dia?"
        confirmText="Confirmar"
        cancelText="Voltar"
        isDanger={true}
        onConfirm={() => {
          if (exceptionToDelete) executeDeleteException(exceptionToDelete);
          setExceptionToDelete(null);
        }}
        onCancel={() => setExceptionToDelete(null)}
      />
    </div>
  );
}
