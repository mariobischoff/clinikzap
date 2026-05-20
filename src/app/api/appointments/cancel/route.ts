import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { WhatsappService } from '@/services/whatsapp.service';

interface CancelRequestBody {
  token: string;
}

export async function POST(req: NextRequest) {
  try {
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

    // 3. Trigger mock WhatsApp service
    const patientMessage = `Olá, ${appointment.customer.name}! Confirmamos que o agendamento da sua consulta com a clínica *${appointment.user.name}* foi cancelado com sucesso. O horário foi liberado em nossa agenda. Se desejar realizar um novo agendamento no futuro, por favor entre em contato conosco.`;

    await WhatsappService.sendTextMessage(appointment.customer.phone, patientMessage);

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
