/**
 * Backfill Payment records from existing user enrollments
 * Run this script to create Payment records for users who enrolled before the Payment tracking system was implemented
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import User from '../src/models/User';
import Payment from '../src/models/Payment';
import { nanoid } from 'nanoid';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

async function backfillPayments() {
  try {
    console.log('[DBG] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('[DBG] Connected to MongoDB');

    // Get all users with enrolled courses
    const users = await User.find({ 'enrolledCourses.0': { $exists: true } }).lean();
    console.log(`[DBG] Found ${users.length} users with enrollments`);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      const userId = user._id as string;

      for (const enrollment of user.enrolledCourses || []) {
        const courseId = enrollment.courseId;

        // Check if payment record already exists
        const existingPayment = await Payment.findOne({
          userId,
          courseId,
          status: 'succeeded',
        });

        if (existingPayment) {
          console.log(
            `[DBG] Skipping - Payment already exists for user ${userId}, course ${courseId}`
          );
          skipped++;
          continue;
        }

        // Create payment record
        const paymentId = nanoid();
        const enrolledDate = enrollment.enrolledAt
          ? new Date(enrollment.enrolledAt)
          : new Date(user.createdAt || Date.now());

        const payment = new Payment({
          _id: paymentId,
          userId,
          courseId,
          itemType: 'course_enrollment',
          itemId: courseId,
          amount: 0, // We don't have historical price data
          currency: 'USD',
          gateway: 'stripe', // Assume stripe for backfill
          status: 'succeeded',
          paymentIntentId: `backfill_${paymentId}`,
          initiatedAt: enrolledDate,
          completedAt: enrolledDate,
          metadata: {
            backfilled: true,
            backfilledAt: new Date().toISOString(),
          },
        });

        await payment.save();
        console.log(`[DBG] Created payment record for user ${userId}, course ${courseId}`);
        created++;
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Payment records created: ${created}`);
    console.log(`Payment records skipped (already exist): ${skipped}`);

    // Verify results
    const totalPayments = await Payment.countDocuments({});
    const successfulPayments = await Payment.countDocuments({ status: 'succeeded' });
    console.log(`\nTotal payments in database: ${totalPayments}`);
    console.log(`Successful payments: ${successfulPayments}`);

    await mongoose.disconnect();
    console.log('\n[DBG] Disconnected from MongoDB');
  } catch (error) {
    console.error('[DBG] Error:', error);
    process.exit(1);
  }
}

backfillPayments();
