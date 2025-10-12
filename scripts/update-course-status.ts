import dotenv from 'dotenv';
import { connectToDatabase } from '../src/lib/mongodb';
import CourseModel from '../src/models/Course';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function updateCourseStatus() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToDatabase();

    console.log('Updating existing courses to PUBLISHED status...');

    // Update all courses that don't have a status field to PUBLISHED
    const result = await CourseModel.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'PUBLISHED' } }
    );

    console.log(`✓ Updated ${result.modifiedCount} courses to PUBLISHED status`);

    // Also update any courses with null or undefined status
    const result2 = await CourseModel.updateMany(
      { status: null },
      { $set: { status: 'PUBLISHED' } }
    );

    console.log(`✓ Updated ${result2.modifiedCount} courses with null status to PUBLISHED`);

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

updateCourseStatus();
