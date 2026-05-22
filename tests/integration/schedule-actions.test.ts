import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../setup/prisma-mock';

vi.mock('@/services/evolution', () => ({
  EvolutionService: {
    sendTextMessage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const mockAppointment = {
  id: 'appt-1',
  customerId: 'cust-1',
  userId: 'user-1',
  appointmentDate: new Date('2026-06-10T00:00:00Z'),
  status: 'PENDING' as const,
  token: 'valid-token',
  reminderSent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: {
    id: 'cust-1', name: 'Joao Silva', phone: '+5511999999999', userId: 'user-1', notes: null, createdAt: new Date(), updatedAt: new Date(),
  },
  user: {
    id: 'user-1', name: 'Clinica Teste', email: 'cli@test.com', password: 'hash', workingHours: ['08:00', '09:00'], weeklyHours: null, duration: 30, confirmationTemplate: null, cancellationTemplate: null, reminderTemplate: null, reminderHours: 24, createdAt: new Date(), updatedAt: new Date(), availabilityExceptions: [],
  },
};

const updatedAppointment = {
  ...mockAppointment,
  appointmentDate: new Date('2026-06-15T14:00:00Z'),
  status: 'CONFIRMED' as const,
};

describe('getAppointmentByToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deve retornar dados do appointment com token valido', async () => {
    prismaMock.appointment.findUnique.mockResolvedValue(mockAppointment);

    const { getAppointmentByToken } = await import('@/app/schedule/actions');
    const result = await getAppointmentByToken('valid-token');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('appt-1');
    expect(result!.status).toBe('PENDING');
    expect(result!.customer.name).toBe('Joao Silva');
    expect(prismaMock.appointment.findUnique).toHaveBeenCalledWith({
      where: { token: 'valid-token' },
      include: { customer: true, user: true },
    });
  });

  it('deve retornar null para token invalido', async () => {
    prismaMock.appointment.findUnique.mockResolvedValue(null);

    const { getAppointmentByToken } = await import('@/app/schedule/actions');
    const result = await getAppointmentByToken('invalido');

    expect(result).toBeNull();
  });

  it('deve retornar null para token vazio', async () => {
    const { getAppointmentByToken } = await import('@/app/schedule/actions');
    const result = await getAppointmentByToken('');

    expect(result).toBeNull();
    expect(prismaMock.appointment.findUnique).not.toHaveBeenCalled();
  });

  it('deve retornar null em caso de erro no banco', async () => {
    prismaMock.appointment.findUnique.mockRejectedValue(new Error('DB error'));

    const { getAppointmentByToken } = await import('@/app/schedule/actions');
    const result = await getAppointmentByToken('token');

    expect(result).toBeNull();
  });
});

describe('confirmAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve confirmar appointment PENDING com data/horario/nome', async () => {
    prismaMock.appointment.findUnique.mockResolvedValue(mockAppointment);
    prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.customer.update.mockResolvedValue({ ...mockAppointment.customer, name: 'Joao Atualizado' });

    const { confirmAppointment } = await import('@/app/schedule/actions');
    const result = await confirmAppointment('valid-token', '2026-06-15', '14:00', 'Joao Atualizado');

    expect(result.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('deve retornar erro se appointment nao existe', async () => {
    prismaMock.appointment.findUnique.mockResolvedValue(null);

    const { confirmAppointment } = await import('@/app/schedule/actions');
    const result = await confirmAppointment('invalido', '2026-06-15', '14:00', 'Maria');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Agendamento não encontrado.');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve retornar erro se appointment nao esta PENDING', async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({ ...mockAppointment, status: 'CONFIRMED' });

    const { confirmAppointment } = await import('@/app/schedule/actions');
    const result = await confirmAppointment('token', '2026-06-15', '14:00', 'Maria');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Este agendamento já foi finalizado ou cancelado.');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve confirmar mesmo se Evolution falhar (fallback)', async () => {
    const { EvolutionService } = await import('@/services/evolution');
    (EvolutionService.sendTextMessage as any).mockRejectedValue(new Error('API down'));

    prismaMock.appointment.findUnique.mockResolvedValue(mockAppointment);
    prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.customer.update.mockResolvedValue({ ...mockAppointment.customer, name: 'Joao' });

    const { confirmAppointment } = await import('@/app/schedule/actions');
    const result = await confirmAppointment('token', '2026-06-15', '14:00', 'Joao');

    expect(result.success).toBe(true);
  });
});
