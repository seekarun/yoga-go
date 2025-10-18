/**
 * Script to list all collections in MongoDB
 * Run with: npx tsx scripts/list-collections.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase } from '../src/lib/mongodb';
import mongoose from 'mongoose';

async function listCollections() {
  console.log('[DBG][list-collections] Listing all collections in MongoDB...\n');

  try {
    await connectToDatabase();
    console.log('[DBG][list-collections] Connected to MongoDB\n');

    const collections = await mongoose.connection.db?.listCollections().toArray();

    if (!collections || collections.length === 0) {
      console.log('No collections found in database.');
      process.exit(0);
    }

    console.log(`Found ${collections.length} collections:\n`);

    for (const collection of collections) {
      const stats = await mongoose.connection.db?.collection(collection.name).countDocuments();

      console.log(`📦 ${collection.name}`);
      console.log(`   Documents: ${stats}`);
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('[DBG][list-collections] Error:', error);
    process.exit(1);
  }
}

listCollections();
