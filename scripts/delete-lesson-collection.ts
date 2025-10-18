/**
 * Script to DELETE the unused 'lesson' collection
 * Run with: npx tsx scripts/delete-lesson-collection.ts
 *
 * WARNING: This will permanently delete all data in the 'lesson' collection!
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase } from '../src/lib/mongodb';
import mongoose from 'mongoose';
import * as readline from 'readline';

async function deleteLessonCollection() {
  console.log('⚠️  WARNING: This will DELETE the entire "lesson" collection!\n');

  try {
    await connectToDatabase();

    const count = await mongoose.connection.db?.collection('lesson').countDocuments();
    console.log(`📦 "lesson" collection has ${count} documents\n`);

    // Prompt for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Are you sure you want to delete this collection? (yes/no): ', async answer => {
      if (answer.toLowerCase() === 'yes') {
        console.log('\n[DBG][delete-lesson] Deleting "lesson" collection...');

        await mongoose.connection.db?.collection('lesson').drop();

        console.log('✅ Successfully deleted "lesson" collection');
        console.log(`   Removed ${count} documents\n`);
      } else {
        console.log('\n❌ Deletion cancelled');
      }

      rl.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('[DBG][delete-lesson] Error:', error);
    process.exit(1);
  }
}

deleteLessonCollection();
