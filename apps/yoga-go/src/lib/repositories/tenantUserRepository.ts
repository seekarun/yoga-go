/**
 * TenantUser Repository - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "USER#{cognitoSub}"
 *
 * Each user can exist in multiple tenants with separate TenantUser records.
 * Core identity (email, password) is managed by Cognito.
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK } from '../dynamodb';
import { adminGetUserBySub } from '../cognito-auth';
import type {
  TenantUser,
  CreateTenantUserInput,
  UserRole,
  MembershipType,
  EnrolledCourse,
  UserStatistics,
} from '@/types';

// Type for DynamoDB TenantUser item (includes PK/SK)
interface DynamoDBTenantUserItem extends TenantUser {
  PK: string;
  SK: string;
}

/**
 * Convert DynamoDB item to TenantUser type (removes PK/SK)
 */
function toTenantUser(item: DynamoDBTenantUserItem): TenantUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...user } = item;
  return user as TenantUser;
}

/**
 * Get user by tenantId and cognitoSub
 * @param tenantId - The tenant ID
 * @param cognitoSub - The Cognito user ID
 */
export async function getTenantUser(
  tenantId: string,
  cognitoSub: string
): Promise<TenantUser | null> {
  console.log('[DBG][tenantUserRepository] Getting user:', cognitoSub, 'in tenant:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_USER(cognitoSub),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][tenantUserRepository] User not found');
    return null;
  }

  console.log('[DBG][tenantUserRepository] Found user:', cognitoSub);
  return toTenantUser(result.Item as DynamoDBTenantUserItem);
}

/**
 * Get all users for a tenant
 * @param tenantId - The tenant ID
 */
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  console.log('[DBG][tenantUserRepository] Getting all users for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'USER#',
      },
    })
  );

  const users = (result.Items || []).map(item => toTenantUser(item as DynamoDBTenantUserItem));
  console.log('[DBG][tenantUserRepository] Found', users.length, 'users');
  return users;
}

/**
 * Create a new tenant user
 * @param input - TenantUser creation input
 */
export async function createTenantUser(input: CreateTenantUserInput): Promise<TenantUser> {
  const now = new Date().toISOString();
  const userRoles = input.role || ['learner'];
  const userName = input.name || input.email;

  console.log(
    '[DBG][tenantUserRepository] Creating user:',
    input.cognitoSub,
    'in tenant:',
    input.tenantId,
    'roles:',
    userRoles
  );

  const user: DynamoDBTenantUserItem = {
    PK: CorePK.TENANT(input.tenantId),
    SK: CorePK.TENANT_USER(input.cognitoSub),
    id: input.cognitoSub, // cognitoSub is the user id
    cognitoSub: input.cognitoSub,
    tenantId: input.tenantId,
    email: input.email,
    name: userName,
    avatar: input.avatar,
    role: userRoles,
    joinedTenantAt: now,
    lastActiveAt: now,
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
        title: 'Welcome!',
        description: 'Joined the community',
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

  console.log('[DBG][tenantUserRepository] Created user:', input.cognitoSub);
  return toTenantUser(user);
}

/**
 * Get or create tenant user - combines lookup and creation
 * Used by auth flow when user signs in/up on a tenant
 */
export async function getOrCreateTenantUser(
  tenantId: string,
  cognitoUser: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  },
  roles?: UserRole[]
): Promise<TenantUser> {
  console.log(
    '[DBG][tenantUserRepository] Getting or creating user:',
    cognitoUser.sub,
    'in tenant:',
    tenantId
  );

  // Try to get existing tenant user
  let user = await getTenantUser(tenantId, cognitoUser.sub);

  if (user) {
    console.log('[DBG][tenantUserRepository] Found existing user:', user.id, 'roles:', user.role);

    // Update profile if email or name changed
    const expectedName = cognitoUser.name || cognitoUser.email;
    if (user.email !== cognitoUser.email || user.name !== expectedName) {
      console.log('[DBG][tenantUserRepository] Updating user profile with name:', expectedName);
      const updates: Partial<TenantUser> = {
        email: cognitoUser.email,
        name: expectedName,
        ...(cognitoUser.picture ? { avatar: cognitoUser.picture } : {}),
      };
      user = await updateTenantUser(tenantId, cognitoUser.sub, updates);
    }

    // Update last active
    user = await updateTenantUser(tenantId, cognitoUser.sub, {
      lastActiveAt: new Date().toISOString(),
    });

    return user;
  }

  // Create new tenant user - first verify Cognito user exists
  console.log('[DBG][tenantUserRepository] Creating new user in tenant');

  const cognitoUserExists = await adminGetUserBySub(cognitoUser.sub);
  if (!cognitoUserExists) {
    console.error(
      '[DBG][tenantUserRepository] Cognito user not found, refusing to create DynamoDB record:',
      cognitoUser.sub
    );
    throw new Error(`Cannot create user: Cognito user not found for sub ${cognitoUser.sub}`);
  }

  return createTenantUser({
    cognitoSub: cognitoUser.sub,
    tenantId,
    email: cognitoUser.email,
    name: cognitoUser.name,
    avatar: cognitoUser.picture,
    role: roles,
  });
}

/**
 * Update tenant user - partial update
 * @param tenantId - The tenant ID
 * @param cognitoSub - The Cognito user ID
 * @param updates - Partial user updates
 */
export async function updateTenantUser(
  tenantId: string,
  cognitoSub: string,
  updates: Partial<TenantUser>
): Promise<TenantUser> {
  console.log('[DBG][tenantUserRepository] Updating user:', cognitoSub, 'in tenant:', tenantId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (
      value !== undefined &&
      key !== 'id' &&
      key !== 'cognitoSub' &&
      key !== 'tenantId' &&
      key !== 'PK' &&
      key !== 'SK'
    ) {
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
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_USER(cognitoSub),
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][tenantUserRepository] Updated user:', cognitoSub);
  return toTenantUser(result.Attributes as DynamoDBTenantUserItem);
}

/**
 * Delete tenant user
 * @param tenantId - The tenant ID
 * @param cognitoSub - The Cognito user ID
 */
export async function deleteTenantUser(tenantId: string, cognitoSub: string): Promise<void> {
  console.log('[DBG][tenantUserRepository] Deleting user:', cognitoSub, 'from tenant:', tenantId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_USER(cognitoSub),
      },
    })
  );

  console.log('[DBG][tenantUserRepository] Deleted user:', cognitoSub);
}

/**
 * Add enrolled course to user
 * @param tenantId - The tenant ID
 * @param cognitoSub - The Cognito user ID
 * @param course - Course enrollment details
 */
export async function addEnrolledCourse(
  tenantId: string,
  cognitoSub: string,
  course: {
    courseId: string;
    title: string;
    instructor: string;
  }
): Promise<TenantUser> {
  console.log(
    '[DBG][tenantUserRepository] Adding enrolled course to user:',
    cognitoSub,
    'course:',
    course.courseId
  );

  const now = new Date().toISOString();
  const enrolledCourse: EnrolledCourse = {
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
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_USER(cognitoSub),
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

  console.log('[DBG][tenantUserRepository] Added enrolled course');
  return toTenantUser(result.Attributes as DynamoDBTenantUserItem);
}

/**
 * Update enrolled course progress
 * @param tenantId - The tenant ID
 * @param cognitoSub - The Cognito user ID
 * @param courseId - The course ID
 * @param progress - Progress percentage (0-100)
 */
export async function updateCourseProgress(
  tenantId: string,
  cognitoSub: string,
  courseId: string,
  progress: number
): Promise<TenantUser> {
  console.log(
    '[DBG][tenantUserRepository] Updating course progress for user:',
    cognitoSub,
    'course:',
    courseId,
    'progress:',
    progress
  );

  // Get current user
  const user = await getTenantUser(tenantId, cognitoSub);
  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date().toISOString();
  const enrolledCourses = (user.enrolledCourses || []).map(course => {
    if (course.courseId === courseId) {
      return {
        ...course,
        progress,
        lastAccessed: now,
        ...(progress === 100 && !course.completedAt ? { completedAt: now } : {}),
      };
    }
    return course;
  });

  return updateTenantUser(tenantId, cognitoSub, { enrolledCourses });
}

/**
 * Update user statistics
 * @param tenantId - The tenant ID
 * @param cognitoSub - The Cognito user ID
 * @param statisticsUpdates - Partial statistics updates
 */
export async function updateStatistics(
  tenantId: string,
  cognitoSub: string,
  statisticsUpdates: Partial<UserStatistics>
): Promise<TenantUser> {
  console.log(
    '[DBG][tenantUserRepository] Updating statistics for user:',
    cognitoSub,
    'in tenant:',
    tenantId
  );

  // Get current user to merge statistics
  const user = await getTenantUser(tenantId, cognitoSub);
  if (!user) {
    throw new Error('User not found');
  }

  const updatedStatistics = {
    ...user.statistics,
    ...statisticsUpdates,
  };

  return updateTenantUser(tenantId, cognitoSub, { statistics: updatedStatistics });
}

/**
 * Check if user is enrolled in a course
 * @param tenantId - The tenant ID
 * @param cognitoSub - The Cognito user ID
 * @param courseId - The course ID
 */
export async function isEnrolledInCourse(
  tenantId: string,
  cognitoSub: string,
  courseId: string
): Promise<boolean> {
  const user = await getTenantUser(tenantId, cognitoSub);
  if (!user) {
    return false;
  }
  return (user.enrolledCourses || []).some(course => course.courseId === courseId);
}

/**
 * Count users in a tenant
 * @param tenantId - The tenant ID
 */
export async function countTenantUsers(tenantId: string): Promise<number> {
  console.log('[DBG][tenantUserRepository] Counting users for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'USER#',
      },
      Select: 'COUNT',
    })
  );

  const count = result.Count || 0;
  console.log('[DBG][tenantUserRepository] User count:', count);
  return count;
}

/**
 * Get users with a specific role in a tenant
 * @param tenantId - The tenant ID
 * @param role - The role to filter by
 */
export async function getTenantUsersByRole(
  tenantId: string,
  role: UserRole
): Promise<TenantUser[]> {
  console.log('[DBG][tenantUserRepository] Getting users with role:', role, 'in tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'contains(#role, :role)',
      ExpressionAttributeNames: {
        '#role': 'role',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'USER#',
        ':role': role,
      },
    })
  );

  const users = (result.Items || []).map(item => toTenantUser(item as DynamoDBTenantUserItem));
  console.log('[DBG][tenantUserRepository] Found', users.length, 'users with role:', role);
  return users;
}

/**
 * Delete all users for a tenant (for tenant deletion)
 * @param tenantId - The tenant ID
 * @returns Number of users deleted
 */
export async function deleteAllTenantUsers(tenantId: string): Promise<number> {
  console.log('[DBG][tenantUserRepository] Deleting all users for tenant:', tenantId);

  const users = await getTenantUsers(tenantId);

  if (users.length === 0) {
    console.log('[DBG][tenantUserRepository] No users to delete');
    return 0;
  }

  for (const user of users) {
    await deleteTenantUser(tenantId, user.cognitoSub);
  }

  console.log('[DBG][tenantUserRepository] Deleted', users.length, 'users');
  return users.length;
}
