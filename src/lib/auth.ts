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
 * Generate a unique username from email address
 *
 * @param email - User's email address (optional for social logins like Twitter)
 * @param providedUsername - Optional username from Auth0 (for email/password signups)
 * @param auth0Sub - Auth0 user sub for fallback username generation
 * @returns A unique username
 */
async function generateUniqueUsername(
  email: string | null | undefined,
  providedUsername?: string,
  auth0Sub?: string
): Promise<string> {
  console.log('[DBG][auth] Generating username for email:', email, 'provided:', providedUsername);

  await connectToDatabase();

  // If username was provided (from Auth0 email/password signup), try to use it
  if (providedUsername) {
    const sanitized = providedUsername.toLowerCase().trim();
    const existing = await User.findOne({ 'profile.username': sanitized });

    if (!existing) {
      console.log('[DBG][auth] Using provided username:', sanitized);
      return sanitized;
    }
    console.log('[DBG][auth] Provided username already exists, generating from email');
  }

  let baseUsername = '';

  // If email is provided, extract username from it
  if (email && email.includes('@')) {
    // Extract local part from email (before @)
    const localPart = email.split('@')[0];

    // Remove special characters and convert to lowercase
    // Keep only alphanumeric characters
    baseUsername = localPart.toLowerCase().replace(/[^a-z0-9]/g, '');

    // If username is too short after sanitization, use part of email domain
    if (baseUsername.length < 3) {
      const domain = email.split('@')[1]?.split('.')[0] || 'user';
      baseUsername = baseUsername + domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  } else {
    // No email provided (e.g., Twitter without email permission)
    // Generate username from auth0 sub or use default
    console.log('[DBG][auth] No email provided, using fallback username generation');

    if (auth0Sub) {
      // Extract provider and ID from sub (e.g., "twitter|123456" -> "twitter123456")
      const subParts = auth0Sub.split('|');
      const provider = subParts[0] || 'user';
      const userId = subParts[1] || nanoid(8);
      baseUsername = `${provider}${userId}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else {
      // Last resort fallback
      baseUsername = `user${nanoid(8)}`;
    }
  }

  // Limit to 20 characters
  baseUsername = baseUsername.substring(0, 20);

  console.log('[DBG][auth] Base username:', baseUsername);

  // Check if username exists
  const existing = await User.findOne({ 'profile.username': baseUsername });

  if (!existing) {
    console.log('[DBG][auth] Username available:', baseUsername);
    return baseUsername;
  }

  // Username exists, try with random suffix
  console.log('[DBG][auth] Username exists, adding suffix');

  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const username = `${baseUsername}${suffix}`;

    const collision = await User.findOne({ 'profile.username': username });

    if (!collision) {
      console.log('[DBG][auth] Generated unique username:', username);
      return username;
    }
  }

  // Fallback: use nanoid
  const fallback = `${baseUsername}${nanoid(6)}`;
  console.log('[DBG][auth] Using fallback username:', fallback);
  return fallback;
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
    username?: string;
  },
  role?: UserRole
): Promise<UserType> {
  console.log('[DBG][auth] Getting or creating user for auth0Id:', auth0User.sub, 'role:', role);
  console.log('[DBG][auth] Auth0 user data:', {
    sub: auth0User.sub,
    email: auth0User.email,
    name: auth0User.name,
    nameProvided: !!auth0User.name,
    picture: auth0User.picture,
  });

  await connectToDatabase();

  // Try to find existing user by auth0Id
  let userDoc = await User.findOne({ auth0Id: auth0User.sub });

  if (userDoc) {
    console.log('[DBG][auth] Found existing user:', userDoc._id, 'role:', userDoc.role);

    // Update profile if email or name changed in Auth0, or username is missing
    const shouldUpdate =
      userDoc.profile.email !== auth0User.email ||
      userDoc.profile.name !== (auth0User.name || auth0User.email) ||
      !userDoc.profile.username;

    if (shouldUpdate) {
      const newName = auth0User.name || auth0User.email || 'User';
      // True if Auth0 didn't provide a real name OR if the name is the same as email
      const nameIsFromEmail = !auth0User.name || auth0User.name === auth0User.email;

      // Only update email if provided (Twitter might not share email)
      if (auth0User.email) {
        userDoc.profile.email = auth0User.email;
      }
      userDoc.profile.name = newName;
      userDoc.profile.nameIsFromEmail = nameIsFromEmail;

      if (auth0User.picture) {
        userDoc.profile.avatar = auth0User.picture;
      }

      // Generate username if missing
      if (!userDoc.profile.username) {
        const username = await generateUniqueUsername(
          auth0User.email,
          auth0User.username,
          auth0User.sub
        );
        userDoc.profile.username = username;
        console.log('[DBG][auth] Generated username for existing user:', username);
      }

      await userDoc.save();
      console.log(
        '[DBG][auth] Updated user profile with name:',
        newName,
        'nameIsFromEmail:',
        nameIsFromEmail
      );
    }
  } else {
    console.log('[DBG][auth] Creating new user with role:', role || 'learner');

    // Create new user with default values
    const userId = nanoid(16);
    const now = new Date().toISOString();
    // Twitter might not provide email, so fallback to a generic name
    const userName = auth0User.name || auth0User.email || 'User';
    // True if Auth0 didn't provide a real name OR if the name is the same as email
    const nameIsFromEmail = !auth0User.name || auth0User.name === auth0User.email;

    // Generate unique username
    const username = await generateUniqueUsername(
      auth0User.email,
      auth0User.username,
      auth0User.sub
    );
    console.log(
      '[DBG][auth] Creating user with name:',
      userName,
      'username:',
      username,
      'nameIsFromEmail:',
      nameIsFromEmail
    );

    userDoc = await User.create({
      _id: userId,
      auth0Id: auth0User.sub,
      role: role || ('learner' as UserRole),
      profile: {
        name: userName,
        email: auth0User.email || `${username}@placeholder.local`, // Twitter might not share email
        username: username,
        nameIsFromEmail: nameIsFromEmail,
        onboardingCompleted: false, // New users need to complete onboarding
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
    auth0Id: userDoc.auth0Id,
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
    auth0Id: userDoc.auth0Id,
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
    defaultMeetingLink: userDoc.defaultMeetingLink,
    defaultMeetingPlatform: userDoc.defaultMeetingPlatform,
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
    auth0Id: userDoc.auth0Id,
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

/**
 * Require admin authentication - throws error if not authenticated as admin
 * Use this in API routes to protect admin-only routes
 */
export async function requireAdminAuth(): Promise<{ session: any; user: UserType }> {
  const session = await getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  const user = await getUserByAuth0Id(session.user.sub);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'admin') {
    throw new Error('Forbidden - Admin access required');
  }

  return { session, user };
}
