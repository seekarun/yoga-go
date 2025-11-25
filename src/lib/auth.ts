import { auth0 } from './auth0';
import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import CourseModel from '@/models/Course';
import type { User as UserType, MembershipType, UserRole } from '@/types';
import { nanoid } from 'nanoid';
import { updateAuth0UserMetadata } from './auth0-management';

/**
 * Check if Auth0 login is from a social provider (Twitter, Google, etc.)
 * @param sub - Auth0 user sub (e.g., "twitter|123", "auth0|456", "google-oauth2|789")
 * @returns true if social login, false if email/password
 */
export function isSocialLogin(sub: string): boolean {
  const provider = sub.split('|')[0];
  return provider !== 'auth0';
}

/**
 * Get the current session from Auth0
 */
export async function getSession() {
  try {
    const session = await auth0.getSession();
    return session;
  } catch (error) {
    console.error('[auth] Error getting session:', error);
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
  await connectToDatabase();

  // If username was provided (from Auth0 email/password signup), try to use it
  if (providedUsername) {
    const sanitized = providedUsername.toLowerCase().trim();
    const existing = await User.findOne({ 'profile.username': sanitized });

    if (!existing) {
      return sanitized;
    }
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

  // Check if username exists
  const existing = await User.findOne({ 'profile.username': baseUsername });

  if (!existing) {
    return baseUsername;
  }

  // Username exists, try with random suffix
  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const username = `${baseUsername}${suffix}`;

    const collision = await User.findOne({ 'profile.username': username });

    if (!collision) {
      return username;
    }
  }

  // Fallback: use nanoid
  const fallback = `${baseUsername}${nanoid(6)}`;
  return fallback;
}

/**
 * Result from getOrCreateUser function
 */
export interface GetOrCreateUserResult {
  user: UserType;
  isNew: boolean;
}

/**
 * Get or create user in MongoDB from Auth0 profile
 * This is called after Auth0 authentication to sync user data
 *
 * @param role - Optional role to assign to new users. Defaults to 'learner'
 * @returns Object containing the user and whether they were newly created
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
): Promise<GetOrCreateUserResult> {
  await connectToDatabase();

  // Track if this is a new user (for welcome email sending)
  let isNew = false;

  // Try to find existing user by auth0Id
  let userDoc = await User.findOne({ auth0Id: auth0User.sub });

  if (userDoc) {
    // For existing users, MongoDB role is the source of truth
    // Only update role if it was explicitly set from Auth0 token claim (not default)
    // The callback should pass the role from MongoDB lookup, so this preserves it
    // Note: If you need to change a user's role, do it via admin panel or direct DB update

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
      }

      await userDoc.save();
    }
  } else {
    isNew = true;

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
          title: 'Welcome to My Yoga.Guru',
          description: 'Joined the My Yoga.Guru community',
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

  return { user, isNew };
}

/**
 * Get user by ID from MongoDB
 */
export async function getUserById(userId: string): Promise<UserType | null> {
  await connectToDatabase();

  const userDoc = await User.findById(userId);

  if (!userDoc) {
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
  await connectToDatabase();

  const userDoc = await User.findOne({ auth0Id });

  if (!userDoc) {
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
    throw new Error('Forbidden - You do not own this expert profile');
  }

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
    throw new Error('Forbidden - You do not own this course');
  }

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
