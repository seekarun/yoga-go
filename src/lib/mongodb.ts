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
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(mongoose => {
      console.log('[DBG][mongodb] Successfully connected to MongoDB');
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
