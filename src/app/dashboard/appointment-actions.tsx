'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ConfirmationModal from '@/components/confirmation-modal';

interface AppointmentActionsProps {
  appointmentId: string;
  appointmentToken: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'NOSHOW';
}

export default function AppointmentActions({
  appointmentId,
  appointmentToken,
  status,
}: AppointmentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<'cancel' | 'reschedule' | 'complete' | 'noshow' | null>(null);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNoshowModal, setShowNoshowModal] = useState(false);

  if (status === 'CANCELED' || status === 'COMPLETED' || status === 'NOSHOW') {
    return <span className="text-slate-500 text-xs italic">Sem ações disponíveis</span>;
  }

  const executeComplete = () => {
    setActionType('complete');
    startTransition(async () => {
      try {
        const { markAppointmentStatus } = await import('@/app/dashboard/actions');
        const result = await markAppointmentStatus(appointmentId, 'COMPLETED');
        if (result.success) {
          toast.success('Consulta marcada como compareceu!');
          router.refresh();
        } else {
          toast.error(`Erro: ${result.error}`);
        }
      } catch (error) {
        console.error('[Appointment Actions] Failed to mark as completed:', error);
        toast.error('Erro ao processar.');
      } finally {
        setActionType(null);
      }
    });
  };

  const executeNoshow = () => {
    setActionType('noshow');
    startTransition(async () => {
      try {
        const { markAppointmentStatus } = await import('@/app/dashboard/actions');
        const result = await markAppointmentStatus(appointmentId, 'NOSHOW');
        if (result.success) {
          toast.success('Paciente marcado como não compareceu.');
          router.refresh();
        } else {
          toast.error(`Erro: ${result.error}`);
        }
      } catch (error) {
        console.error('[Appointment Actions] Failed to mark as noshow:', error);
        toast.error('Erro ao processar.');
      } finally {
        setActionType(null);
      }
    });
  };

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
        {status === 'CONFIRMED' && (
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowCompleteModal(true)}
              disabled={isPending}
              title="Marcar como compareceu"
              className="p-2 bg-teal-600/10 border-teal-500/20 hover:bg-teal-600/20 text-teal-400 hover:text-teal-300 rounded-xl cursor-pointer h-auto w-auto border"
            >
              {isPending && actionType === 'complete' ? (
                <CheckCircle2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </Button>

            <Button
              variant="outline"
              type="button"
              onClick={() => setShowNoshowModal(true)}
              disabled={isPending}
              title="Marcar como não compareceu"
              className="p-2 bg-orange-600/10 border-orange-500/20 hover:bg-orange-600/20 text-orange-400 hover:text-orange-300 rounded-xl cursor-pointer h-auto w-auto border"
            >
              {isPending && actionType === 'noshow' ? (
                <XCircle className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          type="button"
          onClick={() => setShowRescheduleModal(true)}
          disabled={isPending}
          title="Reagendar consulta (Paciente receberá novo link)"
          className="p-2 bg-indigo-600/10 border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 rounded-xl cursor-pointer h-auto w-auto border"
        >
          {isPending && actionType === 'reschedule' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </Button>

        <Button
          variant="outline"
          type="button"
          onClick={() => setShowCancelModal(true)}
          disabled={isPending}
          title="Cancelar consulta"
          className="p-2 bg-red-600/10 border-red-500/20 hover:bg-red-600/20 text-red-450 hover:text-red-300 rounded-xl cursor-pointer h-auto w-auto border"
        >
          {isPending && actionType === 'cancel' ? (
            <Trash2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={showCompleteModal}
        title="Confirmar Comparecimento"
        message="Deseja confirmar que o paciente compareceu a esta consulta?"
        confirmText="Sim, compareceu"
        cancelText="Voltar"
        isDanger={false}
        onConfirm={() => {
          setShowCompleteModal(false);
          executeComplete();
        }}
        onCancel={() => setShowCompleteModal(false)}
      />

      <ConfirmationModal
        isOpen={showNoshowModal}
        title="Registrar Falta"
        message="Deseja registrar que o paciente NÃO compareceu a esta consulta?"
        confirmText="Sim, não compareceu"
        cancelText="Voltar"
        isDanger={true}
        onConfirm={() => {
          setShowNoshowModal(false);
          executeNoshow();
        }}
        onCancel={() => setShowNoshowModal(false)}
      />

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
