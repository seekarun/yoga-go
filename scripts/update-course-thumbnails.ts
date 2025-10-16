/**
 * Script to update instructor avatars for all courses in MongoDB
 * Run with: npx tsx scripts/update-course-thumbnails.ts
 *
 * NOTE: This script is no longer needed as the API now automatically
 * fetches instructor avatars from the Expert collection (Cloudflare URLs).
 * Keeping for reference in case manual updates are needed.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase } from '../src/lib/mongodb';
import CourseModel from '../src/models/Course';

// Map of instructor IDs to avatar paths
const instructorAvatars: Record<string, string> = {
  deepak: '/experts/ygo.deepak.png',
  kavitha: '/experts/ygo.kavitha.jpeg',
};

async function updateCourseThumbnails() {
  console.log('[DBG][update-avatars] Starting instructor avatar update for all courses...');

  try {
    await connectToDatabase();
    console.log('[DBG][update-avatars] Connected to MongoDB');

    // Fetch all courses
    const courses = await CourseModel.find({}).lean().exec();
    console.log(`[DBG][update-avatars] Found ${courses.length} courses`);

    let updatedCount = 0;

    for (const course of courses) {
      const courseId = (course as any)._id;
      const instructorId = (course as any).instructor?.id;

      if (!instructorId) {
        console.log(`[DBG][update-avatars] ⚠ Course ${courseId} has no instructor ID, skipping`);
        continue;
      }

      const avatarPath = instructorAvatars[instructorId];

      if (!avatarPath) {
        console.log(
          `[DBG][update-avatars] ⚠ No avatar found for instructor ${instructorId}, skipping`
        );
        continue;
      }

      // Check if avatar already set
      if ((course as any).instructor?.avatar === avatarPath) {
        console.log(`[DBG][update-avatars] ✓ Course ${courseId} already has correct avatar`);
        continue;
      }

      console.log(`[DBG][update-avatars] Updating course ${courseId}...`);

      const result = await CourseModel.updateOne(
        { _id: courseId },
        {
          $set: {
            'instructor.avatar': avatarPath,
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[DBG][update-avatars] ✓ Updated ${courseId} with avatar ${avatarPath}`);
        updatedCount++;
      }
    }

    console.log(`\n[DBG][update-avatars] Complete! Updated ${updatedCount} courses.`);
    process.exit(0);
  } catch (error) {
    console.error('[DBG][update-avatars] Error:', error);
    process.exit(1);
  }
}

updateCourseThumbnails();
