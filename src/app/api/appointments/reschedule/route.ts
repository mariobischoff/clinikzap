import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { WhatsappService } from '@/services/whatsapp.service';
import { parseTemplate } from '@/utils/template-parser';

interface RescheduleRequestBody {
  appointmentId: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as Partial<RescheduleRequestBody>;
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // 1. Fetch the original appointment with associations
    const originalAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        user: true,
      },
    });

    if (!originalAppointment) {
      return NextResponse.json({ error: 'Original appointment not found' }, { status: 404 });
    }

    if (originalAppointment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify it is not already canceled
    if (originalAppointment.status === 'CANCELED') {
      return NextResponse.json({ error: 'Appointment is already canceled' }, { status: 400 });
    }

    // 2. Perform transaction: Cancel original, create new pending
    const transactionResult = await prisma.$transaction(async (tx) => {
      const canceled = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELED' },
      });

      const placeholderDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const rescheduled = await tx.appointment.create({
        data: {
          customerId: originalAppointment.customerId,
          userId: originalAppointment.userId,
          appointmentDate: placeholderDate,
          status: 'PENDING',
        },
      });

      return { canceled, rescheduled };
    });

    console.log(`[Appointment Reschedule] Successfully canceled appointment ID ${appointmentId} and created new pending appointment ID ${transactionResult.rescheduled.id}`);

    // 3. Trigger mock WhatsApp service
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const scheduleLink = `${appUrl}/schedule/${transactionResult.rescheduled.token}`;
    
    const template = `Olá, *{nome_paciente}*! Devido a um imprevisto na clínica, precisamos reagendar sua consulta com a clínica *{nome_clinica}*. Pedimos desculpas pelo transtorno. Por favor, acesse o link abaixo para escolher um novo horário conveniente para você:\n\n{link_consulta}`;

    const patientMessage = parseTemplate(template, {
      nome_paciente: originalAppointment.customer.name,
      nome_clinica: originalAppointment.user.name || 'Clínica',
      link_consulta: scheduleLink,
    });

    try {
      await WhatsappService.sendTextMessage(originalAppointment.customer.phone, patientMessage);
    } catch (msgError) {
      console.error('[Appointment Reschedule] Failed to send WhatsApp reschedule message:', msgError);
    }

    return NextResponse.json({
      message: 'Appointment successfully rescheduled by clinic',
      canceledAppointment: transactionResult.canceled,
      newPendingAppointment: transactionResult.rescheduled,
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Appointment Reschedule] Error processing reschedule:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
