import { EvolutionService } from '@/services/evolution';
import EvolutionConnectionPanel from './evolution-connection-panel';

export const dynamic = 'force-dynamic';

export default async function EvolutionPage() {
  let status = 'close';
  let qrCodeBase64 = '';
  let errorMsg = '';

  try {
    // Ensure instance is initialized and webhook registered
    await EvolutionService.initInstance();

    // Fetch the current connection state of the default instance
    const connection = await EvolutionService.getConnectionState();
    status = connection?.instance?.state || 'close';

    // If connection state is not 'open', fetch the connection QR Code
    if (status !== 'open') {
      const qr = await EvolutionService.getConnectQr();
      qrCodeBase64 = qr?.base64 || '';
    }
  } catch (err: unknown) {
    console.error('[EvolutionPage] Error loading status:', err);
    errorMsg = 'Erro de comunicação com a Evolution API. Certifique-se de que a API no Docker está iniciada e configurada.';
  }

  return (
    <EvolutionConnectionPanel
      initialStatus={status}
      initialQrCodeBase64={qrCodeBase64}
      initialError={errorMsg}
    />
  );
}
