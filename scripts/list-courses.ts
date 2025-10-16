/**
 * Script to list all courses in MongoDB
 * Run with: npx tsx scripts/list-courses.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase } from '../src/lib/mongodb';
import CourseModel from '../src/models/Course';

async function listCourses() {
  console.log('[DBG][list-courses] Fetching all courses from MongoDB...');

  try {
    await connectToDatabase();
    console.log('[DBG][list-courses] Connected to MongoDB');

    const courses = await CourseModel.find({}).select('_id title instructor').lean().exec();

    console.log(`\n[DBG][list-courses] Found ${courses.length} courses:\n`);

    courses.forEach(course => {
      console.log(`ID: ${course._id}`);
      console.log(`Title: ${(course as any).title}`);
      console.log(`Instructor:`, (course as any).instructor);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('[DBG][list-courses] Error:', error);
    process.exit(1);
  }
}

listCourses();
