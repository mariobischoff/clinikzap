'use server';

import prisma from '@/lib/prisma';
import { EvolutionService } from '@/services/evolution';
import { parseTemplate } from '@/utils/template-parser';

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

    // To get correct weekday (0 = Sunday, 1 = Monday, etc.) without timezone distortion
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();

    // Fetch clinic weekly hours and potential date exceptions for the target date
    const clinic = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weeklyHours: true,
        workingHours: true,
        duration: true,
        availabilityExceptions: {
          where: {
            date: dateStr,
          },
        },
      },
    });

    let standardSlots: string[] = [];

    const exception = clinic?.availabilityExceptions?.[0];
    if (exception) {
      // If there's an exception, use its custom slots (empty array means fully blocked)
      standardSlots = exception.slots;
    } else {
      // If no exception, use weekly hours for this weekday
      const weeklyHoursObj = (clinic?.weeklyHours as Record<string, string[]>) || {};
      const daySlots = weeklyHoursObj[String(dayOfWeek)];
      
      if (daySlots) {
        standardSlots = daySlots;
      } else {
        // Fallback to generating slots dynamically using clinic duration (default 30m)
        const duration = clinic?.duration ?? 30;
        const slots: string[] = [];
        
        // Generate standard morning slots (08:00 to 12:00) and afternoon slots (13:00 to 18:00)
        const generateRange = (startHr: number, endHr: number) => {
          let current = startHr * 60;
          const end = endHr * 60;
          while (current < end) {
            const h = Math.floor(current / 60);
            const m = current % 60;
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            current += duration;
          }
        };
        
        generateRange(8, 12);
        generateRange(13, 18);
        standardSlots = slots;
      }
    }

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

    const template = appointment.user.confirmationTemplate || `Olá, *{nome_paciente}*!\n\nConfirmamos seu agendamento na clínica *{nome_clinica}*:\n\n📅 Data: *{data_consulta}*\n⏰ Horário: *{hora_consulta}*\n\nSeu agendamento foi salvo com sucesso!`;

    const confirmationText = parseTemplate(template, {
      nome_paciente: customerName,
      nome_clinica: appointment.user.name || 'Clínica',
      data_consulta: dateFormatted,
      hora_consulta: timeStr,
    });

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
