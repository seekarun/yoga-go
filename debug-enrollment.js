// Debug script to check enrollment data
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
/* eslint-enable @typescript-eslint/no-require-imports */

async function debug() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Get User model
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // Get Course model - try both collection names
    const CourseSchema = new mongoose.Schema({ _id: String }, { strict: false });
    const Course = mongoose.model('Course', CourseSchema, 'course');

    // Find user with achievements (the one who enrolled)
    const users = await User.find({
      'achievements.0': { $exists: true },
    }).lean();

    console.log(`Found ${users.length} users with achievements\n`);

    for (const user of users) {
      console.log('='.repeat(60));
      console.log(`User: ${user.profile?.name} (${user._id})`);
      console.log(`Auth0 ID: ${user.auth0Id}`);
      console.log(`Achievements: ${user.achievements?.length || 0}`);
      console.log(`Enrolled Courses: ${user.enrolledCourses?.length || 0}`);

      if (user.enrolledCourses && user.enrolledCourses.length > 0) {
        console.log('\nEnrolled Course IDs:');
        for (const ec of user.enrolledCourses) {
          console.log(`  - ${ec.courseId} (${ec.title})`);

          // Check if course exists in MongoDB
          const course = await Course.findOne({ _id: ec.courseId }).lean();
          if (course) {
            console.log(`    ✓ Course found in MongoDB: ${course.title}`);
          } else {
            console.log(`    ✗ Course NOT found in MongoDB`);
          }
        }
      }

      if (user.achievements && user.achievements.length > 0) {
        console.log('\nAchievements:');
        for (const ach of user.achievements) {
          console.log(`  - ${ach.title}: ${ach.description}`);
        }
      }
      console.log('='.repeat(60) + '\n');
    }

    // Get Lesson model
    const LessonSchema = new mongoose.Schema({ _id: String, courseId: String }, { strict: false });
    const Lesson = mongoose.model('Lesson', LessonSchema, 'lesson');

    // List all courses in MongoDB
    const courses = await Course.find({}).lean();
    console.log(`\nTotal courses in MongoDB: ${courses.length}`);
    if (courses.length > 0) {
      console.log('\nCourse IDs in MongoDB:');
      for (const course of courses) {
        console.log(`  - ${course._id} (${course.title}) - Status: ${course.status}`);
        console.log(`    Curriculum weeks: ${course.curriculum?.length || 0}`);

        if (course.curriculum && course.curriculum.length > 0) {
          for (const week of course.curriculum) {
            console.log(
              `    Week ${week.week}: ${week.title} - ${week.lessonIds?.length || 0} lesson IDs`
            );
          }
        }

        // Count actual lessons
        const lessonCount = await Lesson.countDocuments({ courseId: course._id });
        console.log(`    Actual lessons in DB: ${lessonCount}`);

        if (lessonCount > 0) {
          const lessons = await Lesson.find({ courseId: course._id }).lean();
          console.log(`    Lesson details:`);
          for (const lesson of lessons) {
            console.log(`      - ${lesson._id}: ${lesson.title}`);
            console.log(`        Video: ${lesson.cloudflareVideoId || lesson.videoUrl || 'none'}`);
            console.log(`        Status: ${lesson.cloudflareVideoStatus || 'n/a'}`);
          }
        }
      }
    }

    // Check for ALL lessons in database
    console.log('\n' + '='.repeat(60));
    const allLessons = await Lesson.find({}).lean();
    console.log(`\nTotal lessons in database: ${allLessons.length}`);

    if (allLessons.length > 0) {
      console.log('\nAll lessons:');
      for (const lesson of allLessons) {
        console.log(`  - ${lesson._id}`);
        console.log(`    Course: ${lesson.courseId}`);
        console.log(`    Title: ${lesson.title}`);
        console.log(`    Video: ${lesson.cloudflareVideoId || lesson.videoUrl || 'none'}`);
        console.log(`    Status: ${lesson.cloudflareVideoStatus || 'n/a'}`);
      }
    }

    await mongoose.connection.close();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debug();
