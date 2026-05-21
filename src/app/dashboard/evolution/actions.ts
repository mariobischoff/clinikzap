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
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getWhatsappStatus(): Promise<{
  success: boolean;
  status?: string;
  qrCodeBase64?: string;
  error?: string;
}> {
  try {
    await EvolutionService.initInstance();
    const connection = await EvolutionService.getConnectionState();
    const status = connection?.instance?.state || 'close';

    let qrCodeBase64 = '';
    if (status !== 'open') {
      const qr = await EvolutionService.getConnectQr();
      qrCodeBase64 = qr?.base64 || '';
    }

    return { success: true, status, qrCodeBase64 };
  } catch (error: unknown) {
    console.error('[Actions] Failed to get WhatsApp status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro de comunicação com a Evolution API.',
    };
  }
}
