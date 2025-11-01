import { auth0 } from './auth0';
import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import CourseModel from '@/models/Course';
import type { User as UserType, MembershipType, UserRole } from '@/types';
import { nanoid } from 'nanoid';

/**
 * Get the current session from Auth0
 */
export async function getSession() {
  try {
    const session = await auth0.getSession();
    return session;
  } catch (error) {
    console.error('[DBG][auth] Error getting session:', error);
    return null;
  }
}

/**
 * Get or create user in MongoDB from Auth0 profile
 * This is called after Auth0 authentication to sync user data
 *
 * @param role - Optional role to assign to new users. Defaults to 'learner'
 */
export async function getOrCreateUser(
  auth0User: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  },
  role?: UserRole
): Promise<UserType> {
  console.log('[DBG][auth] Getting or creating user for auth0Id:', auth0User.sub, 'role:', role);

  await connectToDatabase();

  // Try to find existing user by auth0Id
  let userDoc = await User.findOne({ auth0Id: auth0User.sub });

  if (userDoc) {
    console.log('[DBG][auth] Found existing user:', userDoc._id, 'role:', userDoc.role);

    // Update profile if email or name changed in Auth0
    if (
      userDoc.profile.email !== auth0User.email ||
      userDoc.profile.name !== (auth0User.name || auth0User.email)
    ) {
      userDoc.profile.email = auth0User.email;
      userDoc.profile.name = auth0User.name || auth0User.email;
      if (auth0User.picture) {
        userDoc.profile.avatar = auth0User.picture;
      }
      await userDoc.save();
      console.log('[DBG][auth] Updated user profile');
    }
  } else {
    console.log('[DBG][auth] Creating new user with role:', role || 'learner');

    // Create new user with default values
    const userId = nanoid(16);
    const now = new Date().toISOString();

    userDoc = await User.create({
      _id: userId,
      auth0Id: auth0User.sub,
      role: role || ('learner' as UserRole),
      profile: {
        name: auth0User.name || auth0User.email,
        email: auth0User.email,
        avatar: auth0User.picture || undefined,
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
    role: userDoc.role,
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
    role: userDoc.role,
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
  };

  return user;
}

/**
 * Get user by Auth0 ID from MongoDB
 */
export async function getUserByAuth0Id(auth0Id: string): Promise<UserType | null> {
  console.log('[DBG][auth] Getting user by auth0Id:', auth0Id);

  await connectToDatabase();

  const userDoc = await User.findOne({ auth0Id });

  if (!userDoc) {
    console.log('[DBG][auth] User not found');
    return null;
  }

  console.log('[DBG][auth] Found user:', userDoc._id, 'role:', userDoc.role);
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
    role: userDoc.role,
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
  };

  return user;
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes to protect them
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Require expert authentication - throws error if not authenticated as expert
 * Use this in API routes to protect expert-only routes
 */
export async function requireExpertAuth(): Promise<{ session: any; user: UserType }> {
  const session = await getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  const user = await getUserByAuth0Id(session.user.sub);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'expert') {
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

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  const user = await getUserByAuth0Id(session.user.sub);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'expert') {
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

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  const user = await getUserByAuth0Id(session.user.sub);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'expert') {
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
