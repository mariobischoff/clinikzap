import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { EvolutionService } from '@/services/evolution';
import { parseTemplate } from '@/utils/template-parser';

export const dynamic = 'force-dynamic';

const CRON_LOCK_KEY = 'cron:reminders:lock';
const CRON_LOCK_TTL = 300;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Distributed lock to prevent concurrent cron runs
    try {
      const lockAcquired = await redis.set(CRON_LOCK_KEY, '1', 'EX', CRON_LOCK_TTL, 'NX');
      if (!lockAcquired) {
        console.log('[Cron Reminders] Another cron instance is already running. Skipping.');
        return NextResponse.json({ message: 'Cron already running, skipped' }, { status: 200 });
      }
    } catch {
      console.warn('[Cron Reminders] Redis unavailable, proceeding without distributed lock');
    }

    const now = new Date();
    console.log(`[Cron Reminders] Checking active appointments at ${now.toISOString()}`);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent: false,
        appointmentDate: { gte: now },
      },
      include: { customer: true, user: true },
    });

    console.log(`[Cron Reminders] Found ${appointments.length} confirmed future appointments pending reminder check.`);

    const results = [];
    let sentCount = 0;

    for (const appointment of appointments) {
      try {
        const hoursUntilAppointment = (appointment.appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const clinicReminderHours = appointment.user.reminderHours ?? 24;

        const minHours = clinicReminderHours - 1.0;
        const maxHours = clinicReminderHours + 1.5;

        if (hoursUntilAppointment < minHours || hoursUntilAppointment > maxHours) {
          continue;
        }

        const dateStr = appointment.appointmentDate.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const timeStr = appointment.appointmentDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit',
        });

        const template = appointment.user.reminderTemplate ||
          `Olá, *{nome_paciente}*!\n\nEste é um lembrete da sua consulta marcada na clínica *{nome_clinica}* para o dia *{data_consulta}* às *{hora_consulta}*.\n\nContamos com a sua presença! Se precisar reagendar ou cancelar, entre em contato.`;

        const reminderMessage = parseTemplate(template, {
          nome_paciente: appointment.customer.name,
          nome_clinica: appointment.user.name || 'Clínica',
          data_consulta: dateStr,
          hora_consulta: timeStr,
        });

        // Atomic CAS: only send + mark sent if reminderSent is still false
        const { count } = await prisma.appointment.updateMany({
          where: { id: appointment.id, reminderSent: false },
          data: { reminderSent: true },
        });

        if (count === 0) {
          console.log(`[Cron Reminders] Appointment ${appointment.id} already marked as sent by another process. Skipping.`);
          continue;
        }

        await EvolutionService.sendTextMessage(appointment.customer.phone, reminderMessage);

        sentCount++;
        results.push({ id: appointment.id, phone: appointment.customer.phone, status: 'sent' });
        console.log(`[Cron Reminders] Reminder sent to ${appointment.customer.phone} for appointment ${appointment.id}`);
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
