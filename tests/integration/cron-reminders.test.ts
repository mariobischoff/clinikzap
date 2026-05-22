import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prismaMock } from '../setup/prisma-mock';
import { redisMock } from '../setup/redis-mock';

vi.mock('@/services/evolution', () => ({
  EvolutionService: {
    sendTextMessage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const now = new Date('2026-05-22T10:00:00Z');
const appointmentDate = new Date('2026-05-23T10:00:00Z');

function buildReminderRequest(headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/api/cron/send-reminders', {
    method: 'GET',
    headers: { ...headers },
  });
}

describe('Cron Reminders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await redisMock.flushall();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('deve enviar reminder para appointments dentro da janela de 24h', async () => {
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        id: 'appt-1', customerId: 'cust-1', userId: 'user-1', appointmentDate, status: 'CONFIRMED', token: 'tok-1', reminderSent: false, createdAt: new Date(), updatedAt: new Date(),
        customer: { id: 'cust-1', name: 'Joao Silva', phone: '+5511999999999', userId: 'user-1', notes: null, createdAt: new Date(), updatedAt: new Date() },
        user: { id: 'user-1', name: 'Clinica Teste', email: 'cli@test.com', password: 'hash', workingHours: ['08:00'], weeklyHours: null, duration: 30, confirmationTemplate: null, cancellationTemplate: null, reminderTemplate: null, reminderHours: 24, createdAt: new Date(), updatedAt: new Date() },
      },
    ]);
    prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });

    const { GET } = await import('@/app/api/cron/send-reminders/route');
    const response = await GET(buildReminderRequest());
    const body = await response.json();

    expect(body.message).toContain('sent 1 reminders');
    expect(body.results).toHaveLength(1);

    const { EvolutionService } = await import('@/services/evolution');
    expect(EvolutionService.sendTextMessage).toHaveBeenCalledWith(
      '+5511999999999',
      expect.stringContaining('lembrete')
    );
  });

  it('deve pular appointments fora da janela de trigger', async () => {
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        id: 'appt-2', customerId: 'cust-1', userId: 'user-1', appointmentDate: new Date('2026-05-24T10:00:00Z'), status: 'CONFIRMED', token: 'tok-2', reminderSent: false, createdAt: new Date(), updatedAt: new Date(),
        customer: { id: 'cust-1', name: 'Joao', phone: '+5511999999999', userId: 'user-1', notes: null, createdAt: new Date(), updatedAt: new Date() },
        user: { id: 'user-1', name: 'Clinica', email: 'c@t.com', password: 'hash', workingHours: [], weeklyHours: null, duration: 30, confirmationTemplate: null, cancellationTemplate: null, reminderTemplate: null, reminderHours: 24, createdAt: new Date(), updatedAt: new Date() },
      },
    ]);

    const { GET } = await import('@/app/api/cron/send-reminders/route');
    const response = await GET(buildReminderRequest());
    const body = await response.json();

    expect(body.message).toContain('sent 0 reminders');
  });

  it('deve rejeitar requisicao sem CRON_SECRET quando configurado', async () => {
    vi.stubEnv('CRON_SECRET', 'my-secret');

    const { GET } = await import('@/app/api/cron/send-reminders/route');
    const response = await GET(buildReminderRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it('deve enviar para multiplos appointments no mesmo cron run', async () => {
    const { EvolutionService } = await import('@/services/evolution');

    prismaMock.appointment.findMany.mockResolvedValue([
      {
        id: 'appt-1', customerId: 'cust-1', userId: 'user-1', appointmentDate, status: 'CONFIRMED', token: 'tok-1', reminderSent: false, createdAt: new Date(), updatedAt: new Date(),
        customer: { id: 'cust-1', name: 'Joao', phone: '+5511999999999', userId: 'user-1', notes: null, createdAt: new Date(), updatedAt: new Date() },
        user: { id: 'user-1', name: 'Clinica', email: 'c@t.com', password: 'hash', workingHours: [], weeklyHours: null, duration: 30, confirmationTemplate: null, cancellationTemplate: null, reminderTemplate: null, reminderHours: 24, createdAt: new Date(), updatedAt: new Date() },
      },
      {
        id: 'appt-2', customerId: 'cust-2', userId: 'user-1', appointmentDate, status: 'CONFIRMED', token: 'tok-2', reminderSent: false, createdAt: new Date(), updatedAt: new Date(),
        customer: { id: 'cust-2', name: 'Maria', phone: '+5511988888888', userId: 'user-1', notes: null, createdAt: new Date(), updatedAt: new Date() },
        user: { id: 'user-1', name: 'Clinica', email: 'c@t.com', password: 'hash', workingHours: [], weeklyHours: null, duration: 30, confirmationTemplate: null, cancellationTemplate: null, reminderTemplate: null, reminderHours: 24, createdAt: new Date(), updatedAt: new Date() },
      },
    ]);
    prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });

    const { GET } = await import('@/app/api/cron/send-reminders/route');
    const response = await GET(buildReminderRequest());
    const body = await response.json();

    expect(body.message).toContain('sent 2 reminders');
    expect(body.results).toHaveLength(2);
    expect(EvolutionService.sendTextMessage).toHaveBeenCalledTimes(2);
    expect(prismaMock.appointment.updateMany).toHaveBeenCalledTimes(2);
  });
});
