'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MessageSquare, AlertCircle, CheckCircle2, QrCode, LogOut } from 'lucide-react';
import { disconnectWhatsapp, getWhatsappStatus } from './actions';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/confirmation-modal';
import { Button } from '@/components/ui/button';

interface EvolutionConnectionPanelProps {
  initialStatus: string;
  initialQrCodeBase64: string;
  initialError: string;
}

export default function EvolutionConnectionPanel({
  initialStatus,
  initialQrCodeBase64,
  initialError,
}: EvolutionConnectionPanelProps) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [qrCodeBase64, setQrCodeBase64] = useState<string>(initialQrCodeBase64);
  const [errorMsg, setErrorMsg] = useState<string>(initialError);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(false);

  const isConnected = status === 'open';

  // Function to poll the status from the server
  const checkStatus = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const res = await getWhatsappStatus();
    if (res.success) {
      setStatus(res.status || 'close');
      setQrCodeBase64(res.qrCodeBase64 || '');
      setErrorMsg('');
    } else {
      setErrorMsg(res.error || 'Erro de conexão.');
    }
    if (showLoading) setLoading(false);
  };

  // Poll status every 5 seconds if not connected
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const handleDisconnect = () => {
    setShowDisconnectModal(true);
  };

  const executeDisconnect = () => {
    startTransition(async () => {
      const res = await disconnectWhatsapp();
      if (res.success) {
        toast.success('WhatsApp desconectado com sucesso!');
        setStatus('close');
        setQrCodeBase64('');
        checkStatus();
      } else {
        toast.error(res.error || 'Erro ao desconectar.');
      }
    });
  };

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

        <Button
          variant="outline"
          type="button"
          disabled={loading || isPending}
          onClick={() => checkStatus(true)}
          className="self-start px-4 py-2.5 bg-slate-900/40 border-slate-800 hover:bg-slate-850 text-slate-300 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer h-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Atualizando...' : 'Atualizar Status'}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {errorMsg ? (
          <motion.div
            key="error-box"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-start gap-4"
          >
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-200">Falha na Conexão</h3>
              <p className="text-sm mt-1">{errorMsg}</p>
              <Button
                variant="outline"
                type="button"
                onClick={() => checkStatus(true)}
                className="mt-3 text-xs bg-red-500/10 hover:bg-red-500/20 text-slate-200 px-3 py-1.5 rounded-xl border border-red-500/30 font-semibold cursor-pointer transition-all h-auto"
              >
                Tentar Novamente
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={isConnected ? 'connected-view' : 'disconnected-view'}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Status Panel */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                  isConnected 
                    ? 'bg-teal-500/10 border-teal-500/25 shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
                    : 'bg-amber-500/10 border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
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
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-400' : 'bg-amber-400'}`} />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-6 space-y-4 text-sm text-slate-300">
                <h3 className="font-bold text-slate-200">Como funciona o pareamento?</h3>
                <ol className="list-decimal list-inside space-y-3 text-slate-450">
                  <li>Abra o WhatsApp no celular que a clínica utilizará para enviar as mensagens.</li>
                  <li>Toque em <strong className="text-slate-300">Configurações / Aparelhos Conectados</strong>.</li>
                  <li>Clique em <strong className="text-slate-300">Conectar um aparelho</strong>.</li>
                  <li>Aponte a câmera do seu celular para o QR Code gerado ao lado.</li>
                </ol>
              </div>
            </div>

            {/* QR Code / Success Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg min-h-[300px]">
              {isConnected ? (
                <div className="space-y-6 w-full">
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(20,184,166,0.1)]">
                      <CheckCircle2 className="w-12 h-12 text-teal-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Instância Pareada</h3>
                    <p className="text-slate-400 text-xs max-w-xs mx-auto">
                      O ClinikZap está pronto para enviar mensagens automáticas utilizando este celular.
                    </p>
                  </div>
                  
                  <div className="w-full pt-2">
                    <Button
                      variant="destructive"
                      type="button"
                      disabled={isPending}
                      onClick={handleDisconnect}
                      className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 h-auto"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {isPending ? 'Desconectando...' : 'Desconectar WhatsApp'}
                    </Button>
                  </div>
                </div>
              ) : qrCodeBase64 ? (
                <div className="space-y-6 w-full">
                  <div className="bg-white p-3.5 rounded-2xl inline-block shadow-2xl mx-auto border border-slate-200">
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
                      O código expira a cada poucos minutos. O status mudará automaticamente quando parear.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 w-full px-4">
                  {/* Skeletons loader */}
                  <div className="w-48 h-48 bg-slate-800/40 rounded-2xl animate-pulse mx-auto flex items-center justify-center border border-slate-800">
                    <QrCode className="w-16 h-16 text-slate-700 animate-pulse" />
                  </div>
                  <div className="space-y-2 max-w-[200px] mx-auto mt-4">
                    <div className="h-4 bg-slate-800/50 rounded-md animate-pulse w-3/4 mx-auto" />
                    <div className="h-3 bg-slate-800/40 rounded-md animate-pulse w-full mx-auto" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showDisconnectModal}
        title="Desconectar WhatsApp"
        message="Deseja realmente desconectar o WhatsApp da clínica? O envio automático de mensagens e lembretes será interrompido."
        confirmText="Confirmar"
        cancelText="Voltar"
        isDanger={true}
        onConfirm={() => {
          setShowDisconnectModal(false);
          executeDisconnect();
        }}
        onCancel={() => setShowDisconnectModal(false)}
      />
    </div>
  );
}
