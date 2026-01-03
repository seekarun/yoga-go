/**
 * Firebase Client Configuration
 *
 * Provides Firebase Realtime Database client for real-time notifications.
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import type { DatabaseReference, Query } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !!firebaseConfig.databaseURL && !!firebaseConfig.projectId;

// Initialize Firebase (only once, only if configured)
let database: ReturnType<typeof getDatabase> | null = null;

if (isFirebaseConfigured && typeof window !== 'undefined') {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    database = getDatabase(app);
    console.log('[DBG][firebase] Firebase initialized successfully');
  } catch (error) {
    console.error('[DBG][firebase] Failed to initialize Firebase:', error);
  }
}

export { database, ref, onValue, off, query, orderByChild, limitToLast };
export type { DatabaseReference, Query };
