/**
 * User Repository - DynamoDB Operations
 *
 * Dedicated users table (yoga-go-users):
 * - PK: cognitoSub (user id)
 * - SK: PROFILE
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, UsersPK, EntityType } from '../dynamodb';
import { adminGetUserBySub } from '../cognito-auth';
import type { User, UserRole, MembershipType } from '@/types';

// Type for creating a new user
export interface CreateUserInput {
  cognitoSub: string;
  email: string;
  name?: string;
  picture?: string;
  roles?: UserRole[];
  signupSource?: string; // Where user first signed up: 'main' or expertId
  signupExperts?: string[]; // Expert IDs where user signed up (from subdomains)
}

// Type for DynamoDB User item (includes PK/SK and entityType)
interface DynamoDBUserItem extends User {
  PK: string;
  SK: string;
  entityType?: string;
}

/**
 * Convert DynamoDB item to User type (removes PK/SK/entityType)
 */
function toUser(item: DynamoDBUserItem): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, entityType, ...user } = item;
  return user as User;
}

/**
 * Get user by cognitoSub (which is the user id)
 */
export async function getUserById(cognitoSub: string): Promise<User | null> {
  console.log('[DBG][userRepository] Getting user by id:', cognitoSub);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.USERS,
      Key: {
        PK: UsersPK.USER(cognitoSub),
        SK: UsersPK.PROFILE,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][userRepository] User not found');
    return null;
  }

  console.log('[DBG][userRepository] Found user:', cognitoSub);
  return toUser(result.Item as DynamoDBUserItem);
}

/**
 * Alias for getUserById - used by auth code
 */
export const getUserByCognitoSub = getUserById;

/**
 * Get all users (for admin)
 * Uses Scan since each user has their own PK
 */
export async function getAllUsers(): Promise<User[]> {
  console.log('[DBG][userRepository] Getting all users');

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.USERS,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': UsersPK.PROFILE,
      },
    })
  );

  const users = (result.Items || []).map(item => toUser(item as DynamoDBUserItem));
  console.log('[DBG][userRepository] Found', users.length, 'users');
  return users;
}

/**
 * Get users who signed up via an expert's space
 * Filters users whose signupExperts array contains the expertId
 * Uses Scan since each user has their own PK
 */
export async function getUsersByExpertId(expertId: string): Promise<User[]> {
  console.log('[DBG][userRepository] Getting users for expert:', expertId);

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.USERS,
      FilterExpression: 'SK = :sk AND contains(signupExperts, :expertId)',
      ExpressionAttributeValues: {
        ':sk': UsersPK.PROFILE,
        ':expertId': expertId,
      },
    })
  );

  const users = (result.Items || []).map(item => toUser(item as DynamoDBUserItem));
  console.log('[DBG][userRepository] Found', users.length, 'users for expert');
  return users;
}

/**
 * Create a new user in DynamoDB
 * Returns the created user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const { cognitoSub, email, name, picture, roles, signupSource, signupExperts } = input;
  const now = new Date().toISOString();
  const userRoles = roles || ['learner'];
  const userName = name || email;

  console.log(
    '[DBG][userRepository] Creating user:',
    cognitoSub,
    'roles:',
    userRoles,
    'signupSource:',
    signupSource || 'unknown',
    'signupExperts:',
    signupExperts || []
  );

  const user: DynamoDBUserItem = {
    PK: UsersPK.USER(cognitoSub),
    SK: UsersPK.PROFILE,
    entityType: EntityType.USER,
    id: cognitoSub, // cognitoSub is now the user id
    role: userRoles,
    signupSource: signupSource,
    signupExperts: signupExperts || [],
    profile: {
      name: userName,
      email: email,
      avatar: picture || undefined,
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
        icon: '',
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
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.USERS,
      Item: user,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting existing user
    })
  );

  console.log('[DBG][userRepository] Created user:', cognitoSub);
  return toUser(user);
}

/**
 * Get or create user - combines lookup and creation
 * This matches the existing auth.ts getOrCreateUser pattern
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
): Promise<User> {
  console.log(
    '[DBG][userRepository] Getting or creating user for cognitoSub:',
    cognitoUser.sub,
    'roles:',
    roles,
    'signupSource:',
    signupSource || 'unknown',
    'signupExperts:',
    signupExperts || []
  );

  // Try to get existing user
  let user = await getUserById(cognitoUser.sub);

  if (user) {
    console.log('[DBG][userRepository] Found existing user:', user.id, 'roles:', user.role);

    // Update profile if email or name changed
    const expectedName = cognitoUser.name || cognitoUser.email;
    if (user.profile.email !== cognitoUser.email || user.profile.name !== expectedName) {
      console.log('[DBG][userRepository] Updating user profile with name:', expectedName);
      const updates: Partial<User> = {
        profile: {
          ...user.profile,
          email: cognitoUser.email,
          name: expectedName,
          ...(cognitoUser.picture ? { avatar: cognitoUser.picture } : {}),
        },
      };
      user = await updateUser(cognitoUser.sub, updates);
    }

    // Add new signup experts if not already present
    if (signupExperts && signupExperts.length > 0) {
      const existingExperts = user.signupExperts || [];
      const newExperts = signupExperts.filter(e => !existingExperts.includes(e));
      if (newExperts.length > 0) {
        console.log('[DBG][userRepository] Adding new signup experts:', newExperts);
        user = await addSignupExperts(cognitoUser.sub, newExperts);
      }
    }

    return user;
  }

  // Create new user - first verify Cognito user exists
  console.log('[DBG][userRepository] Creating new user');

  const cognitoUserExists = await adminGetUserBySub(cognitoUser.sub);
  if (!cognitoUserExists) {
    console.error(
      '[DBG][userRepository] Cognito user not found, refusing to create DynamoDB record:',
      cognitoUser.sub
    );
    throw new Error(`Cannot create user: Cognito user not found for sub ${cognitoUser.sub}`);
  }

  return createUser({
    cognitoSub: cognitoUser.sub,
    email: cognitoUser.email,
    name: cognitoUser.name,
    picture: cognitoUser.picture,
    roles: roles,
    signupSource: signupSource,
    signupExperts: signupExperts,
  });
}

/**
 * Add signup experts to an existing user
 * Appends new expert IDs to the signupExperts array
 */
export async function addSignupExperts(cognitoSub: string, expertIds: string[]): Promise<User> {
  console.log('[DBG][userRepository] Adding signup experts:', cognitoSub, expertIds);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.USERS,
      Key: {
        PK: UsersPK.USER(cognitoSub),
        SK: UsersPK.PROFILE,
      },
      UpdateExpression:
        'SET signupExperts = list_append(if_not_exists(signupExperts, :empty), :experts), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':experts': expertIds,
        ':empty': [],
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][userRepository] Added signup experts');
  return toUser(result.Attributes as DynamoDBUserItem);
}

/**
 * Update user - partial update using UpdateCommand
 * Returns the updated user
 */
export async function updateUser(cognitoSub: string, updates: Partial<User>): Promise<User> {
  console.log('[DBG][userRepository] Updating user:', cognitoSub);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'PK' && key !== 'SK') {
      updateParts.push(`#k${index} = :v${index}`);
      exprAttrNames[`#k${index}`] = key;
      exprAttrValues[`:v${index}`] = value;
      index++;
    }
  }

  // Always update updatedAt
  updateParts.push('#updatedAt = :updatedAt');
  exprAttrNames['#updatedAt'] = 'updatedAt';
  exprAttrValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.USERS,
      Key: {
        PK: UsersPK.USER(cognitoSub),
        SK: UsersPK.PROFILE,
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][userRepository] Updated user:', cognitoSub);
  return toUser(result.Attributes as DynamoDBUserItem);
}

/**
 * Delete user
 */
export async function deleteUser(cognitoSub: string): Promise<void> {
  console.log('[DBG][userRepository] Deleting user:', cognitoSub);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.USERS,
      Key: {
        PK: UsersPK.USER(cognitoSub),
        SK: UsersPK.PROFILE,
      },
    })
  );

  console.log('[DBG][userRepository] Deleted user:', cognitoSub);
}

/**
 * Add enrolled course to user
 */
export async function addEnrolledCourse(
  cognitoSub: string,
  course: {
    courseId: string;
    title: string;
    instructor: string;
  }
): Promise<User> {
  console.log('[DBG][userRepository] Adding enrolled course to user:', cognitoSub, course.courseId);

  const now = new Date().toISOString();
  const enrolledCourse = {
    courseId: course.courseId,
    title: course.title,
    instructor: course.instructor,
    progress: 0,
    lastAccessed: now,
    enrolledAt: now,
  };

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.USERS,
      Key: {
        PK: UsersPK.USER(cognitoSub),
        SK: UsersPK.PROFILE,
      },
      UpdateExpression:
        'SET enrolledCourses = list_append(if_not_exists(enrolledCourses, :empty), :course), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':course': [enrolledCourse],
        ':empty': [],
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][userRepository] Added enrolled course');
  return toUser(result.Attributes as DynamoDBUserItem);
}

/**
 * Update user statistics
 */
export async function updateStatistics(
  cognitoSub: string,
  statisticsUpdates: Partial<User['statistics']>
): Promise<User> {
  console.log('[DBG][userRepository] Updating user statistics:', cognitoSub);

  // Get current user to merge statistics
  const user = await getUserById(cognitoSub);
  if (!user) {
    throw new Error('User not found');
  }

  const updatedStatistics = {
    ...user.statistics,
    ...statisticsUpdates,
  };

  return updateUser(cognitoSub, { statistics: updatedStatistics });
}

/**
 * Set expert profile ID on user
 */
export async function setExpertProfile(cognitoSub: string, expertId: string): Promise<User> {
  console.log('[DBG][userRepository] Setting expert profile:', cognitoSub, expertId);

  // Get current user to update roles
  const user = await getUserById(cognitoSub);
  if (!user) {
    throw new Error('User not found');
  }

  // Add 'expert' role if not present
  const updatedRoles: UserRole[] = user.role.includes('expert')
    ? user.role
    : [...user.role, 'expert'];

  return updateUser(cognitoSub, {
    expertProfile: expertId,
    role: updatedRoles,
  });
}

/**
 * Result of comprehensive user deletion
 */
export interface DeleteUserResult {
  success: boolean;
  deletedCounts: {
    courseProgress: number;
    webinarRegistrations: number;
    surveyResponses: number;
    blogLikes: number;
    blogComments: number;
    discussionVotes: number;
    discussions: number;
    analyticsEvents: number;
    paymentsAnonymized: number;
    assets: number;
    cloudflareImages: number;
    cloudflareVideos: number;
  };
}

/**
 * Completely delete a user and all related data
 * This is a comprehensive deletion that removes data from all tables
 *
 * IMPORTANT: This only works for learners. Users with expertProfile are blocked.
 */
export async function deleteUserCompletely(cognitoSub: string): Promise<DeleteUserResult> {
  console.log('[DBG][userRepository] Starting complete deletion for user:', cognitoSub);

  // 1. Get user and validate
  const user = await getUserById(cognitoSub);
  if (!user) {
    throw new Error('User not found');
  }

  // Block deletion if user has expert profile
  if (user.expertProfile) {
    throw new Error(
      'Cannot delete users with expert profiles. Please delete the expert profile first.'
    );
  }

  // Get data needed for cleanup queries
  const courseIds = (user.enrolledCourses || []).map(c => c.courseId);
  const expertIds = user.signupExperts || [];
  // Get unique tenantIds from enrolled courses (instructor = tenantId) and signupExperts
  const courseTenantIds = (user.enrolledCourses || []).map(c => c.instructor);
  const allTenantIds = [...new Set([...expertIds, ...courseTenantIds])];

  console.log(
    '[DBG][userRepository] User has',
    courseIds.length,
    'courses,',
    expertIds.length,
    'signup experts,',
    allTenantIds.length,
    'tenants'
  );

  // Import all repositories dynamically to avoid circular dependencies
  const { deleteAllByUser: deleteProgress } = await import('./courseProgressRepository');
  const { deleteAllByUser: deleteWebinarRegs } = await import('./webinarRegistrationRepository');
  const { deleteAllByUser: deleteSurveyResponses } = await import('./surveyResponseRepository');
  const { deleteAllByUser: deleteBlogLikes } = await import('./blogLikeRepository');
  const { deleteAllByUser: deleteBlogComments } = await import('./blogCommentRepository');
  const { deleteAllByUser: deleteDiscussionVotes } = await import('./discussionVoteRepository');
  const { deleteAllByUser: deleteDiscussions } = await import('./discussionRepository');
  const { anonymizeUserPayments } = await import('./paymentRepository');
  const { deleteAllByUser: deleteAnalyticsEvents } =
    await import('./courseAnalyticsEventRepository');
  const { deleteAllAssetsWithCloudflare } = await import('./assetRepository');

  const deletedCounts = {
    courseProgress: 0,
    webinarRegistrations: 0,
    surveyResponses: 0,
    blogLikes: 0,
    blogComments: 0,
    discussionVotes: 0,
    discussions: 0,
    analyticsEvents: 0,
    paymentsAnonymized: 0,
    assets: 0,
    cloudflareImages: 0,
    cloudflareVideos: 0,
  };

  // 2. Delete assets (including Cloudflare media) - using userId as tenantId
  try {
    const assetResult = await deleteAllAssetsWithCloudflare(cognitoSub);
    deletedCounts.assets = assetResult.assetsDeleted;
    deletedCounts.cloudflareImages = assetResult.cloudflareImagesDeleted;
    deletedCounts.cloudflareVideos = assetResult.cloudflareVideosDeleted;
    console.log('[DBG][userRepository] Deleted assets:', assetResult);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting assets:', error);
  }

  // 3. Delete analytics events (lowest impact)
  try {
    deletedCounts.analyticsEvents = await deleteAnalyticsEvents(cognitoSub, courseIds);
    console.log('[DBG][userRepository] Deleted analytics events:', deletedCounts.analyticsEvents);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting analytics events:', error);
  }

  // 5. Delete blog likes
  try {
    deletedCounts.blogLikes = await deleteBlogLikes(cognitoSub);
    console.log('[DBG][userRepository] Deleted blog likes:', deletedCounts.blogLikes);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting blog likes:', error);
  }

  // 6. Delete blog comments
  try {
    deletedCounts.blogComments = await deleteBlogComments(cognitoSub, expertIds);
    console.log('[DBG][userRepository] Deleted blog comments:', deletedCounts.blogComments);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting blog comments:', error);
  }

  // 7. Delete discussion votes
  try {
    deletedCounts.discussionVotes = await deleteDiscussionVotes(cognitoSub);
    console.log('[DBG][userRepository] Deleted discussion votes:', deletedCounts.discussionVotes);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting discussion votes:', error);
  }

  // 8. Delete discussions
  try {
    deletedCounts.discussions = await deleteDiscussions(cognitoSub, courseIds);
    console.log('[DBG][userRepository] Deleted discussions:', deletedCounts.discussions);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting discussions:', error);
  }

  // 9. Delete survey responses
  try {
    deletedCounts.surveyResponses = await deleteSurveyResponses(cognitoSub);
    console.log('[DBG][userRepository] Deleted survey responses:', deletedCounts.surveyResponses);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting survey responses:', error);
  }

  // 10. Delete webinar registrations
  try {
    deletedCounts.webinarRegistrations = await deleteWebinarRegs(cognitoSub);
    console.log(
      '[DBG][userRepository] Deleted webinar registrations:',
      deletedCounts.webinarRegistrations
    );
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting webinar registrations:', error);
  }

  // 11. Delete course progress (iterate through all tenants)
  try {
    for (const tenantId of allTenantIds) {
      const count = await deleteProgress(tenantId, cognitoSub);
      deletedCounts.courseProgress += count;
    }
    console.log('[DBG][userRepository] Deleted course progress:', deletedCounts.courseProgress);
  } catch (error) {
    console.error('[DBG][userRepository] Error deleting course progress:', error);
  }

  // 12. Anonymize payments (don't delete, keep for audit trail)
  try {
    deletedCounts.paymentsAnonymized = await anonymizeUserPayments(cognitoSub);
    console.log('[DBG][userRepository] Anonymized payments:', deletedCounts.paymentsAnonymized);
  } catch (error) {
    console.error('[DBG][userRepository] Error anonymizing payments:', error);
  }

  // 13. Delete user record (last)
  await deleteUser(cognitoSub);
  console.log('[DBG][userRepository] Deleted user record');

  console.log('[DBG][userRepository] Complete deletion finished:', deletedCounts);

  return {
    success: true,
    deletedCounts,
  };
}
