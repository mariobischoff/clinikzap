interface BuildWebhookPayloadOptions {
  phone?: string;
  fromMe?: boolean;
  pushName?: string;
  message?: string;
  event?: string;
  isGroup?: boolean;
}

export function buildWebhookPayload(options: BuildWebhookPayloadOptions = {}) {
  const phone = options.phone || '5511999999999';
  const suffix = options.isGroup ? '@g.us' : '@s.whatsapp.net';

  return {
    event: options.event || 'messages.upsert',
    instanceId: 'test-instance',
    data: {
      key: {
        remoteJid: `${phone}${suffix}`,
        fromMe: options.fromMe ?? false,
        id: `TEST_${Date.now()}`,
      },
      pushName: options.pushName || 'Paciente Teste',
      messageType: 'conversation',
      message: {
        conversation: options.message || 'Olá, gostaria de agendar.',
      },
    },
  };
}
