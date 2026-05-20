'use server';

import { EvolutionService } from '@/services/evolution';
import { revalidatePath } from 'next/cache';

export async function disconnectWhatsapp() {
  try {
    await EvolutionService.logoutInstance();
    revalidatePath('/dashboard/evolution');
  } catch (error) {
    console.error('[Actions] Failed to disconnect WhatsApp:', error);
  }
}
