import { EvolutionService } from '@/services/evolution';
import { RefreshCw, MessageSquare, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';
import Link from 'next/link';
import { disconnectWhatsapp } from './actions';

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

  const isConnected = status === 'open';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-teal-400" />
            Conexão WhatsApp
          </h1>
          <p className="text-slate-400 mt-1">
            Pareie o WhatsApp da sua clínica para automatizar o envio de links de agendamento e lembretes
          </p>
        </div>

        <Link
          href="/dashboard/evolution"
          className="self-start px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-semibold text-slate-300 flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar Status
        </Link>
      </div>

      {errorMsg ? (
        <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-200">Falha na Conexão</h3>
            <p className="text-sm mt-1">{errorMsg}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Panel */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isConnected ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                {isConnected ? (
                  <CheckCircle2 className="w-6 h-6 text-teal-400" />
                ) : (
                  <QrCode className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Status do Dispositivo</span>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-xl font-bold text-slate-100">
                    {isConnected ? 'Conectado' : 'Aguardando Pareamento'}
                  </h2>
                  <span className={`w-2 h-2 rounded-full animate-ping ${isConnected ? 'bg-teal-400' : 'bg-amber-400'}`} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-6 space-y-4 text-sm text-slate-300">
              <h3 className="font-bold text-slate-200">Como funciona o pareamento?</h3>
              <ol className="list-decimal list-inside space-y-3 text-slate-400">
                <li>Abra o WhatsApp no celular que a clínica utilizará para enviar as mensagens.</li>
                <li>Toque em <strong className="text-slate-300">Configurações / Aparelhos Conectados</strong>.</li>
                <li>Clique em <strong className="text-slate-300">Conectar um aparelho</strong>.</li>
                <li>Aponte a câmera do seu celular para o QR Code gerado ao lado.</li>
              </ol>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg min-h-[300px]">
            {isConnected ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-teal-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Instância Pareada</h3>
                  <p className="text-slate-400 text-xs max-w-xs mx-auto">
                    O ClinikZap já está pronto para processar mensagens automáticas neste celular.
                  </p>
                </div>
                
                <form action={disconnectWhatsapp} className="w-full pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-2xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Desconectar WhatsApp
                  </button>
                </form>
              </div>
            ) : qrCodeBase64 ? (
              <div className="space-y-6 w-full">
                <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeBase64}
                    alt="Escaneie o QR Code"
                    className="w-48 h-48 select-none"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">Escaneie o QR Code</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    O código expira a cada poucos minutos. Atualize a página se necessário.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 text-xs">Gerando QR Code de pareamento...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
