import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import AppointmentsViewWrapper from './appointments-view-wrapper';
import AvailabilitySettings from './availability-settings';
import DashboardTabs from './dashboard-tabs';
import NotificationSettings from './notification-settings';
import AnalyticsPanel from './analytics-panel';

// Dynamically render dashboard page to fetch latest data on reload
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="text-center py-12 text-slate-400">
        Você precisa estar autenticado para acessar esta página.
      </div>
    );
  }

  // Fetch appointments
  const appointments = await prisma.appointment.findMany({
    where: { userId },
    include: {
      customer: true,
    },
    orderBy: {
      appointmentDate: 'desc',
    },
  });

  // Fetch user working hours, exceptions, and templates
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weeklyHours: true,
      duration: true,
      confirmationTemplate: true,
      cancellationTemplate: true,
      reminderTemplate: true,
      reminderHours: true,
      availabilityExceptions: {
        orderBy: {
          date: 'asc',
        },
      },
    },
  });

  const weeklyHours = (userRecord?.weeklyHours as Record<string, string[]>) || {};
  const exceptions = userRecord?.availabilityExceptions || [];
  const duration = userRecord?.duration ?? 30;
  const confirmationTemplate = userRecord?.confirmationTemplate ?? null;
  const cancellationTemplate = userRecord?.cancellationTemplate ?? null;
  const reminderTemplate = userRecord?.reminderTemplate ?? null;
  const reminderHours = userRecord?.reminderHours ?? 24;

  // Calculate statistics
  const total = appointments.length;
  const confirmed = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const pending = appointments.filter((a) => a.status === 'PENDING').length;
  const canceled = appointments.filter((a) => a.status === 'CANCELED').length;

  const appointmentsQueue = (
    <div className="space-y-8">
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

      {/* Analytics Panel Component */}
      <AnalyticsPanel appointments={appointments} />

      {/* Main Agenda Section */}
      <AppointmentsViewWrapper initialAppointments={appointments} />
    </div>
  );

  const availabilitySettings = (
    <AvailabilitySettings
      initialWeeklyHours={weeklyHours}
      exceptions={exceptions}
      initialDuration={duration}
    />
  );

  const notificationSettings = (
    <NotificationSettings
      initialConfirmationTemplate={confirmationTemplate}
      initialCancellationTemplate={cancellationTemplate}
      initialReminderTemplate={reminderTemplate}
      initialReminderHours={reminderHours}
    />
  );

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Painel Geral</h1>
        <p className="text-slate-400 mt-1">
          Gerencie os agendamentos de consultas de sua clínica e configure a disponibilidade de horários.
        </p>
      </div>

      <DashboardTabs
        appointmentsQueue={appointmentsQueue}
        availabilitySettings={availabilitySettings}
        notificationSettings={notificationSettings}
      />
    </div>
  );
}
