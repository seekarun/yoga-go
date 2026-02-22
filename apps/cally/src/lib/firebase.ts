/**
 * Firebase Client Configuration for Cally
 *
 * Provides Firebase Realtime Database and Auth clients.
 * Auth is used to sign in with custom tokens so RTDB security
 * rules can enforce per-tenant access (auth.uid === tenantId).
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import type { DatabaseReference, Query } from "firebase/database";
import type { Auth } from "firebase/auth";

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
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.databaseURL &&
  !!firebaseConfig.projectId;

// Initialize Firebase (only once, only if configured)
let database: ReturnType<typeof getDatabase> | null = null;
let firebaseAuth: Auth | null = null;

if (typeof window !== "undefined") {
  console.log(
    "[DBG][firebase] Config check - apiKey:",
    !!firebaseConfig.apiKey,
    "databaseURL:",
    !!firebaseConfig.databaseURL,
    "projectId:",
    !!firebaseConfig.projectId,
  );
  console.log("[DBG][firebase] isFirebaseConfigured:", isFirebaseConfigured);

  if (isFirebaseConfigured) {
    try {
      const app =
        getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      database = getDatabase(app);
      firebaseAuth = getAuth(app);
      console.log("[DBG][firebase] Firebase initialized successfully");
    } catch (error) {
      console.error("[DBG][firebase] Failed to initialize Firebase:", error);
    }
  }
}

export {
  database,
  firebaseAuth,
  ref,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  signInWithCustomToken,
  onAuthStateChanged,
};
export type { DatabaseReference, Query };
