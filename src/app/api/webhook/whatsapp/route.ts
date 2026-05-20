import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/services/evolution';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Webhook WhatsApp] Received event:', JSON.stringify(body, null, 2));

    // Inspect if the structure matches Evolution API v2 MESSAGES_UPSERT
    const data = body.data;

    if (!data || !data.key) {
      return NextResponse.json({ message: 'Invalid payload structure' }, { status: 200 });
    }

    const remoteJid = data.key.remoteJid || '';
    const fromMe = data.key.fromMe;

    // Ignore messages sent by the bot/instance itself and group messages
    if (fromMe || remoteJid.endsWith('@g.us')) {
      console.log('[Webhook WhatsApp] Ignoring outgoing or group message.');
      return NextResponse.json({ message: 'Ignored' }, { status: 200 });
    }

    // Extract phone number from JID (e.g. "5511999999999@s.whatsapp.net" -> "5511999999999")
    const phone = remoteJid.split('@')[0];
    if (!phone) {
      return NextResponse.json({ message: 'Invalid phone number format' }, { status: 200 });
    }

    // Get the first clinic (User) registered in the system
    // In a multi-tenant application, we would map the Evolution instance to a specific User/Clinic.
    const clinic = await prisma.user.findFirst();
    if (!clinic) {
      console.warn('[Webhook WhatsApp] No clinic User found in the database. Cannot process scheduling.');
      return NextResponse.json({ error: 'No clinic registered yet' }, { status: 200 });
    }

    const customerName = data.pushName || 'Paciente';

    // Find or create Customer associated with this clinic
    let customer = await prisma.customer.findUnique({
      where: {
        phone_userId: {
          phone: phone,
          userId: clinic.id,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: phone,
          userId: clinic.id,
        },
      });
      console.log(`[Webhook WhatsApp] Created new Customer: ${customerName} (${phone})`);
    }

    // Create a PENDING appointment to generate the unique token for public scheduling
    // Defaulting appointmentDate to 7 days from now (placeholder), which the patient will modify
    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        userId: clinic.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const scheduleLink = `${appUrl}/schedule/${appointment.token}`;

    const welcomeMessage = `Olá, ${customer.name}! Para realizar o agendamento da sua consulta na clínica *${clinic.name}*, escolha o seu horário clicando no link abaixo:\n\n${scheduleLink}`;

    await EvolutionService.sendTextMessage(phone, welcomeMessage);
    console.log(`[Webhook WhatsApp] Scheduling link sent successfully to ${phone}`);

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
