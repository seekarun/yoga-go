/**
 * Firebase Admin SDK (server-side only)
 *
 * Used to mint custom tokens for client-side Firebase Auth.
 * Clients sign in with these tokens so RTDB security rules
 * can enforce auth.uid === $tenantId.
 *
 * Env var: FIREBASE_SERVICE_ACCOUNT — JSON string of the service account key
 * Env var: FIREBASE_DATABASE_URL — RTDB URL
 */

import * as admin from "firebase-admin";

let initialized = false;

function getFirebaseAdmin(): admin.app.App | null {
  if (initialized) {
    return admin.apps.length > 0 ? admin.apps[0]! : null;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!serviceAccountJson) {
    console.error(
      "[DBG][firebase-admin] FIREBASE_SERVICE_ACCOUNT env var not set",
    );
    return null;
  }

  try {
    const serviceAccount =
      typeof serviceAccountJson === "string"
        ? JSON.parse(serviceAccountJson)
        : serviceAccountJson;

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });

    initialized = true;
    console.log("[DBG][firebase-admin] Initialized successfully");
    return app;
  } catch (error) {
    console.error("[DBG][firebase-admin] Initialization failed:", error);
    initialized = true; // prevent retries
    return null;
  }
}

/**
 * Create a Firebase custom token for the given tenant ID.
 * The token is short-lived (1 hour by default) and allows
 * the client to sign into Firebase Auth with uid = tenantId.
 */
export async function createFirebaseCustomToken(
  tenantId: string,
): Promise<string | null> {
  const app = getFirebaseAdmin();
  if (!app) {
    console.error(
      "[DBG][firebase-admin] Cannot create token - admin not initialized",
    );
    return null;
  }

  try {
    const token = await admin.auth().createCustomToken(tenantId);
    return token;
  } catch (error) {
    console.error("[DBG][firebase-admin] Error creating custom token:", error);
    return null;
  }
}
