import { vi } from 'vitest';

const models = ['user', 'customer', 'appointment', 'availabilityException', 'account', 'session', 'verificationToken'];

function createPrismaMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prisma client mock needs dynamic model access
  const mock: Record<string, any> = {
    $transaction: vi.fn((arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return arg(mock);
      }
      return Promise.resolve(arg);
    }),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  for (const model of models) {
    mock[model] = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    };
  }
  return mock;
}

export const prismaMock = createPrismaMock();

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));
