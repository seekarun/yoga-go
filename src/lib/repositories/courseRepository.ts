/**
 * Course Repository - DynamoDB Operations
 *
 * Single-table design:
 * - PK: "COURSE"
 * - SK: courseId
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EntityType } from '../dynamodb';
import type { Course, Instructor, Curriculum, CourseReview, CourseStatus } from '@/types';

// Type for DynamoDB Course item (includes PK/SK)
interface DynamoDBCourseItem extends Course {
  PK: string;
  SK: string;
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
 * Convert DynamoDB item to Course type (removes PK/SK)
 */
function toCourse(item: DynamoDBCourseItem): Course {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...course } = item;
  return course as Course;
}

/**
 * Get course by ID
 */
export async function getCourseById(courseId: string): Promise<Course | null> {
  console.log('[DBG][courseRepository] Getting course by id:', courseId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.COURSE,
        SK: courseId,
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
 * Get all courses
 */
export async function getAllCourses(): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting all courses');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EntityType.COURSE,
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'courses');
  return courses;
}

/**
 * Get courses by instructor ID
 */
export async function getCoursesByInstructorId(instructorId: string): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting courses by instructorId:', instructorId);

  // Query all courses and filter by instructor.id (no GSI)
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: '#instructor.#id = :instructorId',
      ExpressionAttributeNames: {
        '#instructor': 'instructor',
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.COURSE,
        ':instructorId': instructorId,
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'courses for instructor');
  return courses;
}

/**
 * Get published courses by instructor ID
 */
export async function getPublishedCoursesByInstructorId(instructorId: string): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting published courses by instructorId:', instructorId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: '#instructor.#id = :instructorId AND #status = :status',
      ExpressionAttributeNames: {
        '#instructor': 'instructor',
        '#id': 'id',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.COURSE,
        ':instructorId': instructorId,
        ':status': 'PUBLISHED',
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'published courses for instructor');
  return courses;
}

/**
 * Get featured courses
 */
export async function getFeaturedCourses(): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting featured courses');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'featured = :featured AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.COURSE,
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
 * Get courses by status
 */
export async function getCoursesByStatus(status: CourseStatus): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting courses by status:', status);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.COURSE,
        ':status': status,
      },
    })
  );

  const courses = (result.Items || []).map(item => toCourse(item as DynamoDBCourseItem));
  console.log('[DBG][courseRepository] Found', courses.length, 'courses with status', status);
  return courses;
}

/**
 * Get courses by category
 */
export async function getCoursesByCategory(category: string): Promise<Course[]> {
  console.log('[DBG][courseRepository] Getting courses by category:', category);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'category = :category AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.COURSE,
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
 */
export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const now = new Date().toISOString();

  console.log('[DBG][courseRepository] Creating course:', input.id, 'title:', input.title);

  const course: DynamoDBCourseItem = {
    PK: EntityType.COURSE,
    SK: input.id,
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
 */
export async function updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
  console.log('[DBG][courseRepository] Updating course:', courseId);

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
        PK: EntityType.COURSE,
        SK: courseId,
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
 */
export async function deleteCourse(courseId: string): Promise<void> {
  console.log('[DBG][courseRepository] Deleting course:', courseId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.COURSE,
        SK: courseId,
      },
    })
  );

  console.log('[DBG][courseRepository] Deleted course:', courseId);
}

/**
 * Update course status
 */
export async function updateCourseStatus(courseId: string, status: CourseStatus): Promise<Course> {
  console.log('[DBG][courseRepository] Updating course status:', courseId, status);
  return updateCourse(courseId, { status });
}

/**
 * Update course statistics (totalStudents, rating, totalRatings)
 */
export async function updateCourseStats(
  courseId: string,
  stats: { totalStudents?: number; rating?: number; totalRatings?: number }
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating course stats:', courseId, stats);
  return updateCourse(courseId, stats);
}

/**
 * Set course as featured
 */
export async function setFeatured(courseId: string, featured: boolean): Promise<Course> {
  console.log('[DBG][courseRepository] Setting course featured:', courseId, featured);
  return updateCourse(courseId, { featured });
}

/**
 * Add a review to a course
 */
export async function addReview(courseId: string, review: CourseReview): Promise<Course> {
  console.log('[DBG][courseRepository] Adding review to course:', courseId);

  // Get current course to append review
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const reviews = [...(course.reviews || []), review];

  // Calculate new average rating
  const totalRatings = reviews.length;
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

  return updateCourse(courseId, {
    reviews,
    rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalRatings,
  });
}

/**
 * Update a review in a course
 */
export async function updateReview(
  courseId: string,
  reviewId: string,
  updates: Partial<CourseReview>
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating review:', reviewId, 'in course:', courseId);

  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const reviews = (course.reviews || []).map(r => {
    if (r.id === reviewId) {
      return { ...r, ...updates, updatedAt: new Date().toISOString() };
    }
    return r;
  });

  return updateCourse(courseId, { reviews });
}

/**
 * Delete a review from a course
 */
export async function deleteReview(courseId: string, reviewId: string): Promise<Course> {
  console.log('[DBG][courseRepository] Deleting review:', reviewId, 'from course:', courseId);

  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const reviews = (course.reviews || []).filter(r => r.id !== reviewId);

  // Recalculate average rating
  const totalRatings = reviews.length;
  const averageRating =
    totalRatings > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0;

  return updateCourse(courseId, {
    reviews,
    rating: Math.round(averageRating * 10) / 10,
    totalRatings,
  });
}

/**
 * Update course curriculum
 */
export async function updateCurriculum(
  courseId: string,
  curriculum: Curriculum[]
): Promise<Course> {
  console.log('[DBG][courseRepository] Updating curriculum for course:', courseId);
  return updateCourse(courseId, { curriculum });
}

/**
 * Increment total students count
 */
export async function incrementTotalStudents(courseId: string): Promise<Course> {
  console.log('[DBG][courseRepository] Incrementing total students for course:', courseId);

  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  return updateCourse(courseId, { totalStudents: (course.totalStudents || 0) + 1 });
}

/**
 * Count courses by instructor ID
 */
export async function countCoursesByInstructorId(instructorId: string): Promise<number> {
  const courses = await getCoursesByInstructorId(instructorId);
  return courses.length;
}

/**
 * Count published courses by instructor ID
 */
export async function countPublishedCoursesByInstructorId(instructorId: string): Promise<number> {
  const courses = await getPublishedCoursesByInstructorId(instructorId);
  return courses.length;
}

/**
 * Get total students across all courses by instructor ID
 */
export async function getTotalStudentsByInstructorId(instructorId: string): Promise<number> {
  const courses = await getCoursesByInstructorId(instructorId);
  return courses.reduce((sum, course) => sum + (course.totalStudents || 0), 0);
}
