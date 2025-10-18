/**
 * Script to inspect the unused 'lesson' collection
 * Run with: npx tsx scripts/check-lesson-collection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase } from '../src/lib/mongodb';
import mongoose from 'mongoose';

async function checkLessonCollection() {
  console.log('[DBG][check-lesson] Checking unused "lesson" collection...\n');

  try {
    await connectToDatabase();

    // Check the unused 'lesson' collection
    const lessonDocs = await mongoose.connection.db
      ?.collection('lesson')
      .find({})
      .limit(5)
      .toArray();

    console.log('📦 "lesson" collection (UNUSED - singular):');
    console.log(
      `   Documents: ${await mongoose.connection.db?.collection('lesson').countDocuments()}`
    );
    console.log('\n   Sample documents:');
    lessonDocs?.forEach((doc, i) => {
      console.log(`\n   ${i + 1}. ${doc.title || 'No title'}`);
      console.log(`      _id: ${doc._id}`);
      console.log(`      courseId: ${doc.courseId || 'N/A'}`);
      console.log(`      duration: ${doc.duration || 'N/A'}`);
    });

    console.log('\n\n---\n');

    // Check the active 'lessons' collection
    const lessonsDocs = await mongoose.connection.db
      ?.collection('lessons')
      .find({})
      .limit(5)
      .toArray();

    console.log('✅ "lessons" collection (ACTIVE - plural):');
    console.log(
      `   Documents: ${await mongoose.connection.db?.collection('lessons').countDocuments()}`
    );
    console.log('\n   Sample documents:');
    lessonsDocs?.forEach((doc, i) => {
      console.log(`\n   ${i + 1}. ${doc.title || 'No title'}`);
      console.log(`      _id: ${doc._id}`);
      console.log(`      courseId: ${doc.courseId || 'N/A'}`);
      console.log(`      duration: ${doc.duration || 'N/A'}`);
    });

    console.log('\n\n---\n');
    console.log('⚠️  RECOMMENDATION:');
    console.log('   The "lesson" collection is NOT used by the app.');
    console.log('   You can safely delete it if the data is not needed.');
    console.log('\n   To delete: Run "npx tsx scripts/delete-lesson-collection.ts"');

    process.exit(0);
  } catch (error) {
    console.error('[DBG][check-lesson] Error:', error);
    process.exit(1);
  }
}

checkLessonCollection();
