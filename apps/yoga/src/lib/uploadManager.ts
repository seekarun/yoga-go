/**
 * Upload Manager - IndexedDB-based upload tracking
 *
 * Tracks video uploads across browser sessions using IndexedDB.
 * Allows uploads to continue even when user navigates away.
 */

export interface PendingUpload {
  id: string; // Unique upload ID
  entityType: 'lesson' | 'course' | 'expert' | 'landing';
  entityId: string; // courseId, lessonId, expertId
  parentId?: string; // courseId for lessons
  cloudflareVideoId: string; // Video UID from Cloudflare
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number; // 0-100
  fileName: string;
  fileSize: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

const DB_NAME = 'yoga-go-uploads';
const DB_VERSION = 1;
const STORE_NAME = 'pending-uploads';

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initUploadDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[DBG][uploadManager] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[DBG][uploadManager] IndexedDB opened successfully');
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = event => {
      console.log('[DBG][uploadManager] Upgrading IndexedDB schema');
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('entityType', 'entityType', { unique: false });
        store.createIndex('entityId', 'entityId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('cloudflareVideoId', 'cloudflareVideoId', { unique: false });
      }
    };
  });
}

/**
 * Get the database instance, initializing if needed
 */
async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    return initUploadDB();
  }
  return dbInstance;
}

/**
 * Add a new pending upload to the database
 */
export async function addPendingUpload(upload: PendingUpload): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(upload);

    request.onerror = () => {
      console.error('[DBG][uploadManager] Failed to add upload:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[DBG][uploadManager] Upload added:', upload.id);
      resolve();
    };
  });
}

/**
 * Update upload progress
 */
export async function updateUploadProgress(id: string, progress: number): Promise<void> {
  const db = await getDB();
  const upload = await getUploadById(id);

  if (!upload) {
    console.warn('[DBG][uploadManager] Upload not found for progress update:', id);
    return;
  }

  upload.progress = progress;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(upload);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update upload status
 */
export async function updateUploadStatus(
  id: string,
  status: PendingUpload['status'],
  error?: string
): Promise<void> {
  const db = await getDB();
  const upload = await getUploadById(id);

  if (!upload) {
    console.warn('[DBG][uploadManager] Upload not found for status update:', id);
    return;
  }

  upload.status = status;
  if (error) {
    upload.error = error;
  }
  if (status === 'ready' || status === 'error') {
    upload.completedAt = new Date().toISOString();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(upload);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get upload by ID
 */
export async function getUploadById(id: string): Promise<PendingUpload | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get all pending uploads
 */
export async function getPendingUploads(): Promise<PendingUpload[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get uploads by entity type and ID
 */
export async function getUploadsByEntity(
  entityType: PendingUpload['entityType'],
  entityId: string
): Promise<PendingUpload[]> {
  const uploads = await getPendingUploads();
  return uploads.filter(u => u.entityType === entityType && u.entityId === entityId);
}

/**
 * Get uploads by status
 */
export async function getUploadsByStatus(
  status: PendingUpload['status']
): Promise<PendingUpload[]> {
  const uploads = await getPendingUploads();
  return uploads.filter(u => u.status === status);
}

/**
 * Get upload by Cloudflare video ID
 */
export async function getUploadByVideoId(cloudflareVideoId: string): Promise<PendingUpload | null> {
  const uploads = await getPendingUploads();
  return uploads.find(u => u.cloudflareVideoId === cloudflareVideoId) || null;
}

/**
 * Remove a pending upload from the database
 */
export async function removePendingUpload(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      console.error('[DBG][uploadManager] Failed to remove upload:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[DBG][uploadManager] Upload removed:', id);
      resolve();
    };
  });
}

/**
 * Clear all uploads from the database
 */
export async function clearAllUploads(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('[DBG][uploadManager] All uploads cleared');
      resolve();
    };
  });
}

/**
 * Generate a unique upload ID
 */
export function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
