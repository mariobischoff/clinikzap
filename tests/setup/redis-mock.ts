import { vi } from 'vitest';
import RedisMock from 'ioredis-mock';

const redisMock = new RedisMock();

vi.mock('@/lib/redis', () => ({
  default: redisMock,
}));

export { redisMock };
