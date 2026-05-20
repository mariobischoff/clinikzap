'use server';

import { EvolutionService } from '@/services/evolution';
import { revalidatePath } from 'next/cache';

export async function disconnectWhatsapp() {
  try {
    await EvolutionService.logoutInstance();
    revalidatePath('/dashboard/evolution');
    return { success: true };
  } catch (error) {
    console.error('[Actions] Failed to disconnect WhatsApp:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
