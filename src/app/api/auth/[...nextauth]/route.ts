import { handlers } from '@/auth';

export const { GET, POST } = handlers;
export const runtime = 'nodejs'; // Nodejs runtime is required as Prisma Adapter doesn't support Edge runtime yet
