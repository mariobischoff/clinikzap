import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prismaMock } from '../setup/prisma-mock';
import { redisMock } from '../setup/redis-mock';

vi.mock('@/services/evolution', () => ({
  EvolutionService: {
    sendTextMessage: vi.fn().mockResolvedValue({ success: true }),
    getInstanceNameById: vi.fn().mockResolvedValue(null),
  },
}));

const mockClinic = {
  id: 'clinic-1',
  name: 'Clinica Teste',
  email: 'test@test.com',
  password: 'hash',
  workingHours: ['08:00', '09:00', '10:00'],
  weeklyHours: null,
  duration: 30,
  confirmationTemplate: null,
  cancellationTemplate: null,
  reminderTemplate: null,
  reminderHours: 24,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createRequest(
  overrides: Record<string, unknown> = {}
): NextRequest {
  const body = {
    event: 'messages.upsert',
    instanceId: 'test-instance',
    data: {
      key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'MSG_001' },
      pushName: 'Maria Paciente',
      messageType: 'conversation',
      message: { conversation: 'Quero agendar!' },
    },
    ...overrides,
  };

  return new NextRequest('http://localhost:3000/api/webhook/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Webhook Handler', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await redisMock.flushall();
  });

  it('deve criar customer + appointment PENDING para novo paciente', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockClinic);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({
      id: 'cust-1', name: 'Maria Paciente', phone: '5511999999999', userId: 'clinic-1', notes: null, createdAt: new Date(), updatedAt: new Date(),
    });
    prismaMock.appointment.create.mockResolvedValue({
      id: 'appt-1', customerId: 'cust-1', userId: 'clinic-1', appointmentDate: new Date(), status: 'PENDING', token: 'token-abc', reminderSent: false, createdAt: new Date(), updatedAt: new Date(),
    });

    const { POST } = await import('@/app/api/webhook/whatsapp/[[...event]]/route');
    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Webhook processed successfully');
    expect(prismaMock.customer.create).toHaveBeenCalled();
    expect(prismaMock.appointment.create).toHaveBeenCalled();

    const lockExists = await redisMock.exists('lock:welcome:5511999999999');
    expect(lockExists).toBe(1);
  });

  it('deve rejeitar mensagens de grupo', async () => {
    const req = createRequest({
      data: { key: { remoteJid: '5511999999999-123456@g.us', fromMe: false, id: 'MSG_GROUP' }, pushName: 'Alguem', messageType: 'conversation', message: { conversation: 'Ola' } },
    });

    const { POST } = await import('@/app/api/webhook/whatsapp/[[...event]]/route');
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Ignored non-private chat');
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
  });

  it('deve retornar 200 sem clinica cadastrada', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const { POST } = await import('@/app/api/webhook/whatsapp/[[...event]]/route');
    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBe('No clinic registered yet');
  });

  it('deve enviar mensagem contextual se paciente ja tem CONFIRMED', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockClinic);
    prismaMock.customer.findUnique.mockResolvedValue({
      id: 'cust-1', name: 'Maria', phone: '5511999999999', userId: 'clinic-1', notes: null, createdAt: new Date(), updatedAt: new Date(),
    });
    prismaMock.appointment.findFirst.mockResolvedValue({
      id: 'appt-1', customerId: 'cust-1', userId: 'clinic-1', appointmentDate: new Date(), status: 'CONFIRMED', token: 'tok-1', reminderSent: false, createdAt: new Date(), updatedAt: new Date(),
    });

    const { POST } = await import('@/app/api/webhook/whatsapp/[[...event]]/route');
    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Webhook processed successfully');
    const { EvolutionService } = await import('@/services/evolution');
    expect(EvolutionService.sendTextMessage).toHaveBeenCalledWith(
      '5511999999999',
      expect.stringContaining('consulta confirmada')
    );
  });

  it('deve ativar human-takeover quando mensagem sai da clinica', async () => {
    const req = createRequest({
      data: { key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'MSG_OUT' }, pushName: 'Secretaria', messageType: 'conversation', message: { conversation: 'Ok, confirmado!' } },
    });

    const { POST } = await import('@/app/api/webhook/whatsapp/[[...event]]/route');
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Human-takeover active lock applied');

    const silenceKey = await redisMock.exists('silence:chat:5511999999999');
    expect(silenceKey).toBe(1);
  });

  it('deve ignorar mensagem se chat estiver silenciado (human-takeover)', async () => {
    await redisMock.set('silence:chat:5511999999999', 'true', 'EX', 3600);

    const { POST } = await import('@/app/api/webhook/whatsapp/[[...event]]/route');
    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Chat is silenced (human-takeover bypass)');
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });
});
