'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAvailableSlots } from '@/app/schedule/actions';
import { parseTemplate } from '@/utils/template-parser';
import { Customer, Appointment } from '@prisma/client';

/**
 * Updates the available time slots (working hours) of the logged-in professional
 * @deprecated Use updateWeeklyHours for full weekday configurability
 */
export async function updateWorkingHours(slots: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized: No active session found');
    }

    // Sort the slots chronologically (e.g., "08:00" before "09:00")
    const sortedSlots = [...slots].sort((a, b) => a.localeCompare(b));

    await prisma.user.update({
      where: { id: userId },
      data: {
        workingHours: sortedSlots,
      },
    });

    console.log(`[Dashboard Actions] Successfully updated working hours for user ${userId}:`, sortedSlots);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to update working hours:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Updates weekly schedule availability (by weekday: 0-6 index)
 */
export async function updateWeeklyHours(
  weeklyHours: Record<string, string[]>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Ensure all 7 days are represented and sorted
    const cleanedWeeklyHours: Record<string, string[]> = {};
    for (const day of ['0', '1', '2', '3', '4', '5', '6']) {
      cleanedWeeklyHours[day] = (weeklyHours[day] || []).sort((a, b) => a.localeCompare(b));
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        weeklyHours: cleanedWeeklyHours,
      },
    });

    console.log(`[Dashboard Actions] Successfully updated weekly hours for user ${userId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to update weekly hours:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Updates the clinic's default appointment duration (in minutes)
 */
export async function updateClinicDuration(
  duration: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    if (![30, 45, 60].includes(duration)) {
      throw new Error('Duração inválida. Escolha 30, 45 ou 60 minutos.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        duration,
      },
    });

    console.log(`[Dashboard Actions] Successfully updated duration to ${duration}m for user ${userId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to update duration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Adds or updates a date-specific availability exception
 */
export async function setAvailabilityException(
  dateStr: string,
  slots: string[],
  blockAllDay: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('Formato de data inválido. Use AAAA-MM-DD');
    }

    const sortedSlots = blockAllDay ? [] : [...slots].sort((a, b) => a.localeCompare(b));

    await prisma.availabilityException.upsert({
      where: {
        userId_date: {
          userId,
          date: dateStr,
        },
      },
      create: {
        userId,
        date: dateStr,
        slots: sortedSlots,
      },
      update: {
        slots: sortedSlots,
      },
    });

    console.log(`[Dashboard Actions] Set availability exception for user ${userId} on date ${dateStr}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to set availability exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Removes an availability exception, restoring standard weekly hours for that date
 */
export async function deleteAvailabilityException(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    await prisma.availabilityException.delete({
      where: {
        id,
        userId,
      },
    });

    console.log(`[Dashboard Actions] Deleted availability exception ${id} for user ${userId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to delete availability exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Searches the database for customers belonging to this clinic by name or phone
 */
export async function searchCustomers(
  query: string
): Promise<Array<{ id: string; name: string; phone: string }>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    const customers = await prisma.customer.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    return customers;
  } catch (error) {
    console.error('[Dashboard Actions] Failed to search customers:', error);
    return [];
  }
}

/**
 * Creates an appointment manually from the admin panel and triggers a confirmation WhatsApp
 */
export async function createManualAppointment(data: {
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
}): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userName = session?.user?.name || 'Clínica';

    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { date, time, customerName, customerPhone } = data;

    if (!date || !time || !customerName.trim() || !customerPhone.trim()) {
      throw new Error('Por favor, preencha todos os campos obrigatórios.');
    }

    // Normalize phone number (digits only, prepending 55 if Brazilian DDD number provided without country code)
    let cleanedPhone = customerPhone.replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55') && (cleanedPhone.length === 10 || cleanedPhone.length === 11)) {
      cleanedPhone = '55' + cleanedPhone;
    }

    // 1. Find or create the Customer
    let customer = await prisma.customer.findUnique({
      where: {
        phone_userId: {
          phone: cleanedPhone,
          userId,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: cleanedPhone,
          userId,
        },
      });
    }

    // 2. Parse date and time into a single Date object
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDate = new Date(date + 'T00:00:00');
    appointmentDate.setHours(hours, minutes, 0, 0);

    // 3. Create the CONFIRMED appointment
    await prisma.appointment.create({
      data: {
        customerId: customer.id,
        userId,
        appointmentDate,
        status: 'CONFIRMED',
      },
    });

    // Fetch template settings from the user
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        confirmationTemplate: true,
      },
    });

    const clinicName = userRecord?.name || userName;

    // 4. Send the automated WhatsApp message confirmation
    const dateFormatted = appointmentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const template = userRecord?.confirmationTemplate || `Olá, *{nome_paciente}*!\n\nConfirmamos seu agendamento na clínica *{nome_clinica}*:\n\n📅 Data: *{data_consulta}*\n⏰ Horário: *{hora_consulta}*\n\nSeu agendamento foi salvo com sucesso!`;

    const msg = parseTemplate(template, {
      nome_paciente: customerName.trim(),
      nome_clinica: clinicName,
      data_consulta: dateFormatted,
      hora_consulta: time,
    });

    let whatsappWarning: string | undefined;

    try {
      // Import the EvolutionService dynamically to avoid loading issues in other server modules
      const { EvolutionService } = await import('@/services/evolution');
      await EvolutionService.sendTextMessage(cleanedPhone, msg);
    } catch (msgError) {
      console.error('[Dashboard Actions] Failed to send manual appointment WhatsApp notification:', msgError);
      whatsappWarning = 'O agendamento foi salvo, mas não foi possível enviar a mensagem de confirmação por WhatsApp (verifique se a conexão do seu WhatsApp está ativa).';
    }

    revalidatePath('/dashboard');
    return { success: true, warning: whatsappWarning };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to create manual appointment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Gets available slots for the logged-in admin user on a specific date
 */
export async function getAdminAvailableSlots(dateStr: string): Promise<string[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    return await getAvailableSlots(dateStr, userId);
  } catch (error) {
    console.error('[Dashboard Actions] Failed to get admin available slots:', error);
    return [];
  }
}

/**
 * Updates internal CRM notes for a specific customer
 */
export async function updateCustomerNotes(
  customerId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    await prisma.customer.update({
      where: {
        id: customerId,
        userId,
      },
      data: {
        notes: notes || null,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to update customer notes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Gets a customer and their full history of appointments
 */
export async function getCustomerHistory(
  customerId: string
): Promise<{ success: boolean; customer?: Customer & { appointments: Appointment[] }; appointments?: Appointment[]; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId,
      },
      include: {
        appointments: {
          orderBy: {
            appointmentDate: 'desc',
          },
        },
      },
    });

    if (!customer) {
      throw new Error('Paciente não encontrado');
    }

    return {
      success: true,
      customer,
      appointments: customer.appointments,
    };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to get customer history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Updates customization templates for WhatsApp messages
 */
export async function updateWhatsAppTemplates(templates: {
  confirmationTemplate: string;
  cancellationTemplate: string;
  reminderTemplate: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        confirmationTemplate: templates.confirmationTemplate || null,
        cancellationTemplate: templates.cancellationTemplate || null,
        reminderTemplate: templates.reminderTemplate || null,
      },
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to update WhatsApp templates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Updates trigger time settings (reminder hours before appointment)
 */
export async function updateReminderSettings(
  reminderHours: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    if (reminderHours < 1 || reminderHours > 168) {
      throw new Error('O tempo de lembrete deve estar entre 1 e 168 horas (7 dias).');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        reminderHours,
      },
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[Dashboard Actions] Failed to update reminder settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

