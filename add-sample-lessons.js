// Script to add sample lessons to courses
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
/* eslint-enable @typescript-eslint/no-require-imports */

async function addLessons() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Define schemas
    const CourseSchema = new mongoose.Schema({ _id: String }, { strict: false });
    const Course = mongoose.model('Course', CourseSchema, 'course');

    const LessonSchema = new mongoose.Schema({ _id: String, courseId: String }, { strict: false });
    const Lesson = mongoose.model('Lesson', LessonSchema, 'lesson');

    // Get all courses
    const courses = await Course.find({}).lean();
    console.log(`Found ${courses.length} courses\n`);

    for (const course of courses) {
      console.log(`Adding lessons to: ${course.title} (${course._id})`);

      // Create 3 sample lessons for each course
      const lessons = [];
      for (let i = 1; i <= 3; i++) {
        const lessonId = `${course._id}-lesson-${Date.now()}-${i}`;
        const lesson = {
          _id: lessonId,
          courseId: course._id,
          title: `Lesson ${i}: Introduction to ${course.title}`,
          duration: `${10 + i * 5} min`,
          description: `This is lesson ${i} covering the basics of ${course.title}.`,
          isFree: i === 1, // First lesson is free
          completed: false,
          locked: false,
          // Add placeholder for Cloudflare video
          cloudflareVideoId: '', // You can add real video IDs later
          cloudflareVideoStatus: '',
        };

        await Lesson.create(lesson);
        lessons.push(lessonId);
        console.log(`  ✓ Created: ${lesson.title}`);
      }

      // Update course with curriculum structure
      const curriculum = [
        {
          week: 1,
          title: 'Week 1: Getting Started',
          lessonIds: lessons,
        },
      ];

      await Course.updateOne(
        { _id: course._id },
        {
          $set: {
            curriculum: curriculum,
            totalLessons: lessons.length,
          },
        }
      );

      console.log(`  ✓ Updated course curriculum\n`);
    }

    await mongoose.connection.close();
    console.log('Done! All courses now have sample lessons.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addLessons();
