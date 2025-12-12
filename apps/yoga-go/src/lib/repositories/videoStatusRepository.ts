/**
 * Video Status Repository - Query and update video processing statuses
 *
 * Used by the cron job to check Cloudflare status for videos in 'processing' state
 */

import { getAllLessons, updateLesson } from './lessonRepository';
import { getAllCourses, updateCourse } from './courseRepository';
import { getAllExperts, updateExpert } from './expertRepository';
import type { Lesson, Course, Expert } from '@/types';

// Video status types
export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error';

// Processing video interface
export interface ProcessingVideo {
  entityType: 'lesson' | 'course' | 'expert';
  entityId: string;
  parentId?: string; // courseId for lessons
  videoId: string;
  status: VideoStatus;
}

// Status update interface
export interface VideoStatusUpdate {
  entityType: 'lesson' | 'course' | 'expert';
  entityId: string;
  parentId?: string;
  status: VideoStatus;
  duration?: number;
  errorReason?: string;
}

/**
 * Get all videos that are in 'uploading' or 'processing' status
 */
export async function getProcessingVideos(): Promise<{
  lessons: ProcessingVideo[];
  courses: ProcessingVideo[];
  experts: ProcessingVideo[];
}> {
  console.log('[DBG][videoStatusRepository] Getting all processing videos');

  const [allLessons, allCourses, allExperts] = await Promise.all([
    getAllLessons(),
    getAllCourses(),
    getAllExperts(),
  ]);

  // Filter lessons with processing videos
  const lessons: ProcessingVideo[] = allLessons
    .filter(
      (lesson): lesson is Lesson & { cloudflareVideoId: string; courseId: string } =>
        !!lesson.cloudflareVideoId &&
        (lesson.cloudflareVideoStatus === 'uploading' ||
          lesson.cloudflareVideoStatus === 'processing')
    )
    .map(lesson => ({
      entityType: 'lesson' as const,
      entityId: lesson.id,
      parentId: (lesson as unknown as { courseId: string }).courseId,
      videoId: lesson.cloudflareVideoId,
      status: lesson.cloudflareVideoStatus as VideoStatus,
    }));

  // Filter courses with processing promo videos
  const courses: ProcessingVideo[] = allCourses
    .filter(
      (course): course is Course & { promoVideoCloudflareId: string } =>
        !!course.promoVideoCloudflareId &&
        (course.promoVideoStatus === 'uploading' || course.promoVideoStatus === 'processing')
    )
    .map(course => ({
      entityType: 'course' as const,
      entityId: course.id,
      videoId: course.promoVideoCloudflareId,
      status: course.promoVideoStatus as VideoStatus,
    }));

  // Filter experts with processing promo videos
  const experts: ProcessingVideo[] = allExperts
    .filter(
      (expert): expert is Expert & { promoVideoCloudflareId: string } =>
        !!expert.promoVideoCloudflareId &&
        (expert.promoVideoStatus === 'uploading' || expert.promoVideoStatus === 'processing')
    )
    .map(expert => ({
      entityType: 'expert' as const,
      entityId: expert.id,
      videoId: expert.promoVideoCloudflareId,
      status: expert.promoVideoStatus as VideoStatus,
    }));

  console.log('[DBG][videoStatusRepository] Found processing videos:', {
    lessons: lessons.length,
    courses: courses.length,
    experts: experts.length,
  });

  return { lessons, courses, experts };
}

/**
 * Update video status for a specific entity
 */
export async function updateVideoStatus(update: VideoStatusUpdate): Promise<void> {
  console.log('[DBG][videoStatusRepository] Updating video status:', update);

  switch (update.entityType) {
    case 'lesson':
      if (!update.parentId) {
        throw new Error('parentId (courseId) is required for lesson updates');
      }
      await updateLesson(update.parentId, update.entityId, {
        cloudflareVideoStatus: update.status,
        ...(update.duration ? { duration: formatDuration(update.duration) } : {}),
      });
      break;

    case 'course':
      await updateCourse(update.entityId, {
        promoVideoStatus: update.status,
      });
      break;

    case 'expert':
      await updateExpert(update.entityId, {
        promoVideoStatus: update.status,
      });
      break;
  }
}

/**
 * Batch update video statuses
 */
export async function updateVideoStatuses(updates: VideoStatusUpdate[]): Promise<{
  success: number;
  failed: number;
}> {
  console.log('[DBG][videoStatusRepository] Batch updating', updates.length, 'video statuses');

  let success = 0;
  let failed = 0;

  for (const update of updates) {
    try {
      await updateVideoStatus(update);
      success++;
    } catch (error) {
      console.error('[DBG][videoStatusRepository] Failed to update status:', update, error);
      failed++;
    }
  }

  console.log('[DBG][videoStatusRepository] Batch update complete:', { success, failed });
  return { success, failed };
}

/**
 * Format duration from seconds to HH:MM:SS or MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get all videos (regardless of status) for syncing with client
 */
export async function getVideosByIds(videoIds: string[]): Promise<
  Array<{
    videoId: string;
    status: VideoStatus;
    entityType: 'lesson' | 'course' | 'expert';
    entityId: string;
  }>
> {
  console.log('[DBG][videoStatusRepository] Getting videos by IDs:', videoIds.length);

  const [allLessons, allCourses, allExperts] = await Promise.all([
    getAllLessons(),
    getAllCourses(),
    getAllExperts(),
  ]);

  const results: Array<{
    videoId: string;
    status: VideoStatus;
    entityType: 'lesson' | 'course' | 'expert';
    entityId: string;
  }> = [];

  // Check lessons
  for (const lesson of allLessons) {
    if (lesson.cloudflareVideoId && videoIds.includes(lesson.cloudflareVideoId)) {
      results.push({
        videoId: lesson.cloudflareVideoId,
        status: (lesson.cloudflareVideoStatus as VideoStatus) || 'processing',
        entityType: 'lesson',
        entityId: lesson.id,
      });
    }
  }

  // Check courses
  for (const course of allCourses) {
    if (course.promoVideoCloudflareId && videoIds.includes(course.promoVideoCloudflareId)) {
      results.push({
        videoId: course.promoVideoCloudflareId,
        status: (course.promoVideoStatus as VideoStatus) || 'processing',
        entityType: 'course',
        entityId: course.id,
      });
    }
  }

  // Check experts
  for (const expert of allExperts) {
    if (expert.promoVideoCloudflareId && videoIds.includes(expert.promoVideoCloudflareId)) {
      results.push({
        videoId: expert.promoVideoCloudflareId,
        status: (expert.promoVideoStatus as VideoStatus) || 'processing',
        entityType: 'expert',
        entityId: expert.id,
      });
    }
  }

  console.log('[DBG][videoStatusRepository] Found', results.length, 'matching videos');
  return results;
}
