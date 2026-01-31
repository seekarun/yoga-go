/**
 * 100ms Meeting/Room Management
 *
 * Handles room creation and management via 100ms API
 * Rooms are created for each webinar session
 */

import { generateManagementToken, getDefaultTemplateId, is100msConfigured } from './100ms-auth';
import * as webinarRepository from './repositories/webinarRepository';

// 100ms API base URL
const HMS_API_BASE = 'https://api.100ms.live/v2';

interface CreateRoomParams {
  name: string; // Room name (visible in dashboard)
  description?: string;
  templateId?: string; // Defaults to HMS_TEMPLATE_ID
}

interface HmsRoom {
  id: string;
  name: string;
  description?: string;
  template_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateHmsRoomResult {
  roomId: string;
  templateId: string;
}

/**
 * Create a 100ms room via API
 */
export async function createHmsRoom(params: CreateRoomParams): Promise<CreateHmsRoomResult> {
  console.log('[DBG][100ms-meeting] Creating room:', params.name);

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const managementToken = await generateManagementToken();
  const templateId = params.templateId || getDefaultTemplateId();

  const response = await fetch(`${HMS_API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${managementToken}`,
    },
    body: JSON.stringify({
      name: params.name,
      description: params.description || '',
      template_id: templateId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DBG][100ms-meeting] Failed to create room:', errorText);
    throw new Error(`Failed to create 100ms room: ${errorText}`);
  }

  const room: HmsRoom = await response.json();
  console.log('[DBG][100ms-meeting] Room created:', room.id);

  return {
    roomId: room.id,
    templateId: room.template_id,
  };
}

/**
 * Create a 100ms room for a single webinar session
 *
 * @param expertId - Expert ID (for naming)
 * @param webinarId - Webinar ID
 * @param sessionId - Session ID
 * @param title - Session title (for room name)
 */
export async function createHmsRoomForSession(
  expertId: string,
  webinarId: string,
  sessionId: string,
  title: string
): Promise<CreateHmsRoomResult> {
  const roomName = `${expertId}-${webinarId}-${sessionId}`.slice(0, 100); // Max 100 chars

  const result = await createHmsRoom({
    name: roomName,
    description: title,
  });

  return result;
}

/**
 * Create 100ms rooms for all sessions of a webinar
 * Called when webinar is published
 *
 * @param expertId - Expert ID
 * @param webinarId - Webinar ID
 */
export async function createHmsRoomsForWebinar(
  expertId: string,
  webinarId: string
): Promise<CreateHmsRoomResult[]> {
  console.log('[DBG][100ms-meeting] Creating rooms for webinar:', webinarId);

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const results: CreateHmsRoomResult[] = [];

  for (const session of webinar.sessions) {
    // Skip if session already has a room
    if (session.hmsRoomId) {
      console.log('[DBG][100ms-meeting] Session already has room:', session.id);
      results.push({
        roomId: session.hmsRoomId,
        templateId: session.hmsTemplateId || getDefaultTemplateId(),
      });
      continue;
    }

    try {
      const result = await createHmsRoomForSession(expertId, webinarId, session.id, session.title);

      // Update session with room info
      await webinarRepository.updateSession(expertId, webinarId, session.id, {
        hmsRoomId: result.roomId,
        hmsTemplateId: result.templateId,
      });

      results.push(result);
      console.log('[DBG][100ms-meeting] Created room for session:', session.id, result.roomId);
    } catch (error) {
      console.error('[DBG][100ms-meeting] Failed to create room for session:', session.id, error);
      // Continue with other sessions
    }
  }

  console.log('[DBG][100ms-meeting] Created', results.length, 'rooms for webinar');
  return results;
}

/**
 * Get room details from 100ms API
 */
export async function getHmsRoom(roomId: string): Promise<HmsRoom | null> {
  console.log('[DBG][100ms-meeting] Getting room:', roomId);

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const managementToken = await generateManagementToken();

  const response = await fetch(`${HMS_API_BASE}/rooms/${roomId}`, {
    headers: {
      Authorization: `Bearer ${managementToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    console.error('[DBG][100ms-meeting] Failed to get room:', errorText);
    throw new Error(`Failed to get 100ms room: ${errorText}`);
  }

  return response.json();
}

/**
 * Check if room exists and is enabled
 */
export async function isRoomReady(roomId: string): Promise<boolean> {
  try {
    const room = await getHmsRoom(roomId);
    return room !== null && room.enabled;
  } catch {
    return false;
  }
}

// ========================================
// Recording Management
// ========================================

export interface HmsRecordingAsset {
  id: string;
  job_id: string;
  room_id: string;
  session_id: string;
  type: 'room-composite' | 'room-vod' | 'chat' | 'transcript' | 'summary';
  path: string;
  size: number;
  duration: number;
  created_at: string;
  status: 'completed' | 'failed';
  presigned_url?: string;
  thumbnails?: string[];
  metadata?: {
    resolution?: { width: number; height: number };
    num_layers?: number;
  };
}

export interface HmsRecordingAssetsResponse {
  data: HmsRecordingAsset[];
  limit: number;
  total: number;
  last?: string;
}

export interface HmsSession {
  id: string;
  room_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  peers?: {
    joined: number;
    left: number;
  };
}

export interface HmsSessionsResponse {
  data: HmsSession[];
  limit: number;
  last?: string;
}

/**
 * Get all recording assets from 100ms
 * Can filter by room_id to get recordings for a specific room
 */
export async function getHmsRecordings(
  roomId?: string,
  limit = 20,
  start?: string
): Promise<HmsRecordingAssetsResponse> {
  console.log('[DBG][100ms-meeting] Fetching recordings', roomId ? `for room: ${roomId}` : '');

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const managementToken = await generateManagementToken();

  const params = new URLSearchParams();
  if (roomId) params.set('room_id', roomId);
  params.set('limit', String(limit));
  if (start) params.set('start', start);
  // Only get completed video recordings
  params.set('status', 'completed');
  params.set('type', 'room-composite');

  const response = await fetch(`${HMS_API_BASE}/recording-assets?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${managementToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DBG][100ms-meeting] Failed to fetch recordings:', errorText);
    throw new Error(`Failed to fetch 100ms recordings: ${errorText}`);
  }

  const data: HmsRecordingAssetsResponse = await response.json();
  console.log('[DBG][100ms-meeting] Fetched', data.data?.length || 0, 'recordings');

  return data;
}

/**
 * Get a single recording asset with presigned URL for playback
 */
export async function getHmsRecordingAsset(assetId: string): Promise<HmsRecordingAsset | null> {
  console.log('[DBG][100ms-meeting] Getting recording asset:', assetId);

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const managementToken = await generateManagementToken();

  const response = await fetch(`${HMS_API_BASE}/recording-assets/${assetId}`, {
    headers: {
      Authorization: `Bearer ${managementToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    console.error('[DBG][100ms-meeting] Failed to get recording:', errorText);
    throw new Error(`Failed to get 100ms recording: ${errorText}`);
  }

  return response.json();
}

/**
 * Get presigned URL for a recording asset (valid for limited time)
 */
export async function getHmsRecordingPresignedUrl(assetId: string): Promise<string | null> {
  console.log('[DBG][100ms-meeting] Getting presigned URL for:', assetId);

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const managementToken = await generateManagementToken();

  const response = await fetch(`${HMS_API_BASE}/recording-assets/${assetId}/presigned-url`, {
    headers: {
      Authorization: `Bearer ${managementToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    console.error('[DBG][100ms-meeting] Failed to get presigned URL:', errorText);
    throw new Error(`Failed to get presigned URL: ${errorText}`);
  }

  const data = await response.json();
  return data.url || null;
}

/**
 * Get sessions for a room (to match recordings to sessions)
 */
export async function getHmsSessions(
  roomId: string,
  limit = 20,
  start?: string
): Promise<HmsSessionsResponse> {
  console.log('[DBG][100ms-meeting] Fetching sessions for room:', roomId);

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const managementToken = await generateManagementToken();

  const params = new URLSearchParams();
  params.set('room_id', roomId);
  params.set('limit', String(limit));
  if (start) params.set('start', start);

  const response = await fetch(`${HMS_API_BASE}/sessions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${managementToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DBG][100ms-meeting] Failed to fetch sessions:', errorText);
    throw new Error(`Failed to fetch sessions: ${errorText}`);
  }

  return response.json();
}

/**
 * Delete a recording asset from 100ms
 */
export async function deleteHmsRecordingAsset(assetId: string): Promise<boolean> {
  console.log('[DBG][100ms-meeting] Deleting recording asset:', assetId);

  if (!is100msConfigured()) {
    throw new Error('100ms is not configured');
  }

  const managementToken = await generateManagementToken();

  const response = await fetch(`${HMS_API_BASE}/recording-assets/${assetId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${managementToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.log('[DBG][100ms-meeting] Recording asset not found (already deleted?):', assetId);
      return true; // Consider it deleted if not found
    }
    const errorText = await response.text();
    console.error('[DBG][100ms-meeting] Failed to delete recording asset:', errorText);
    throw new Error(`Failed to delete recording asset: ${errorText}`);
  }

  console.log('[DBG][100ms-meeting] Recording asset deleted:', assetId);
  return true;
}
