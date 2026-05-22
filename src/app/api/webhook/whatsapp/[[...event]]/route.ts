import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { EvolutionService } from '@/services/evolution';
import { normalizePhone } from '@/utils/phone';

// Strict TypeScript interfaces for the Evolution API webhook payload
interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

interface EvolutionMessageData {
  key: EvolutionMessageKey;
  pushName?: string;
  messageType?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
  };
}

interface EvolutionWebhookBody {
  event: string;
  instanceId?: string;
  instance?: string;
  data: EvolutionMessageData;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<EvolutionWebhookBody>;
    console.log('[Webhook WhatsApp] Received event:', JSON.stringify(body, null, 2));

    // Inspect if the structure matches Evolution API v2 MESSAGES_UPSERT
    const data = body.data;

    if (!data || !data.key) {
      console.warn('[Webhook WhatsApp] Received invalid or empty payload structure.');
      return NextResponse.json({ message: 'Invalid payload structure' }, { status: 200 });
    }

    const remoteJid = data.key.remoteJid || '';

    // 1. Ignore Non-Private Chats (groups, broadcasts, channels, etc.)
    const isGroup = remoteJid.includes('@g.us');
    const isBroadcast = remoteJid.includes('@newsletter') || remoteJid.includes('@broadcast');
    const isPrivate = remoteJid.endsWith('@s.whatsapp.net');

    if (isGroup || isBroadcast || !isPrivate) {
      console.log(`[Webhook WhatsApp] Ignoring non-private chat message from remoteJid: ${remoteJid}`);
      return NextResponse.json({ message: 'Ignored non-private chat' }, { status: 200 });
    }

    // Extract phone number from JID (e.g. "5511999999999@s.whatsapp.net" -> "5511999999999")
    const phone = normalizePhone(remoteJid.split('@')[0]);
    if (!phone) {
      console.error(`[Webhook WhatsApp] Could not parse phone number from remoteJid: ${remoteJid}`);
      return NextResponse.json({ message: 'Invalid phone number format' }, { status: 200 });
    }

    const fromMe = data.key.fromMe;

    // 2. Human-Takeover Detection (fromMe)
    if (fromMe) {
      try {
        await redis.set(`silence:chat:${phone}`, 'true', 'EX', 3600);
      } catch {
        console.warn('[Webhook WhatsApp] Redis unavailable, skipping silence lock');
      }
      return NextResponse.json({ message: 'Human-takeover active lock applied' }, { status: 200 });
    }

    // 3. Check Silence State
    let isSilenced = false;
    try {
      isSilenced = !!(await redis.exists(`silence:chat:${phone}`));
    } catch {
      console.warn('[Webhook WhatsApp] Redis unavailable, skipping silence check');
    }
    if (isSilenced) {
      console.log(`[Webhook WhatsApp] Bot response bypassed. Chat with ${phone} is currently silenced due to human takeover.`);
      return NextResponse.json({ message: 'Chat is silenced (human-takeover bypass)' }, { status: 200 });
    }

    // 4. Anti-Flood / Debounce (Rate Limiting) — atomic lock via SET NX
    let lockAcquired = false;
    try {
      lockAcquired = !!(await redis.set(`lock:welcome:${phone}`, 'true', 'EX', 900, 'NX'));
    } catch {
      console.warn('[Webhook WhatsApp] Redis unavailable, skipping anti-flood lock');
    }
    if (!lockAcquired) {
      console.log(`[Webhook WhatsApp] Welcome lock exists for ${phone} (anti-flood check). Ignoring incoming message.`);
      return NextResponse.json({ message: 'Welcome lock active (anti-flood)' }, { status: 200 });
    }
    console.log(`[Webhook WhatsApp] Lock acquired: lock:welcome:${phone} with 15 minutes TTL.`);

    // 6. Multi-tenant: find clinic by Evolution instance
    const instanceNameFromApi = body.instanceId
      ? await EvolutionService.getInstanceNameById(body.instanceId)
      : body.instance || null;

    const clinic = instanceNameFromApi
      ? await prisma.user.findUnique({ where: { evolutionInstanceName: instanceNameFromApi } })
      : null;

    // Fall back to the first clinic (backward compatible with single-tenant setups)
    const resolvedClinic = clinic ?? await prisma.user.findFirst();

    if (!resolvedClinic) {
      console.warn('[Webhook WhatsApp] No clinic User found in the database. Cannot process scheduling.');
      return NextResponse.json({ error: 'No clinic registered yet' }, { status: 200 });
    }

    if (!clinic && instanceNameFromApi) {
      console.warn(`[Webhook WhatsApp] Instance "${instanceNameFromApi}" not mapped to any clinic.`);
    }

    const customerName = data.pushName || 'Paciente';

    // Find or create Customer associated with this clinic
    let customer = await prisma.customer.findUnique({
      where: {
        phone_userId: {
          phone: phone,
          userId: resolvedClinic.id,
        },
      },
    });

    // Check if the customer already has an active appointment ('PENDING' or 'CONFIRMED')
    const activeAppointment = customer
      ? await prisma.appointment.findFirst({
          where: {
            customerId: customer.id,
            userId: resolvedClinic.id,
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        })
      : null;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (activeAppointment) {
      console.log(`[Webhook WhatsApp] Customer ${customerName} (${phone}) has an active appointment (${activeAppointment.status}). Sending contextual message.`);
      
      let contextualMessage = '';
      if (activeAppointment.status === 'CONFIRMED') {
        const appointmentDateFormatted = new Date(activeAppointment.appointmentDate).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        contextualMessage = `Olá, ${customer?.name || customerName}! Identificamos que você já possui uma consulta confirmada para o dia *${appointmentDateFormatted}*. Caso precise remarcar ou tirar dúvidas, por favor fale diretamente com o nosso atendente por aqui.`;
      } else {
        // PENDING
        const scheduleLink = `${appUrl}/schedule/${activeAppointment.token}`;
        contextualMessage = `Olá, ${customer?.name || customerName}! Você já tem um agendamento em andamento. Para escolher o seu horário ou alterar seus dados, clique no link abaixo:\n\n${scheduleLink}`;
      }

      await EvolutionService.sendTextMessage(phone, contextualMessage);
      console.log(`[Webhook WhatsApp] Contextual message sent successfully to ${phone}`);
    } else {
      console.log(`[Webhook WhatsApp] Customer ${customerName} (${phone}) has no active appointments. Triggering WhatsApp onboarding welcome message.`);

      const { appointment, customer: finalCustomer } = await prisma.$transaction(async (tx) => {
        const c = customer ?? await tx.customer.create({
          data: { name: customerName, phone: phone, userId: resolvedClinic.id },
        });
        const a = await tx.appointment.create({
          data: {
            customerId: c.id,
            userId: resolvedClinic.id,
            appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
          },
        });
        return { appointment: a, customer: c };
      });

      if (!customer) {
        console.log(`[Webhook WhatsApp] Created new Customer record: ${finalCustomer.name} (${phone})`);
        customer = finalCustomer;
      }

      const scheduleLink = `${appUrl}/schedule/${appointment.token}`;
      const welcomeMessage = `Olá, ${customer.name}! Para realizar o agendamento da sua consulta na clínica *${resolvedClinic.name}*, escolha o seu horário clicando no link abaixo:\n\n${scheduleLink}`;

      await EvolutionService.sendTextMessage(phone, welcomeMessage);
      console.log(`[Webhook WhatsApp] Onboarding scheduling link sent successfully to ${phone}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Webhook WhatsApp] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
