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
