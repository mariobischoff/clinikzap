import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Guard all dashboard routes, but keep api, static files, and public scheduling pages accessible
  matcher: ['/dashboard/:path*', '/login'],
};
// Note: matcher here ensures that the auth middleware only intercepts these routes, optimizing performance.
