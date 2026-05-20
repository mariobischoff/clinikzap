import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/services/evolution';

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
    // Search window: between 23 and 25 hours from now to capture appointments
    const minDate = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`[Cron Reminders] Checking appointments between ${minDate.toISOString()} and ${maxDate.toISOString()}`);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent: false,
        appointmentDate: {
          gte: minDate,
          lte: maxDate,
        },
      },
      include: {
        customer: true,
        user: true,
      },
    });

    console.log(`[Cron Reminders] Found ${appointments.length} appointments pending notification.`);

    const results = [];

    for (const appointment of appointments) {
      try {
        const dateStr = appointment.appointmentDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = appointment.appointmentDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const reminderMessage = `Olá, *${appointment.customer.name}*!\n\nEste é um lembrete da sua consulta marcada na clínica *${appointment.user.name}* para amanhã, dia *${dateStr}* às *${timeStr}*.\n\nContamos com a sua presença! Se precisar reagendar ou cancelar, entre em contato.`;

        await EvolutionService.sendTextMessage(appointment.customer.phone, reminderMessage);

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true },
        });

        results.push({ id: appointment.id, phone: appointment.customer.phone, status: 'sent' });
        console.log(`[Cron Reminders] Reminder successfully sent to ${appointment.customer.phone} for appointment ${appointment.id}`);
      } catch (sendError: unknown) {
        const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
        console.error(`[Cron Reminders] Failed to send reminder for appointment ${appointment.id}:`, sendError);
        results.push({ id: appointment.id, status: 'failed', error: errorMessage });
      }
    }

    return NextResponse.json({
      message: `Processed ${appointments.length} reminders`,
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
