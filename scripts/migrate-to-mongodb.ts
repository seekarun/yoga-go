import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongodb';
import ExpertModel from '../src/models/Expert';
import CourseModel from '../src/models/Course';
import LessonModel from '../src/models/Lesson';
import { mockExperts, mockCourses, mockLessons } from '../src/data/mockData';

async function migrateData() {
  console.log('[DBG][migrate] Starting data migration to MongoDB...');

  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('[DBG][migrate] Connected to MongoDB');

    // Clear existing data
    console.log('[DBG][migrate] Clearing existing data...');
    await ExpertModel.deleteMany({});
    await CourseModel.deleteMany({});
    await LessonModel.deleteMany({});
    console.log('[DBG][migrate] ✓ Cleared existing data');

    // Migrate Experts
    console.log('[DBG][migrate] Migrating experts...');
    const experts = Object.values(mockExperts);
    for (const expert of experts) {
      const expertDoc = new ExpertModel({
        _id: expert.id,
        ...expert,
      });
      await expertDoc.save();
      console.log(`[DBG][migrate]   ✓ Added expert: ${expert.name}`);
    }
    console.log(`[DBG][migrate] ✓ Migrated ${experts.length} experts`);

    // Migrate Lessons
    console.log('[DBG][migrate] Migrating lessons...');
    let totalLessons = 0;
    for (const [courseId, lessons] of Object.entries(mockLessons)) {
      for (const lesson of lessons) {
        const lessonDoc = new LessonModel({
          _id: lesson.id,
          courseId,
          ...lesson,
        });
        await lessonDoc.save();
        totalLessons++;
      }
      console.log(`[DBG][migrate]   ✓ Added ${lessons.length} lessons for ${courseId}`);
    }
    console.log(`[DBG][migrate] ✓ Migrated ${totalLessons} lessons`);

    // Migrate Courses with lesson references
    console.log('[DBG][migrate] Migrating courses...');
    const courses = Object.values(mockCourses);
    for (const course of courses) {
      // Transform curriculum to use lesson IDs instead of full lesson objects
      const curriculumWithRefs = course.curriculum?.map(week => ({
        week: week.week,
        title: week.title,
        lessonIds: week.lessons.map(lesson => lesson.id),
      }));

      const courseDoc = new CourseModel({
        _id: course.id,
        ...course,
        curriculum: curriculumWithRefs,
      });
      await courseDoc.save();
      console.log(`[DBG][migrate]   ✓ Added course: ${course.title}`);
    }
    console.log(`[DBG][migrate] ✓ Migrated ${courses.length} courses`);

    // Verify data
    console.log('[DBG][migrate] Verifying migration...');
    const expertCount = await ExpertModel.countDocuments();
    const courseCount = await CourseModel.countDocuments();
    const lessonCount = await LessonModel.countDocuments();

    console.log('[DBG][migrate] ✓ Migration verification:');
    console.log(`[DBG][migrate]   - Experts: ${expertCount}`);
    console.log(`[DBG][migrate]   - Courses: ${courseCount}`);
    console.log(`[DBG][migrate]   - Lessons: ${lessonCount}`);

    console.log('[DBG][migrate] ✓ Data migration completed successfully!');
  } catch (error) {
    console.error('[DBG][migrate] ✗ Migration failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('[DBG][migrate] Migration script finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('[DBG][migrate] Migration script failed:', error);
    process.exit(1);
  });
