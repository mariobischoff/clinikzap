import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/services/evolution';
import { parseTemplate } from '@/utils/template-parser';

// Force Next.js to not cache this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Optional: secure this endpoint using an API token/secret key in production
    // e.g. Authorization: Bearer CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    console.log(`[Cron Reminders] Checking active appointments at ${now.toISOString()}`);

    // Fetch all confirmed appointments in the future that haven't received a reminder yet
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent: false,
        appointmentDate: {
          gte: now,
        },
      },
      include: {
        customer: true,
        user: true,
      },
    });

    console.log(`[Cron Reminders] Found ${appointments.length} confirmed future appointments pending reminder check.`);

    const results = [];
    let sentCount = 0;

    for (const appointment of appointments) {
      try {
        const hoursUntilAppointment = (appointment.appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const clinicReminderHours = appointment.user.reminderHours ?? 24;

        // Check if the appointment falls within the notification window for this clinic.
        // We define the window as: [clinicReminderHours - 1, clinicReminderHours + 1.5]
        // This ensures that an hourly cron job will reliably trigger once.
        const minHours = clinicReminderHours - 1.0;
        const maxHours = clinicReminderHours + 1.5;

        if (hoursUntilAppointment < minHours || hoursUntilAppointment > maxHours) {
          // Not within the trigger window for this clinic's settings, skip
          continue;
        }

        const dateStr = appointment.appointmentDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = appointment.appointmentDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const template = appointment.user.reminderTemplate || 
          `Olá, *{nome_paciente}*!\n\nEste é um lembrete da sua consulta marcada na clínica *{nome_clinica}* para o dia *{data_consulta}* às *{hora_consulta}*.\n\nContamos com a sua presença! Se precisar reagendar ou cancelar, entre em contato.`;

        const reminderMessage = parseTemplate(template, {
          nome_paciente: appointment.customer.name,
          nome_clinica: appointment.user.name || 'Clínica',
          data_consulta: dateStr,
          hora_consulta: timeStr,
        });

        await EvolutionService.sendTextMessage(appointment.customer.phone, reminderMessage);

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true },
        });

        sentCount++;
        results.push({ id: appointment.id, phone: appointment.customer.phone, status: 'sent' });
        console.log(`[Cron Reminders] Reminder successfully sent to ${appointment.customer.phone} for appointment ${appointment.id}`);
      } catch (sendError: unknown) {
        const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
        console.error(`[Cron Reminders] Failed to send reminder for appointment ${appointment.id}:`, sendError);
        results.push({ id: appointment.id, status: 'failed', error: errorMessage });
      }
    }

    return NextResponse.json({
      message: `Processed ${appointments.length} appointments, sent ${sentCount} reminders`,
      results,
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Cron Reminders] Global cron execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
