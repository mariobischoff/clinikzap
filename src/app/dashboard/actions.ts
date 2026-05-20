'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
