import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { WhatsappService } from '@/services/whatsapp.service';
import { parseTemplate } from '@/utils/template-parser';

interface CancelRequestBody {
  token: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as Partial<CancelRequestBody>;
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Fetch the appointment using the secure token
    const appointment = await prisma.appointment.findUnique({
      where: { token },
      include: {
        customer: true,
        user: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify if it exists and its current status is 'PENDING' or 'CONFIRMED'
    if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: `Cannot cancel appointment with status '${appointment.status}'` },
        { status: 400 }
      );
    }

    // 2. Update the appointment status to 'CANCELED'
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CANCELED' },
    });

    console.log(`[Appointment Cancel] Successfully canceled appointment ID ${appointment.id} for customer ${appointment.customer.name}`);

    // 3. Trigger mock WhatsApp service using templates
    const dateFormatted = appointment.appointmentDate
      ? new Date(appointment.appointmentDate).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';
    const timeFormatted = appointment.appointmentDate
      ? new Date(appointment.appointmentDate).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const template = appointment.user.cancellationTemplate || `Olá, *{nome_paciente}*.\n\nSua consulta na clínica *{nome_clinica}* agendada para *{data_consulta}* às *{hora_consulta}* foi cancelada.`;

    const patientMessage = parseTemplate(template, {
      nome_paciente: appointment.customer.name,
      nome_clinica: appointment.user.name || 'Clínica',
      data_consulta: dateFormatted,
      hora_consulta: timeFormatted,
    });

    try {
      await WhatsappService.sendTextMessage(appointment.customer.phone, patientMessage);
    } catch (msgError) {
      console.error('[Appointment Cancel] Failed to send WhatsApp cancellation message:', msgError);
    }

    return NextResponse.json({
      message: 'Appointment successfully canceled',
      appointment: updatedAppointment,
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Appointment Cancel] Error processing cancellation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
