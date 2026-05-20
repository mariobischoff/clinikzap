import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';

// Dynamically render dashboard page to fetch latest data on reload
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const appointments = await prisma.appointment.findMany({
    where: { userId },
    include: {
      customer: true,
    },
    orderBy: {
      appointmentDate: 'desc',
    },
  });

  // Calculate statistics
  const total = appointments.length;
  const confirmed = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const pending = appointments.filter((a) => a.status === 'PENDING').length;
  const canceled = appointments.filter((a) => a.status === 'CANCELED').length;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Painel Geral</h1>
        <p className="text-slate-400 mt-1">
          Gerencie os agendamentos de consultas de sua clínica e acompanhe estatísticas
        </p>
      </div>

      {/* Metrics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total</span>
          <p className="text-3xl font-bold mt-2 text-slate-100">{total}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <span className="text-teal-400 text-xs font-semibold uppercase tracking-wider">Confirmados</span>
          <p className="text-3xl font-bold mt-2 text-teal-400">{confirmed}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Pendentes</span>
          <p className="text-3xl font-bold mt-2 text-indigo-400">{pending}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Cancelados</span>
          <p className="text-3xl font-bold mt-2 text-red-400">{canceled}</p>
        </div>
      </div>

      {/* Main Agenda Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-teal-400" />
          Fila de Agendamentos
        </h2>

        {appointments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Nenhum agendamento registrado até o momento.
            <br />
            Quando um paciente enviar uma mensagem via WhatsApp, o agendamento aparecerá aqui automaticamente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="pb-4">Paciente</th>
                  <th className="pb-4">WhatsApp</th>
                  <th className="pb-4">Data da Consulta</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Token de Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                {appointments.map((app) => {
                  const dateStr = app.appointmentDate
                    ? app.appointmentDate.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '-';
                  const timeStr = app.appointmentDate
                    ? app.appointmentDate.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';

                  return (
                    <tr key={app.id} className="hover:bg-slate-850/20 transition-colors">
                      <td className="py-4 font-semibold text-slate-100 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        {app.customer.name}
                      </td>
                      <td className="py-4 text-slate-400">
                        <span className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {app.customer.phone}
                        </span>
                      </td>
                      <td className="py-4 font-medium">
                        {app.status === 'PENDING' ? (
                          <span className="text-slate-500 italic text-xs">Aguardando escolha...</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                            {dateStr} <span className="text-teal-400 font-semibold">{timeStr}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        {app.status === 'CONFIRMED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                            <CheckCircle className="w-3 h-3" />
                            Confirmado
                          </span>
                        )}
                        {app.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Clock className="w-3 h-3" />
                            Pendente
                          </span>
                        )}
                        {app.status === 'CANCELED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                            <AlertCircle className="w-3 h-3" />
                            Cancelado
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-slate-800 border border-slate-700/50 px-2 py-1 rounded-md text-slate-400">
                            {app.token.substring(0, 8)}...
                          </code>
                          <CopyLinkButton token={app.token} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline helper component for copying public scheduling link (Client Component wrapper)
import CopyLinkButton from './copy-link-button';
