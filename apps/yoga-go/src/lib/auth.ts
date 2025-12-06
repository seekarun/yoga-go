import { auth } from '@/auth';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import type { User as UserType, UserRole } from '@/types';
import * as userRepository from './repositories/userRepository';
import * as courseRepository from './repositories/courseRepository';

interface DecodedToken {
  cognitoSub?: string;
  sub?: string;
  email?: string;
  name?: string;
}

/**
 * Get the current session from NextAuth
 * Note: This uses auth() which may not work reliably on Vercel.
 * For API routes, prefer getSessionFromRequest() or getSessionFromCookies()
 */
export async function getSession() {
  try {
    const session = await auth();
    return session;
  } catch (error) {
    console.error('[DBG][auth] Error getting session:', error);
    return null;
  }
}

/**
 * Get session from request cookies - works reliably on Vercel
 * Use this in API routes instead of getSession()
 */
export async function getSessionFromRequest(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('authjs.session-token')?.value;

    if (!sessionToken) {
      console.log('[DBG][auth] No session token cookie found');
      return null;
    }

    const decoded = (await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    })) as DecodedToken | null;

    if (!decoded) {
      console.log('[DBG][auth] Failed to decode token');
      return null;
    }

    const cognitoSub = decoded.cognitoSub || decoded.sub;

    if (!cognitoSub) {
      console.log('[DBG][auth] No cognitoSub in token');
      return null;
    }

    return {
      user: {
        cognitoSub,
        email: decoded.email,
        name: decoded.name,
      },
    };
  } catch (error) {
    console.error('[DBG][auth] Error getting session from request:', error);
    return null;
  }
}

/**
 * Get session from Next.js cookies() - works in server components and API routes
 * Use this when you don't have access to the request object
 */
export async function getSessionFromCookies() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('authjs.session-token')?.value;

    if (!sessionToken) {
      console.log('[DBG][auth] No session token cookie found');
      return null;
    }

    const decoded = (await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    })) as DecodedToken | null;

    if (!decoded) {
      console.log('[DBG][auth] Failed to decode token');
      return null;
    }

    const cognitoSub = decoded.cognitoSub || decoded.sub;

    if (!cognitoSub) {
      console.log('[DBG][auth] No cognitoSub in token');
      return null;
    }

    return {
      user: {
        cognitoSub,
        email: decoded.email,
        name: decoded.name,
      },
    };
  } catch (error) {
    console.error('[DBG][auth] Error getting session from cookies:', error);
    return null;
  }
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: UserType | null | undefined, role: UserRole): boolean {
  if (!user || !user.role) return false;
  // Handle both array and legacy string formats (fallback)
  if (Array.isArray(user.role)) {
    return user.role.includes(role);
  }
  // Legacy fallback for string role
  return user.role === role;
}

/**
 * Normalize role to array format
 * Handles legacy string format and defaults to ['learner']
 */
export function normalizeRoles(role: UserRole[] | UserRole | undefined): UserRole[] {
  if (!role) return ['learner'];
  if (Array.isArray(role)) return role;
  // Legacy string format
  return [role];
}

/**
 * Get or create user in DynamoDB from Cognito profile
 * This is called after Cognito authentication to sync user data
 *
 * @param roles - Optional roles array to assign to new users. Defaults to ['learner']
 */
export async function getOrCreateUser(
  cognitoUser: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  },
  roles?: UserRole[]
): Promise<UserType> {
  console.log(
    '[DBG][auth] Getting or creating user for cognitoSub:',
    cognitoUser.sub,
    'roles:',
    roles
  );
  console.log('[DBG][auth] Cognito user data:', {
    sub: cognitoUser.sub,
    email: cognitoUser.email,
    name: cognitoUser.name,
    nameProvided: !!cognitoUser.name,
    picture: cognitoUser.picture,
  });

  // Delegate to userRepository
  return userRepository.getOrCreateUser(cognitoUser, roles);
}

/**
 * Get user by ID from DynamoDB
 * Note: In DynamoDB, the user ID is the cognitoSub
 */
export async function getUserById(userId: string): Promise<UserType | null> {
  console.log('[DBG][auth] Getting user by ID:', userId);
  return userRepository.getUserById(userId);
}

/**
 * Get user by Cognito Sub from DynamoDB
 * Note: In DynamoDB, cognitoSub is the same as user ID
 */
export async function getUserByCognitoSub(cognitoSub: string): Promise<UserType | null> {
  console.log('[DBG][auth] Getting user by cognitoSub:', cognitoSub);
  return userRepository.getUserByCognitoSub(cognitoSub);
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes to protect them
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user || !session.user.cognitoSub) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Require expert authentication - throws error if not authenticated as expert
 * Use this in API routes to protect expert-only routes
 */
export async function requireExpertAuth(): Promise<{
  session: Awaited<ReturnType<typeof getSession>>;
  user: UserType;
}> {
  const session = await getSession();

  if (!session || !session.user || !session.user.cognitoSub) {
    throw new Error('Unauthorized');
  }

  const cognitoSub = session.user.cognitoSub;
  if (!cognitoSub) {
    throw new Error('Invalid session - missing cognitoSub');
  }

  const user = await getUserByCognitoSub(cognitoSub);

  if (!user) {
    throw new Error('User not found');
  }

  if (!hasRole(user, 'expert')) {
    throw new Error('Forbidden - Expert access required');
  }

  return { session, user };
}

/**
 * Require expert ownership - validates that the authenticated expert owns the requested profile
 * Returns the user if valid, throws error if not
 *
 * @param expertId The expert profile ID being accessed
 * @returns The authenticated user
 */
export async function requireExpertOwnership(expertId: string): Promise<UserType> {
  console.log('[DBG][auth] Checking expert ownership for expertId:', expertId);

  const session = await getSession();

  if (!session || !session.user || !session.user.cognitoSub) {
    throw new Error('Unauthorized');
  }

  const cognitoSub = session.user.cognitoSub;
  if (!cognitoSub) {
    throw new Error('Invalid session - missing cognitoSub');
  }

  const user = await getUserByCognitoSub(cognitoSub);

  if (!user) {
    throw new Error('User not found');
  }

  if (!hasRole(user, 'expert')) {
    throw new Error('Forbidden - Expert access required');
  }

  if (user.expertProfile !== expertId) {
    console.log(
      `[DBG][auth] Ownership check failed: user.expertProfile=${user.expertProfile}, requested expertId=${expertId}`
    );
    throw new Error('Forbidden - You do not own this expert profile');
  }

  console.log('[DBG][auth] Ownership check passed');
  return user;
}

/**
 * Require course ownership - validates that the authenticated expert owns the requested course
 * Returns the user if valid, throws error if not
 *
 * @param courseId The course ID being accessed
 * @returns The authenticated user
 */
export async function requireCourseOwnership(courseId: string): Promise<UserType> {
  console.log('[DBG][auth] Checking course ownership for courseId:', courseId);

  const session = await getSession();

  if (!session || !session.user || !session.user.cognitoSub) {
    throw new Error('Unauthorized');
  }

  const cognitoSub = session.user.cognitoSub;
  if (!cognitoSub) {
    throw new Error('Invalid session - missing cognitoSub');
  }

  const user = await getUserByCognitoSub(cognitoSub);

  if (!user) {
    throw new Error('User not found');
  }

  if (!hasRole(user, 'expert')) {
    throw new Error('Forbidden - Expert access required');
  }

  if (!user.expertProfile) {
    throw new Error('Expert profile not found');
  }

  // Check if course exists and belongs to this expert
  const course = await courseRepository.getCourseById(courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  if (course.instructor?.id !== user.expertProfile) {
    console.log(
      `[DBG][auth] Course ownership check failed: course.instructor.id=${course.instructor.id}, user.expertProfile=${user.expertProfile}`
    );
    throw new Error('Forbidden - You do not own this course');
  }

  console.log('[DBG][auth] Course ownership check passed');
  return user;
}

/**
 * Require admin authentication - throws error if not authenticated as admin
 * Use this in API routes to protect admin-only routes
 */
export async function requireAdminAuth(): Promise<{
  session: Awaited<ReturnType<typeof getSession>>;
  user: UserType;
}> {
  const session = await getSession();

  if (!session || !session.user || !session.user.cognitoSub) {
    throw new Error('Unauthorized');
  }

  const cognitoSub = session.user.cognitoSub;
  if (!cognitoSub) {
    throw new Error('Invalid session - missing cognitoSub');
  }

  const user = await getUserByCognitoSub(cognitoSub);

  if (!user) {
    throw new Error('User not found');
  }

  if (!hasRole(user, 'admin')) {
    throw new Error('Forbidden - Admin access required');
  }

  return { session, user };
}

/**
 * @deprecated Use getUserByCognitoSub instead
 * Backward compatible alias for getUserByCognitoSub
 */
export const getUserByAuth0Id = getUserByCognitoSub;
