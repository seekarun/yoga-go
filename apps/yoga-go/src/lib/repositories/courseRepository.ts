/**
 * Course Repository - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "COURSE#{courseId}"
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK } from '../dynamodb';
import type {
  Course,
  Instructor,
  Curriculum,
  CourseReview,
  CourseStatus,
  SupportedCurrency,
} from '@/types';

// Type for DynamoDB Course item (includes PK/SK and GSI)
interface DynamoDBCourseItem extends Course {
  PK: string;
  SK: string;
  GSI1PK?: string; // COURSEID#{courseId} for cross-tenant lookup
  GSI1SK?: string;
}

// Type for creating a new course
export interface CreateCourseInput {
  id: string;
  title: string;
  description: string;
  instructor: Instructor;
  thumbnail: string;
  coverImage?: string;
  promoVideo?: string;
  promoVideoCloudflareId?: string;
  promoVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  level: string;
  duration: string;
  totalLessons: number;
  freeLessons: number;
  price: number;
  currency: SupportedCurrency; // Currency for the course price (expert's preferred currency)
  rating?: number;
  totalRatings?: number;
  totalStudents?: number;
  category: string;
  tags?: string[];
  featured?: boolean;
  isNew?: boolean;
  status?: CourseStatus;
  requirements?: string[];
  whatYouWillLearn?: string[];
  curriculum?: Curriculum[];
  reviews?: CourseReview[];
}

/**
 * Convert DynamoDB item to Course type (removes PK/SK/GSI attributes)
 */
function toCourse(item: DynamoDBCourseItem): Course {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, GSI1PK, GSI1SK, ...course } = item;
  return course as Course;
}

/**
 * Get course by ID
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 */
export async function getCourseById(tenantId: string, courseId: string): Promise<Course | null> {
  console.log('[DBG][courseRepository] Getting course by id:', courseId, 'for tenant:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.COURSE(courseId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][courseRepository] Course not found');
    return null;
  }

  console.log('[DBG][courseRepository] Found course:', courseId);
  return toCourse(result.Item as DynamoDBCourseItem);
}

/**
 * Get course by ID only (cross-tenant lookup using GSI1)
 * Used for public access when tenantId is not known
 * @param courseId - The course ID
 */
export async function getCourseByIdOnly(courseId: string): Promise<Course | null> {
  console.log('[DBG][courseRepository] Getting course by ID only (cross-tenant):', courseId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `COURSEID#${courseId}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][courseRepository] Course not found (cross-tenant):', courseId);
    return null;
  }

  console.log('[DBG][courseRepository] Found course (cross-tenant):', courseId);
  return toCourse(result.Items[0] as DynamoDBCourseItem);
}

/**
 * Get all courses for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function getTenantCourses(tenantId: string): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting all courses for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'COURSE#',
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'courses');
  return courses;
}

/**
 * Get published courses for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function getPublishedTenantCourses(tenantId: string): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting published courses for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'COURSE#',
        ':status': 'PUBLISHED',
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'published courses');
  return courses;
}

/**
 * Get featured courses for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function getFeaturedTenantCourses(tenantId: string): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting featured courses for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'featured = :featured AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'COURSE#',
        ':featured': true,
        ':status': 'PUBLISHED',
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'featured courses');
  return courses;
}

/**
 * Get courses by status for a tenant
 * @param tenantId - The tenant ID (expertId)
 * @param status - Course status to filter by
 */
export async function getTenantCoursesByStatus(
  tenantId: string,
  status: CourseStatus
): Promise<Course[]> {
  console.log(
    '[DBG][courseRepository] Getting courses by status:',
    status,
    'for tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'COURSE#',
        ':status': status,
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'courses with status', status);
  return courses;
}

/**
 * Get courses by category for a tenant
 * @param tenantId - The tenant ID (expertId)
 * @param category - Category to filter by
 */
export async function getTenantCoursesByCategory(
  tenantId: string,
  category: string
): Promise<Course[]> {
  console.log(
    '[DBG][courseRepository] Getting courses by category:',
    category,
    'for tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'category = :category AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'COURSE#',
        ':category': category,
        ':status': 'PUBLISHED',
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'courses in category');
  return courses;
}

/**
 * Create a new course in DynamoDB
 * @param tenantId - The tenant ID (expertId)
 * @param input - Course creation input
 */
export async function createCourse(tenantId: string, input: CreateCourseInput): Promise<Course> {
  const now = new Date().toISOString();

  console.log('[DBG][courseRepository] Creating course:', input.id, 'for tenant:', tenantId);

  const course: DynamoDBCourseItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.COURSE(input.id),
    // GSI1 for cross-tenant lookup by courseId
    GSI1PK: `COURSEID#${input.id}`,
    GSI1SK: 'COURSE',
    id: input.id,
    title: input.title,
    description: input.description,
    instructor: input.instructor,
    thumbnail: input.thumbnail,
    coverImage: input.coverImage,
    promoVideo: input.promoVideo,
    promoVideoCloudflareId: input.promoVideoCloudflareId,
    promoVideoStatus: input.promoVideoStatus,
    level: input.level as Course['level'],
    duration: input.duration,
    totalLessons: input.totalLessons,
    freeLessons: input.freeLessons,
    price: input.price,
    currency: input.currency,
    rating: input.rating ?? 0,
    totalRatings: input.totalRatings ?? 0,
    totalStudents: input.totalStudents ?? 0,
    category: input.category as Course['category'],
    tags: input.tags ?? [],
    featured: input.featured ?? false,
    isNew: input.isNew ?? true,
    status: input.status ?? 'IN_PROGRESS',
    requirements: input.requirements ?? [],
    whatYouWillLearn: input.whatYouWillLearn ?? [],
    curriculum: input.curriculum ?? [],
    reviews: input.reviews ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: course,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting
    })
  );

  console.log('[DBG][courseRepository] Created course:', input.id);
  return toCourse(course);
}

/**
 * Update course - partial update using UpdateCommand
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param updates - Partial course updates
 */
export async function updateCourse(
  tenantId: string,
  courseId: string,
  updates: Partial<Course>
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating course:', courseId, 'for tenant:', tenantId);

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
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.COURSE(courseId),
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][courseRepository] Updated course:', courseId);
  return toCourse(result.Attributes as DynamoDBCourseItem);
}

/**
 * Delete course
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 */
export async function deleteCourse(tenantId: string, courseId: string): Promise<void> {
  console.log('[DBG][courseRepository] Deleting course:', courseId, 'for tenant:', tenantId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.COURSE(courseId),
      },
    })
  );

  console.log('[DBG][courseRepository] Deleted course:', courseId);
}

/**
 * Update course status
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param status - New status
 */
export async function updateCourseStatus(
  tenantId: string,
  courseId: string,
  status: CourseStatus
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating course status:', courseId, status);
  return updateCourse(tenantId, courseId, { status });
}

/**
 * Update course statistics (totalStudents, rating, totalRatings)
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param stats - Stats to update
 */
export async function updateCourseStats(
  tenantId: string,
  courseId: string,
  stats: { totalStudents?: number; rating?: number; totalRatings?: number }
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating course stats:', courseId, stats);
  return updateCourse(tenantId, courseId, stats);
}

/**
 * Set course as featured
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param featured - Featured flag
 */
export async function setFeatured(
  tenantId: string,
  courseId: string,
  featured: boolean
): Promise<Course> {
  console.log('[DBG][courseRepository] Setting course featured:', courseId, featured);
  return updateCourse(tenantId, courseId, { featured });
}

/**
 * Add a review to a course
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param review - Review to add
 */
export async function addReview(
  tenantId: string,
  courseId: string,
  review: CourseReview
): Promise<Course> {
  console.log('[DBG][courseRepository] Adding review to course:', courseId);

  // Get current course to append review
  const course = await getCourseById(tenantId, courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const reviews = [...(course.reviews || []), review];

  // Calculate new average rating
  const totalRatings = reviews.length;
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

  return updateCourse(tenantId, courseId, {
    reviews,
    rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalRatings,
  });
}

/**
 * Update a review in a course
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param reviewId - Review ID
 * @param updates - Review updates
 */
export async function updateReview(
  tenantId: string,
  courseId: string,
  reviewId: string,
  updates: Partial<CourseReview>
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating review:', reviewId, 'in course:', courseId);

  const course = await getCourseById(tenantId, courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const reviews = (course.reviews || []).map(r => {
    if (r.id === reviewId) {
      return { ...r, ...updates, updatedAt: new Date().toISOString() };
    }
    return r;
  });

  return updateCourse(tenantId, courseId, { reviews });
}

/**
 * Delete a review from a course
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param reviewId - Review ID to delete
 */
export async function deleteReview(
  tenantId: string,
  courseId: string,
  reviewId: string
): Promise<Course> {
  console.log('[DBG][courseRepository] Deleting review:', reviewId, 'from course:', courseId);

  const course = await getCourseById(tenantId, courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const reviews = (course.reviews || []).filter(r => r.id !== reviewId);

  // Recalculate average rating
  const totalRatings = reviews.length;
  const averageRating =
    totalRatings > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0;

  return updateCourse(tenantId, courseId, {
    reviews,
    rating: Math.round(averageRating * 10) / 10,
    totalRatings,
  });
}

/**
 * Update course curriculum
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param curriculum - New curriculum
 */
export async function updateCurriculum(
  tenantId: string,
  courseId: string,
  curriculum: Curriculum[]
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating curriculum for course:', courseId);
  return updateCourse(tenantId, courseId, { curriculum });
}

/**
 * Increment total students count
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 */
export async function incrementTotalStudents(tenantId: string, courseId: string): Promise<Course> {
  console.log('[DBG][courseRepository] Incrementing total students for course:', courseId);

  const course = await getCourseById(tenantId, courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  return updateCourse(tenantId, courseId, { totalStudents: (course.totalStudents || 0) + 1 });
}

/**
 * Count courses for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function countTenantCourses(tenantId: string): Promise<number> {
  const courses = await getTenantCourses(tenantId);
  return courses.length;
}

/**
 * Count published courses for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function countPublishedTenantCourses(tenantId: string): Promise<number> {
  const courses = await getPublishedTenantCourses(tenantId);
  return courses.length;
}

/**
 * Get total students across all courses for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function getTotalStudents(tenantId: string): Promise<number> {
  const courses = await getTenantCourses(tenantId);
  return courses.reduce((sum, course) => sum + (course.totalStudents || 0), 0);
}

// ===================================================================
// BACKWARD COMPATIBILITY ALIASES
// These maintain the old API signatures during migration
// ===================================================================

/** @deprecated Use getCourseById(tenantId, courseId) instead */
export async function getAllCourses(): Promise<Course[]> {
  console.warn(
    '[DBG][courseRepository] getAllCourses() is deprecated - use getTenantCourses(tenantId)'
  );
  return [];
}

/** @deprecated Use getTenantCourses(tenantId) instead */
export async function getCoursesByInstructorId(instructorId: string): Promise<Course[]> {
  console.log('[DBG][courseRepository] getCoursesByInstructorId - using as getTenantCourses');
  return getTenantCourses(instructorId);
}

/** @deprecated Use getPublishedTenantCourses(tenantId) instead */
export async function getPublishedCoursesByInstructorId(instructorId: string): Promise<Course[]> {
  console.log(
    '[DBG][courseRepository] getPublishedCoursesByInstructorId - using as getPublishedTenantCourses'
  );
  return getPublishedTenantCourses(instructorId);
}

/** @deprecated Use getFeaturedTenantCourses(tenantId) instead */
export async function getFeaturedCourses(): Promise<Course[]> {
  console.warn(
    '[DBG][courseRepository] getFeaturedCourses() is deprecated - use getFeaturedTenantCourses(tenantId)'
  );
  return [];
}

/** @deprecated Use countTenantCourses(tenantId) instead */
export async function countCoursesByInstructorId(instructorId: string): Promise<number> {
  return countTenantCourses(instructorId);
}

/** @deprecated Use countPublishedTenantCourses(tenantId) instead */
export async function countPublishedCoursesByInstructorId(instructorId: string): Promise<number> {
  return countPublishedTenantCourses(instructorId);
}

/** @deprecated Use getTotalStudents(tenantId) instead */
export async function getTotalStudentsByInstructorId(instructorId: string): Promise<number> {
  return getTotalStudents(instructorId);
}

/** @deprecated Use getTenantCoursesByStatus(tenantId, status) instead */
export async function getCoursesByStatus(status: CourseStatus): Promise<Course[]> {
  console.warn(
    '[DBG][courseRepository] getCoursesByStatus() is deprecated - use getTenantCoursesByStatus(tenantId, status)'
  );
  return [];
}

/** @deprecated Use getTenantCoursesByCategory(tenantId, category) instead */
export async function getCoursesByCategory(category: string): Promise<Course[]> {
  console.warn(
    '[DBG][courseRepository] getCoursesByCategory() is deprecated - use getTenantCoursesByCategory(tenantId, category)'
  );
  return [];
}
