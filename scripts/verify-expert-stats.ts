/**
 * Verify expert statistics are calculated correctly
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import Expert from '../src/models/Expert';
import Course from '../src/models/Course';
import Payment from '../src/models/Payment';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

async function verifyExpertStats() {
  try {
    console.log('[DBG] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('[DBG] Connected to MongoDB\n');

    // Get all experts
    const experts = await Expert.find({}).lean();
    console.log(`=== Found ${experts.length} experts ===\n`);

    for (const expert of experts) {
      const expertId = expert._id as string;
      console.log(`Expert: ${expert.name} (${expertId})`);

      // Count published courses
      const totalCourses = await Course.countDocuments({
        'instructor.id': expertId,
        status: 'PUBLISHED',
      });

      // Get course IDs
      const expertCourses = await Course.find(
        {
          'instructor.id': expertId,
          status: 'PUBLISHED',
        },
        { _id: 1, title: 1 }
      ).lean();

      console.log(`  Published Courses: ${totalCourses}`);
      expertCourses.forEach(c => {
        console.log(`    - ${c.title} (${c._id})`);
      });

      const courseIds = expertCourses.map(c => c._id);

      // Count unique students
      const studentUserIds =
        courseIds.length > 0
          ? await Payment.distinct('userId', {
              courseId: { $in: courseIds },
              status: 'succeeded',
            })
          : [];

      console.log(`  Total Students (unique): ${studentUserIds.length}`);

      // Show breakdown by course
      for (const course of expertCourses) {
        const courseStudents = await Payment.distinct('userId', {
          courseId: course._id,
          status: 'succeeded',
        });
        console.log(`    - ${course.title}: ${courseStudents.length} students`);
      }

      console.log('');
    }

    // Overall stats
    console.log('\n=== Overall Stats ===');
    const totalPublishedCourses = await Course.countDocuments({ status: 'PUBLISHED' });
    const totalSuccessfulPayments = await Payment.countDocuments({ status: 'succeeded' });
    const totalUniqueStudents = (await Payment.distinct('userId', { status: 'succeeded' })).length;

    console.log(`Total Published Courses: ${totalPublishedCourses}`);
    console.log(`Total Successful Payments: ${totalSuccessfulPayments}`);
    console.log(`Total Unique Students: ${totalUniqueStudents}`);

    await mongoose.disconnect();
    console.log('\n[DBG] Disconnected from MongoDB');
  } catch (error) {
    console.error('[DBG] Error:', error);
    process.exit(1);
  }
}

verifyExpertStats();
