import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';

// 100ms Management Token API
// Docs: https://www.100ms.live/docs/server-side/v2/api-reference/policy/create-room-codes

const HMS_APP_ACCESS_KEY = process.env.HMS_APP_ACCESS_KEY || '';
const HMS_APP_SECRET = process.env.HMS_APP_SECRET || '';
const HMS_TEMPLATE_ID = process.env.HMS_TEMPLATE_ID || '';

const HMS_API_ENDPOINT = 'https://api.100ms.live/v2';

if (!HMS_APP_ACCESS_KEY || !HMS_APP_SECRET) {
  console.warn('[WARN][hms.ts] HMS credentials not configured. Video sessions will not work.');
}

export interface HMSRoomData {
  roomId: string;
  roomCode: string; // Room code for joining
}

export interface HMSAuthToken {
  token: string;
  roomId: string;
}

/**
 * Create a 100ms room for a yoga session
 * @param roomName - Name for the room
 * @param description - Description of the session
 * @returns Room details including ID and join code
 */
export async function createHMSRoom(roomName: string, description?: string): Promise<HMSRoomData> {
  console.log('[DBG][hms.ts] Creating 100ms room:', roomName);

  try {
    // Create room using Management API
    const response = await fetch(`${HMS_API_ENDPOINT}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getManagementToken()}`,
      },
      body: JSON.stringify({
        name: roomName,
        description: description || '',
        template_id: HMS_TEMPLATE_ID,
        region: 'us', // Can be 'us', 'eu', 'in'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[DBG][hms.ts] Failed to create room:', error);
      throw new Error(`Failed to create 100ms room: ${error.message || response.statusText}`);
    }

    const data = await response.json();

    console.log('[DBG][hms.ts] Room created successfully:', data.id);

    // Create a room code for easy joining
    const roomCodeResponse = await fetch(`${HMS_API_ENDPOINT}/room-codes/room/${data.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getManagementToken()}`,
      },
      body: JSON.stringify({
        enabled: true,
      }),
    });

    if (!roomCodeResponse.ok) {
      console.warn('[DBG][hms.ts] Failed to create room code, will use room ID');
    }

    const roomCodeData = await roomCodeResponse.json();

    return {
      roomId: data.id,
      roomCode: roomCodeData.data?.[0]?.code || data.id, // Fallback to roomId if code creation fails
    };
  } catch (error: any) {
    console.error('[DBG][hms.ts] Error creating HMS room');
    console.error('[DBG][hms.ts] Error:', error.message);
    throw error;
  }
}

/**
 * Generate an auth token for a user to join a room
 * @param roomId - The 100ms room ID
 * @param userId - User ID
 * @param role - User role ('host' for expert, 'guest' for student)
 * @param userName - Display name
 * @returns Auth token
 */
export async function generateHMSAuthToken(
  roomId: string,
  userId: string,
  role: 'host' | 'guest',
  userName: string
): Promise<string> {
  console.log('[DBG][hms.ts] Generating auth token for user:', userId, 'role:', role);

  try {
    // Token payload
    const payload = {
      access_key: HMS_APP_ACCESS_KEY,
      room_id: roomId,
      user_id: userId,
      role: role,
      type: 'app',
      version: 2,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
    };

    // Sign the token
    const token = jwt.sign(payload, HMS_APP_SECRET, {
      algorithm: 'HS256',
      expiresIn: '24h',
      jwtid: uuid(),
    });

    console.log('[DBG][hms.ts] Auth token generated successfully');

    return token;
  } catch (error: any) {
    console.error('[DBG][hms.ts] Error generating auth token');
    console.error('[DBG][hms.ts] Error:', error.message);
    throw error;
  }
}

/**
 * Get a management token for API calls
 * Management tokens are used for server-side API operations
 */
async function getManagementToken(): Promise<string> {
  const payload = {
    access_key: HMS_APP_ACCESS_KEY,
    type: 'management',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(payload, HMS_APP_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
    jwtid: uuid(),
  });

  return token;
}

/**
 * End/disable a room
 * @param roomId - The 100ms room ID
 */
export async function endHMSRoom(roomId: string): Promise<void> {
  console.log('[DBG][hms.ts] Ending 100ms room:', roomId);

  try {
    const response = await fetch(`${HMS_API_ENDPOINT}/rooms/${roomId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getManagementToken()}`,
      },
      body: JSON.stringify({
        enabled: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[DBG][hms.ts] Failed to end room:', error);
      throw new Error(`Failed to end 100ms room: ${error.message || response.statusText}`);
    }

    console.log('[DBG][hms.ts] Room ended successfully');
  } catch (error: any) {
    console.error('[DBG][hms.ts] Error ending HMS room');
    console.error('[DBG][hms.ts] Error:', error.message);
    throw error;
  }
}

/**
 * Get active session for a room
 * @param roomId - The 100ms room ID
 */
export async function getActiveSession(roomId: string): Promise<string | null> {
  console.log('[DBG][hms.ts] Getting active session for room:', roomId);

  try {
    const response = await fetch(`${HMS_API_ENDPOINT}/sessions?room_id=${roomId}&active=true`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${await getManagementToken()}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      console.log('[DBG][hms.ts] Active session found:', data.data[0].id);
      return data.data[0].id;
    }

    console.log('[DBG][hms.ts] No active session found');
    return null;
  } catch (error: any) {
    console.error('[DBG][hms.ts] Error getting active session:', error.message);
    return null;
  }
}

/**
 * Start recording for a session
 * @param roomId - The 100ms room ID
 * @param meetingUrl - URL to record (browser-based recording)
 */
export async function startRecording(roomId: string, meetingUrl: string): Promise<string> {
  console.log('[DBG][hms.ts] Starting recording for room:', roomId);

  try {
    const sessionId = await getActiveSession(roomId);

    if (!sessionId) {
      throw new Error('No active session found for recording');
    }

    const response = await fetch(`${HMS_API_ENDPOINT}/recordings/room/${roomId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getManagementToken()}`,
      },
      body: JSON.stringify({
        meeting_url: meetingUrl,
        resolution: {
          width: 1280,
          height: 720,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to start recording: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('[DBG][hms.ts] Recording started:', data.id);

    return data.id;
  } catch (error: any) {
    console.error('[DBG][hms.ts] Error starting recording:', error.message);
    throw error;
  }
}

/**
 * Stop recording for a session
 * @param roomId - The 100ms room ID
 */
export async function stopRecording(roomId: string): Promise<void> {
  console.log('[DBG][hms.ts] Stopping recording for room:', roomId);

  try {
    const response = await fetch(`${HMS_API_ENDPOINT}/recordings/room/${roomId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getManagementToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to stop recording: ${error.message || response.statusText}`);
    }

    console.log('[DBG][hms.ts] Recording stopped successfully');
  } catch (error: any) {
    console.error('[DBG][hms.ts] Error stopping recording:', error.message);
    throw error;
  }
}
