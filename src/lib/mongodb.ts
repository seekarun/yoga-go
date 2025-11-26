import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase() {
  console.log('[DBG][mongodb] Attempting to connect to database');

  // Check for MONGODB_URI when function is called, not at module load
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // Ensure cached is defined
  if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
  }

  if (cached.conn) {
    console.log('[DBG][mongodb] Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('[DBG][mongodb] Creating new database connection');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(async mongoose => {
      console.log('[DBG][mongodb] Successfully connected to MongoDB');

      // Clean up legacy Auth0 index if it exists (one-time migration)
      try {
        const db = mongoose.connection.db;
        if (db) {
          const usersCollection = db.collection('users');
          const indexes = await usersCollection.indexes();
          const hasAuth0Index = indexes.some(idx => idx.name === 'auth0Id_1');

          if (hasAuth0Index) {
            console.log('[DBG][mongodb] Dropping legacy auth0Id_1 index...');
            await usersCollection.dropIndex('auth0Id_1');
            console.log('[DBG][mongodb] Successfully dropped legacy auth0Id_1 index');
          }
        }
      } catch (indexError) {
        // Ignore errors if index doesn't exist or already dropped
        console.log('[DBG][mongodb] Index cleanup note:', indexError);
      }

      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('[DBG][mongodb] Failed to connect to database:', e);
    throw e;
  }

  return cached.conn;
}

export async function disconnectFromDatabase() {
  if (cached?.conn) {
    console.log('[DBG][mongodb] Disconnecting from database');
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('[DBG][mongodb] Disconnected from database');
  }
}
