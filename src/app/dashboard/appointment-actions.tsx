'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/confirmation-modal';

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
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  if (status === 'CANCELED') {
    return <span className="text-slate-500 text-xs italic">Sem ações disponíveis</span>;
  }

  const executeCancel = () => {
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
          toast.error(`Erro ao cancelar: ${err.error || 'Erro desconhecido'}`);
        } else {
          toast.success('Consulta cancelada com sucesso!');
          router.refresh();
        }
      } catch (error) {
        console.error('[Appointment Actions] Failed to cancel appointment:', error);
        toast.error('Erro ao processar cancelamento da consulta.');
      } finally {
        setActionType(null);
      }
    });
  };

  const executeReschedule = () => {
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
          toast.error(`Erro ao reagendar: ${err.error || 'Erro desconhecido'}`);
        } else {
          toast.success('Reagendamento processado! Link enviado ao paciente.');
          router.refresh();
        }
      } catch (error) {
        console.error('[Appointment Actions] Failed to reschedule appointment:', error);
        toast.error('Erro ao processar reagendamento.');
      } finally {
        setActionType(null);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowRescheduleModal(true)}
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
          onClick={() => setShowCancelModal(true)}
          disabled={isPending}
          title="Cancelar consulta"
          className="flex items-center justify-center p-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-450 hover:text-red-300 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending && actionType === 'cancel' ? (
            <Trash2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <ConfirmationModal
        isOpen={showCancelModal}
        title="Cancelar Consulta"
        message="Deseja realmente cancelar esta consulta? Esta ação não pode ser desfeita."
        confirmText="Confirmar"
        cancelText="Voltar"
        isDanger={true}
        onConfirm={() => {
          setShowCancelModal(false);
          executeCancel();
        }}
        onCancel={() => setShowCancelModal(false)}
      />

      <ConfirmationModal
        isOpen={showRescheduleModal}
        title="Solicitar Reagendamento"
        message="Deseja realmente reagendar esta consulta? O agendamento atual será cancelado e o paciente receberá um novo link de agendamento por WhatsApp."
        confirmText="Reagendar"
        cancelText="Voltar"
        isDanger={false}
        onConfirm={() => {
          setShowRescheduleModal(false);
          executeReschedule();
        }}
        onCancel={() => setShowRescheduleModal(false)}
      />
    </>
  );
}
