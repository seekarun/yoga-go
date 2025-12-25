/**
 * User Repository - DynamoDB Operations
 *
 * Single-table design:
 * - PK: "USER"
 * - SK: cognitoSub (which is also the user id)
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EntityType } from '../dynamodb';
import type { User, UserRole, MembershipType } from '@/types';

// Type for creating a new user
export interface CreateUserInput {
  cognitoSub: string;
  email: string;
  name?: string;
  picture?: string;
  roles?: UserRole[];
  signupExperts?: string[]; // Expert IDs where user signed up (from subdomains)
}

// Type for DynamoDB User item (includes PK/SK)
interface DynamoDBUserItem extends User {
  PK: string;
  SK: string;
}

/**
 * Convert DynamoDB item to User type (removes PK/SK)
 */
function toUser(item: DynamoDBUserItem): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...user } = item;
  return user as User;
}

/**
 * Get user by cognitoSub (which is the user id)
 */
export async function getUserById(cognitoSub: string): Promise<User | null> {
  console.log('[DBG][userRepository] Getting user by id:', cognitoSub);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.USER,
        SK: cognitoSub,
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
 */
export async function getAllUsers(): Promise<User[]> {
  console.log('[DBG][userRepository] Getting all users');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EntityType.USER,
      },
    })
  );

  const users = (result.Items || []).map(item => toUser(item as DynamoDBUserItem));
  console.log('[DBG][userRepository] Found', users.length, 'users');
  return users;
}

/**
 * Create a new user in DynamoDB
 * Returns the created user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const { cognitoSub, email, name, picture, roles, signupExperts } = input;
  const now = new Date().toISOString();
  const userRoles = roles || ['learner'];
  const userName = name || email;

  console.log(
    '[DBG][userRepository] Creating user:',
    cognitoSub,
    'roles:',
    userRoles,
    'signupExperts:',
    signupExperts || []
  );

  const user: DynamoDBUserItem = {
    PK: EntityType.USER,
    SK: cognitoSub,
    id: cognitoSub, // cognitoSub is now the user id
    role: userRoles,
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
      TableName: Tables.CORE,
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
  signupExperts?: string[]
): Promise<User> {
  console.log(
    '[DBG][userRepository] Getting or creating user for cognitoSub:',
    cognitoUser.sub,
    'roles:',
    roles,
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

  // Create new user
  console.log('[DBG][userRepository] Creating new user');
  return createUser({
    cognitoSub: cognitoUser.sub,
    email: cognitoUser.email,
    name: cognitoUser.name,
    picture: cognitoUser.picture,
    roles: roles,
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
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.USER,
        SK: cognitoSub,
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
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.USER,
        SK: cognitoSub,
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
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.USER,
        SK: cognitoSub,
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
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.USER,
        SK: cognitoSub,
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
