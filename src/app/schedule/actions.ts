'use server';

import prisma from '@/lib/prisma';
import { EvolutionService } from '@/services/evolution';

export interface AppointmentDetails {
  id: string;
  appointmentDate: Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  token: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  user: {
    id: string;
    name: string;
  };
}

/**
 * Fetch appointment data by its unique token
 */
export async function getAppointmentByToken(token: string): Promise<AppointmentDetails | null> {
  if (!token) return null;
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { token },
      include: {
        customer: true,
        user: true,
      },
    });

    if (!appointment) return null;

    return {
      id: appointment.id,
      appointmentDate: appointment.appointmentDate,
      status: appointment.status as 'PENDING' | 'CONFIRMED' | 'CANCELED',
      token: appointment.token,
      customer: {
        id: appointment.customer.id,
        name: appointment.customer.name,
        phone: appointment.customer.phone,
      },
      user: {
        id: appointment.user.id,
        name: appointment.user.name,
      },
    };
  } catch (error) {
    console.error('[Actions] Error fetching appointment by token:', error);
    return null;
  }
}

/**
 * Returns available hourly slots for a specific date and clinic (userId)
 */
export async function getAvailableSlots(dateStr: string, userId: string): Promise<string[]> {
  try {
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Standard business hours slots
    const standardSlots = [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
    ];

    // Find all confirmed appointments for this clinic on this date
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        appointmentDate: true,
      },
    });

    // Format booked times (e.g. "14:00") based on the database timezone
    const bookedTimes = bookedAppointments.map((app) => {
      const hours = String(app.appointmentDate.getHours()).padStart(2, '0');
      const minutes = String(app.appointmentDate.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    // Filter out the booked slots
    return standardSlots.filter((slot) => !bookedTimes.includes(slot));
  } catch (error) {
    console.error('[Actions] Error getting available slots:', error);
    return [];
  }
}

/**
 * Confirms a pending appointment, sets the chosen date/time, and notifies the patient
 */
export async function confirmAppointment(
  token: string,
  dateStr: string,
  timeStr: string,
  customerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { token },
      include: {
        customer: true,
        user: true,
      },
    });

    if (!appointment) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }

    if (appointment.status !== 'PENDING') {
      return { success: false, error: 'Este agendamento já foi finalizado ou cancelado.' };
    }

    // Merge date and time string into a single Date object
    // e.g. dateStr = "2026-05-20", timeStr = "14:00"
    const [hours, minutes] = timeStr.split(':').map(Number);
    const finalDate = new Date(dateStr);
    finalDate.setHours(hours, minutes, 0, 0);

    // Update appointment status and customer's name if modified
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          appointmentDate: finalDate,
          status: 'CONFIRMED',
        },
      }),
      prisma.customer.update({
        where: { id: appointment.customerId },
        data: {
          name: customerName,
        },
      }),
    ]);

    // Send confirmation message to the patient
    const dateFormatted = finalDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const confirmationText = `Olá, *${customerName}*!\n\nConfirmamos seu agendamento na clínica *${appointment.user.name}*:\n\n📅 Data: *${dateFormatted}*\n⏰ Horário: *${timeStr}*\n\nSeu agendamento foi salvo com sucesso!`;

    try {
      await EvolutionService.sendTextMessage(appointment.customer.phone, confirmationText);
    } catch (msgError) {
      console.error('[Actions] Failed to send WhatsApp confirmation:', msgError);
      // We don't fail the whole action if only messaging fails, but we log it
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Actions] Error confirming appointment:', error);
    return { success: false, error: errorMessage };
  }
}
