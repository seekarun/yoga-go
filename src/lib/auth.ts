import { auth } from '@/auth';
import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import CourseModel from '@/models/Course';
import type { User as UserType, MembershipType, UserRole } from '@/types';
import { nanoid } from 'nanoid';

/**
 * Get the current session from NextAuth
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
 * Get or create user in MongoDB from Cognito profile
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

  await connectToDatabase();

  // Try to find existing user by cognitoSub
  let userDoc = await User.findOne({ cognitoSub: cognitoUser.sub });

  if (userDoc) {
    console.log('[DBG][auth] Found existing user:', userDoc._id, 'roles:', userDoc.role);

    // Update profile if email or name changed in Cognito
    if (
      userDoc.profile.email !== cognitoUser.email ||
      userDoc.profile.name !== (cognitoUser.name || cognitoUser.email)
    ) {
      const newName = cognitoUser.name || cognitoUser.email;
      userDoc.profile.email = cognitoUser.email;
      userDoc.profile.name = newName;
      if (cognitoUser.picture) {
        userDoc.profile.avatar = cognitoUser.picture;
      }
      await userDoc.save();
      console.log('[DBG][auth] Updated user profile with name:', newName);
    }
  } else {
    const userRoles = roles || ['learner'];
    console.log('[DBG][auth] Creating new user with roles:', userRoles);

    // Create new user with default values
    const userId = nanoid(16);
    const now = new Date().toISOString();
    const userName = cognitoUser.name || cognitoUser.email;

    console.log('[DBG][auth] Creating user with name:', userName);

    userDoc = await User.create({
      _id: userId,
      cognitoSub: cognitoUser.sub,
      role: userRoles,
      profile: {
        name: userName,
        email: cognitoUser.email,
        avatar: cognitoUser.picture || undefined,
        joinedAt: now,
      },
      membership: {
        type: 'free' as MembershipType,
        status: 'active',
        startDate: now,
        benefits: ['Access to free courses', 'Community support'],
      },
      statistics: {
        totalCourses: 0,
        completedCourses: 0,
        totalLessons: 0,
        completedLessons: 0,
        totalPracticeTime: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageSessionTime: 0,
        lastPractice: now,
      },
      achievements: [
        {
          id: 'welcome',
          title: 'Welcome to Yoga-GO',
          description: 'Joined the Yoga-GO community',
          icon: '👋',
          unlockedAt: now,
          points: 10,
        },
      ],
      enrolledCourses: [],
      preferences: {
        emailNotifications: true,
        pushNotifications: false,
        language: 'en',
        videoQuality: 'hd',
      },
      savedItems: {
        favoriteCourses: [],
        watchlist: [],
        bookmarkedLessons: [],
      },
      social: {
        following: [],
        followers: 0,
        friends: 0,
        sharedAchievements: false,
        publicProfile: false,
      },
    });

    console.log('[DBG][auth] Created new user:', userDoc._id);
  }

  // Convert MongoDB document to User type
  const user: UserType = {
    id: userDoc._id,
    role: normalizeRoles(userDoc.role),
    expertProfile: userDoc.expertProfile,
    profile: userDoc.profile,
    membership: userDoc.membership,
    statistics: userDoc.statistics,
    achievements: userDoc.achievements,
    enrolledCourses: userDoc.enrolledCourses,
    preferences: userDoc.preferences,
    billing: userDoc.billing,
    savedItems: userDoc.savedItems,
    social: userDoc.social,
    defaultMeetingLink: userDoc.defaultMeetingLink,
    defaultMeetingPlatform: userDoc.defaultMeetingPlatform,
  };

  return user;
}

/**
 * Get user by ID from MongoDB
 */
export async function getUserById(userId: string): Promise<UserType | null> {
  console.log('[DBG][auth] Getting user by ID:', userId);

  await connectToDatabase();

  const userDoc = await User.findById(userId);

  if (!userDoc) {
    console.log('[DBG][auth] User not found');
    return null;
  }

  const user: UserType = {
    id: userDoc._id,
    role: normalizeRoles(userDoc.role),
    expertProfile: userDoc.expertProfile,
    profile: userDoc.profile,
    membership: userDoc.membership,
    statistics: userDoc.statistics,
    achievements: userDoc.achievements,
    enrolledCourses: userDoc.enrolledCourses,
    preferences: userDoc.preferences,
    billing: userDoc.billing,
    savedItems: userDoc.savedItems,
    social: userDoc.social,
    defaultMeetingLink: userDoc.defaultMeetingLink,
    defaultMeetingPlatform: userDoc.defaultMeetingPlatform,
  };

  return user;
}

/**
 * Get user by Cognito Sub from MongoDB
 */
export async function getUserByCognitoSub(cognitoSub: string): Promise<UserType | null> {
  console.log('[DBG][auth] Getting user by cognitoSub:', cognitoSub);

  await connectToDatabase();

  const userDoc = await User.findOne({ cognitoSub });

  if (!userDoc) {
    console.log('[DBG][auth] User not found');
    return null;
  }

  console.log('[DBG][auth] Found user:', userDoc._id, 'roles:', userDoc.role);
  console.log('[DBG][auth] User has', userDoc.enrolledCourses.length, 'enrolled courses');
  console.log(
    '[DBG][auth] Enrolled courses:',
    userDoc.enrolledCourses.map((ec: { courseId: string; title: string }) => ({
      id: ec.courseId,
      title: ec.title,
    }))
  );

  const user: UserType = {
    id: userDoc._id,
    role: normalizeRoles(userDoc.role),
    expertProfile: userDoc.expertProfile,
    profile: userDoc.profile,
    membership: userDoc.membership,
    statistics: userDoc.statistics,
    achievements: userDoc.achievements,
    enrolledCourses: userDoc.enrolledCourses,
    preferences: userDoc.preferences,
    billing: userDoc.billing,
    savedItems: userDoc.savedItems,
    social: userDoc.social,
    defaultMeetingLink: userDoc.defaultMeetingLink,
    defaultMeetingPlatform: userDoc.defaultMeetingPlatform,
  };

  return user;
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
  await connectToDatabase();
  const course = await CourseModel.findById(courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  if (course.instructor.id !== user.expertProfile) {
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
