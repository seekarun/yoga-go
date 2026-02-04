/**
 * 100ms Meeting/Room Management for Cally
 *
 * Handles room creation and management via 100ms API
 * Simplified version for calendar events with video conferencing
 */

import {
  generateManagementToken,
  getDefaultTemplateId,
  is100msConfigured,
} from "./100ms-auth";

// 100ms API base URL
const HMS_API_BASE = "https://api.100ms.live/v2";

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

export interface CreateHmsRoomResult {
  roomId: string;
  templateId: string;
}

/**
 * Create a 100ms room via API
 */
export async function createHmsRoom(
  params: CreateRoomParams,
): Promise<CreateHmsRoomResult> {
  console.log("[DBG][100ms-meeting] Creating room:", params.name);

  if (!is100msConfigured()) {
    throw new Error("100ms is not configured");
  }

  const managementToken = await generateManagementToken();
  const templateId = params.templateId || getDefaultTemplateId();

  const response = await fetch(`${HMS_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managementToken}`,
    },
    body: JSON.stringify({
      name: params.name,
      description: params.description || "",
      template_id: templateId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[DBG][100ms-meeting] Failed to create room:", errorText);
    throw new Error(`Failed to create 100ms room: ${errorText}`);
  }

  const room: HmsRoom = await response.json();
  console.log("[DBG][100ms-meeting] Room created:", room.id);

  return {
    roomId: room.id,
    templateId: room.template_id,
  };
}

/**
 * Create a 100ms room for a calendar event
 *
 * @param tenantId - Tenant ID (for naming)
 * @param eventId - Calendar event ID
 * @param title - Event title (for room description)
 */
export async function createHmsRoomForEvent(
  tenantId: string,
  eventId: string,
  title: string,
): Promise<CreateHmsRoomResult> {
  const roomName = `cally-${tenantId}-${eventId}`.slice(0, 100); // Max 100 chars

  const result = await createHmsRoom({
    name: roomName,
    description: title,
  });

  return result;
}

/**
 * Get room details from 100ms API
 */
export async function getHmsRoom(roomId: string): Promise<HmsRoom | null> {
  console.log("[DBG][100ms-meeting] Getting room:", roomId);

  if (!is100msConfigured()) {
    throw new Error("100ms is not configured");
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
    console.error("[DBG][100ms-meeting] Failed to get room:", errorText);
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
