import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import type { User as UserType, UserRole, ForumAccessLevel, ForumContextVisibility } from '@/types';
import * as userRepository from './repositories/userRepository';
import * as courseRepository from './repositories/courseRepository';
import { getAccessTokenVerifier } from './cognito';
import * as enrollment from './enrollment';
import * as webinarRegistrationRepository from './repositories/webinarRegistrationRepository';

interface DecodedToken {
  cognitoSub?: string;
  sub?: string;
  email?: string;
  name?: string;
}

/**
 * Get session from Next.js cookies() - works in server components and API routes
 * This is the primary session retrieval method for Vercel compatibility
 */
export async function getSessionFromCookies() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('authjs.session-token')?.value;

    if (!sessionToken) {
      return null;
    }

    const decoded = (await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    })) as DecodedToken | null;

    if (!decoded) {
      return null;
    }

    const cognitoSub = decoded.cognitoSub || decoded.sub;

    if (!cognitoSub) {
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
 * Get the current session
 * Uses cookie-based session reading for Vercel compatibility
 * (NextAuth's auth() doesn't work reliably on Vercel Edge/Serverless)
 */
export async function getSession() {
  return getSessionFromCookies();
}

/**
 * Get session from request cookies - works reliably on Vercel
 * Use this when you have access to the NextRequest object
 */
export async function getSessionFromRequest(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('authjs.session-token')?.value;

    if (!sessionToken) {
      return null;
    }

    const decoded = (await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    })) as DecodedToken | null;

    if (!decoded) {
      return null;
    }

    const cognitoSub = decoded.cognitoSub || decoded.sub;

    if (!cognitoSub) {
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
 * @param signupSource - Where user first signed up: 'main' (main domain) or expertId (subdomain)
 * @param signupExperts - Optional array of expert IDs where user signed up (from subdomains)
 */
export async function getOrCreateUser(
  cognitoUser: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  },
  roles?: UserRole[],
  signupSource?: string,
  signupExperts?: string[]
): Promise<UserType> {
  console.log(
    '[DBG][auth] Getting or creating user for cognitoSub:',
    cognitoUser.sub,
    'roles:',
    roles,
    'signupSource:',
    signupSource || 'unknown',
    'signupExperts:',
    signupExperts || []
  );
  console.log('[DBG][auth] Cognito user data:', {
    sub: cognitoUser.sub,
    email: cognitoUser.email,
    name: cognitoUser.name,
    nameProvided: !!cognitoUser.name,
    picture: cognitoUser.picture,
  });

  // Delegate to userRepository
  return userRepository.getOrCreateUser(cognitoUser, roles, signupSource, signupExperts);
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
  // The expertProfile IS the tenantId
  const course = await courseRepository.getCourseById(user.expertProfile, courseId);

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

/**
 * Dual auth session result - includes auth type for debugging/logging
 */
interface DualAuthSession {
  user: {
    cognitoSub: string;
    email?: string;
    name?: string;
  };
  authType: 'cookie' | 'bearer';
}

/**
 * Get session from either cookies (web) or Bearer token (mobile)
 * Tries cookie-based auth first, then falls back to Bearer token
 *
 * @param request - NextRequest object to extract auth from
 * @returns Session object with auth type, or null if not authenticated
 */
export async function getSessionDual(request: NextRequest): Promise<DualAuthSession | null> {
  // 1. Try cookie-based auth first (web)
  const cookieSession = await getSessionFromRequest(request);
  if (cookieSession?.user?.cognitoSub) {
    return {
      user: {
        cognitoSub: cookieSession.user.cognitoSub,
        email: cookieSession.user.email,
        name: cookieSession.user.name,
      },
      authType: 'cookie',
    };
  }

  // 2. Try Bearer token (mobile - Cognito access token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verifier = getAccessTokenVerifier();

    if (!verifier) {
      console.error('[DBG][auth] Access token verifier not available');
      return null;
    }

    try {
      const payload = await verifier.verify(token);
      console.log('[DBG][auth] Bearer token verified for sub:', payload.sub);

      return {
        user: {
          cognitoSub: payload.sub,
          // Note: Access tokens don't contain email/name - fetch from DB if needed
        },
        authType: 'bearer',
      };
    } catch (error) {
      console.error('[DBG][auth] Bearer token verification failed:', error);
      return null;
    }
  }

  return null;
}

/**
 * Require expert authentication with dual auth support (cookies or Bearer token)
 * Use this in API routes that need to support both web and mobile
 *
 * @param request - NextRequest object to extract auth from
 * @returns Session and user object
 * @throws Error if not authenticated or not an expert
 */
export async function requireExpertAuthDual(request: NextRequest): Promise<{
  session: DualAuthSession;
  user: UserType;
}> {
  const session = await getSessionDual(request);

  if (!session?.user?.cognitoSub) {
    throw new Error('Unauthorized');
  }

  const user = await getUserByCognitoSub(session.user.cognitoSub);

  if (!user) {
    throw new Error('User not found');
  }

  if (!hasRole(user, 'expert')) {
    throw new Error('Forbidden - Expert access required');
  }

  console.log('[DBG][auth] Expert auth passed via', session.authType, 'for user:', user.id);

  return { session, user };
}

/**
 * Require authentication with dual auth support (cookies or Bearer token)
 * Use this in API routes that need to support both web and mobile
 *
 * @param request - NextRequest object to extract auth from
 * @returns Session and user object
 * @throws Error if not authenticated
 */
export async function requireAuthDual(request: NextRequest): Promise<{
  session: DualAuthSession;
  user: UserType;
}> {
  const session = await getSessionDual(request);

  if (!session?.user?.cognitoSub) {
    throw new Error('Unauthorized');
  }

  const user = await getUserByCognitoSub(session.user.cognitoSub);

  if (!user) {
    throw new Error('User not found');
  }

  console.log('[DBG][auth] Auth passed via', session.authType, 'for user:', user.id);

  return { session, user };
}

/**
 * Get the forum access level for a user in a given context
 *
 * Access Control Matrix:
 * | User Type                  | Private Threads | Public Threads |
 * |----------------------------|-----------------|----------------|
 * | Guest (not logged in)      | none            | view           |
 * | Logged-in (no access)      | none            | participate    |
 * | Logged-in (has access)     | participate     | participate    |
 *
 * "Has access" means:
 * - For course contexts: User is enrolled in the course OR is the expert owner
 * - For blog/community contexts: User is the expert owner (always public, so all logged-in can participate)
 * - For webinar contexts: User is registered for the webinar OR is the expert owner
 *
 * @param contextVisibility - Whether the context is public or private
 * @param expertId - The expert/tenant ID that owns the content
 * @param cognitoSub - The user's cognitoSub (null if guest)
 * @param contextType - The type of context (course, blog, webinar, community)
 * @param contextId - Optional context-specific ID (courseId, webinarId, etc.)
 * @param lessonId - Optional lesson ID for course contexts
 * @returns The access level: 'none', 'view', or 'participate'
 */
export async function getForumAccessLevel(
  contextVisibility: ForumContextVisibility,
  expertId: string,
  cognitoSub: string | null,
  contextType: 'course' | 'blog' | 'webinar' | 'community',
  contextId?: string,
  lessonId?: string
): Promise<ForumAccessLevel> {
  console.log('[DBG][auth] Getting forum access level:', {
    contextVisibility,
    expertId,
    cognitoSub: cognitoSub ? 'present' : 'guest',
    contextType,
    contextId,
    lessonId,
  });

  // Guest users
  if (!cognitoSub) {
    // Private contexts: no access
    if (contextVisibility === 'private') {
      console.log('[DBG][auth] Guest user, private context - access: none');
      return 'none';
    }
    // Public contexts: view only
    console.log('[DBG][auth] Guest user, public context - access: view');
    return 'view';
  }

  // Logged-in users - check if they're the expert owner
  const user = await getUserByCognitoSub(cognitoSub);
  if (!user) {
    console.log('[DBG][auth] User not found in DB - treating as guest');
    return contextVisibility === 'private' ? 'none' : 'view';
  }

  // Expert owner always has full access
  if (hasRole(user, 'expert') && user.expertProfile === expertId) {
    console.log('[DBG][auth] User is expert owner - access: participate');
    return 'participate';
  }

  // For private contexts, check specific access
  if (contextVisibility === 'private') {
    let hasAccess = false;

    // Course context: check enrollment
    if (contextType === 'course' && contextId) {
      // Parse courseId from context if needed
      const courseId = lessonId ? contextId : contextId;
      hasAccess = await enrollment.isUserEnrolled(expertId, cognitoSub, courseId);
      console.log('[DBG][auth] Course enrollment check:', hasAccess);
    }
    // Webinar context: check registration
    else if (contextType === 'webinar' && contextId) {
      hasAccess = await webinarRegistrationRepository.isUserRegistered(
        expertId,
        contextId,
        cognitoSub
      );
      console.log('[DBG][auth] Webinar registration check:', hasAccess);
    }

    if (hasAccess) {
      console.log('[DBG][auth] User has access to private context - access: participate');
      return 'participate';
    }

    console.log('[DBG][auth] User does not have access to private context - access: none');
    return 'none';
  }

  // Public contexts: all logged-in users can participate
  console.log('[DBG][auth] Logged-in user, public context - access: participate');
  return 'participate';
}

/**
 * Parse a forum context string to extract type and IDs
 *
 * Context string formats:
 * - course.{courseId}.lesson.{lessonId}
 * - blog.post.{postId}
 * - webinar.{webinarId}
 * - community.{expertId}
 *
 * @param context - The context string
 * @returns Parsed context information
 */
export function parseForumContext(context: string): {
  contextType: 'course' | 'blog' | 'webinar' | 'community';
  courseId?: string;
  lessonId?: string;
  postId?: string;
  webinarId?: string;
  communityExpertId?: string;
} {
  const parts = context.split('.');

  if (parts[0] === 'course' && parts.length >= 4 && parts[2] === 'lesson') {
    return {
      contextType: 'course',
      courseId: parts[1],
      lessonId: parts[3],
    };
  }

  if (parts[0] === 'blog' && parts[1] === 'post' && parts.length >= 3) {
    return {
      contextType: 'blog',
      postId: parts[2],
    };
  }

  if (parts[0] === 'webinar' && parts.length >= 2) {
    return {
      contextType: 'webinar',
      webinarId: parts[1],
    };
  }

  if (parts[0] === 'community' && parts.length >= 2) {
    return {
      contextType: 'community',
      communityExpertId: parts[1],
    };
  }

  // Default to community type for unknown formats
  return { contextType: 'community' };
}

/**
 * Get forum access level from a context string
 * Convenience function that parses context and determines access
 *
 * @param context - The context string (e.g., "blog.post.123")
 * @param contextVisibility - Whether the context is public or private
 * @param expertId - The expert/tenant ID that owns the content
 * @param cognitoSub - The user's cognitoSub (null if guest)
 * @returns The access level: 'none', 'view', or 'participate'
 */
export async function getForumAccessLevelFromContext(
  context: string,
  contextVisibility: ForumContextVisibility,
  expertId: string,
  cognitoSub: string | null
): Promise<ForumAccessLevel> {
  const parsed = parseForumContext(context);

  return getForumAccessLevel(
    contextVisibility,
    expertId,
    cognitoSub,
    parsed.contextType,
    parsed.courseId || parsed.webinarId || parsed.postId,
    parsed.lessonId
  );
}
