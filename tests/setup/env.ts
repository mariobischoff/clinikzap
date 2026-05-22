import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

process.env.NODE_ENV = 'test';
process.env.EVOLUTION_SEND_IN_DEV = 'false';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clinikzap_test?schema=public';
