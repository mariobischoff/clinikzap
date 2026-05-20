'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, RefreshCw } from 'lucide-react';

interface AppointmentActionsProps {
  appointmentId: string;
  appointmentToken: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
}

export default function AppointmentActions({
  appointmentId,
  appointmentToken,
  status,
}: AppointmentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<'cancel' | 'reschedule' | null>(null);

  if (status === 'CANCELED') {
    return <span className="text-slate-500 text-xs italic">Sem ações disponíveis</span>;
  }

  const handleCancel = async () => {
    if (!confirm('Deseja realmente cancelar esta consulta?')) return;

    setActionType('cancel');
    startTransition(async () => {
      try {
        const response = await fetch('/api/appointments/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: appointmentToken }),
        });

        if (!response.ok) {
          const err = await response.json();
          alert(`Erro: ${err.error || 'Erro desconhecido'}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        console.error('[Appointment Actions] Failed to cancel appointment:', error);
        alert('Erro ao processar cancelamento.');
      } finally {
        setActionType(null);
      }
    });
  };

  const handleReschedule = async () => {
    if (
      !confirm(
        'Deseja reagendar esta consulta? O agendamento atual será cancelado e o paciente receberá um novo link de agendamento por WhatsApp.'
      )
    ) {
      return;
    }

    setActionType('reschedule');
    startTransition(async () => {
      try {
        const response = await fetch('/api/appointments/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId }),
        });

        if (!response.ok) {
          const err = await response.json();
          alert(`Erro: ${err.error || 'Erro desconhecido'}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        console.error('[Appointment Actions] Failed to reschedule appointment:', error);
        alert('Erro ao processar reagendamento.');
      } finally {
        setActionType(null);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleReschedule}
        disabled={isPending}
        title="Reagendar consulta (Paciente receberá novo link)"
        className="flex items-center justify-center p-2 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
      >
        {isPending && actionType === 'reschedule' ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
      </button>

      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        title="Cancelar consulta"
        className="flex items-center justify-center p-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
      >
        {isPending && actionType === 'cancel' ? (
          <Trash2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
