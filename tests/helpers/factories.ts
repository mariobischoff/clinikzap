import { faker } from '@faker-js/faker';

export function buildUser(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    email: faker.internet.email(),
    password: 'hashed_password',
    workingHours: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
    weeklyHours: null,
    duration: 30,
    confirmationTemplate: null,
    cancellationTemplate: null,
    reminderTemplate: null,
    reminderHours: 24,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildCustomer(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number({ style: 'international' }),
    userId: faker.string.uuid(),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildAppointment(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: 'PENDING' as const,
    token: faker.string.uuid(),
    appointmentDate: faker.date.future(),
    reminderSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
