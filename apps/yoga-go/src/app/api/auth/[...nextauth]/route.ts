/**
 * NextAuth API Route Handler
 * This handles all auth-related API routes (/api/auth/*)
 */
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
