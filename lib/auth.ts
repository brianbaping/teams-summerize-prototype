/**
 * Authentication utilities for API routes
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AuthenticationError } from './errors';

/**
 * Get the current session or throw if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    throw new AuthenticationError('Authentication required');
  }

  return session;
}
