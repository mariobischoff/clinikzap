import { getAppointmentByToken } from '../actions';
import SchedulingForm from './scheduling-form';
import { AlertTriangle, CalendarCheck2 } from 'lucide-react';


interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SchedulePage({ params }: PageProps) {
  const { token } = await params;
  const appointment = await getAppointmentByToken(token);

  // Scenario 1: Appointment token is invalid or does not exist
  if (!appointment) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Link Inválido</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            O link de agendamento que você acessou é inválido, expirou ou foi removido pela clínica.
          </p>
          <p className="text-xs text-slate-500">
            Entre em contato com a clínica via WhatsApp para solicitar um novo link.
          </p>
        </div>
      </main>
    );
  }

  // Scenario 2: Appointment is already confirmed
  if (appointment.status === 'CONFIRMED') {
    const dateFormatted = appointment.appointmentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatted = appointment.appointmentDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarCheck2 className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Consulta Já Agendada</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Esta consulta já foi confirmada anteriormente para o dia <strong>{dateFormatted}</strong> às <strong>{timeFormatted}</strong>.
          </p>
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 space-y-2 mb-6">
            <div className="flex justify-between">
              <span>Paciente:</span>
              <span className="font-semibold text-slate-100">{appointment.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Clínica:</span>
              <span className="font-semibold text-slate-100">{appointment.user.name}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Se precisar realizar alterações, por favor, entre em contato diretamente com a clínica.
          </p>
        </div>
      </main>
    );
  }

  // Scenario 3: Appointment is canceled
  if (appointment.status === 'CANCELED') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative">
        <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Agendamento Cancelado</h1>
          <p className="text-slate-400 text-sm mb-6">
            Esta consulta foi cancelada pelo profissional ou pelo paciente.
          </p>
        </div>
      </main>
    );
  }

  // Scenario 4: Appointment is pending, render form
  return <SchedulingForm appointment={appointment} />;
}
