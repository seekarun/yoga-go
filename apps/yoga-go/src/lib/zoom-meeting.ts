/**
 * Zoom Meeting Integration
 *
 * Creates Zoom meetings for webinar sessions
 */

import { getValidAccessToken } from './zoom-auth';
import * as webinarRepository from './repositories/webinarRepository';
import type { WebinarSession } from '@/types';

const ZOOM_API_URL = 'https://api.zoom.us/v2';

interface CreateZoomMeetingParams {
  expertId: string;
  webinarId: string;
  sessionId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in minutes
}

interface ZoomMeetingResult {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  password?: string;
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  password?: string;
  topic: string;
  start_time: string;
  duration: number;
}

/**
 * Create a Zoom meeting for a session
 */
export async function createZoomMeeting(
  params: CreateZoomMeetingParams
): Promise<ZoomMeetingResult> {
  const { expertId, webinarId, sessionId, title, description, startTime, duration } = params;

  console.log('[DBG][zoom-meeting] Creating Zoom meeting for session:', sessionId);

  const accessToken = await getValidAccessToken(expertId);

  // Convert ISO string to Zoom format (YYYY-MM-DDTHH:MM:SS)
  const startTimeFormatted = new Date(startTime).toISOString().slice(0, 19);

  const meetingData = {
    topic: title,
    type: 2, // Scheduled meeting
    start_time: startTimeFormatted,
    duration,
    timezone: 'Asia/Kolkata', // Default to IST
    agenda: description || `Live yoga session via MyYoga.guru\n\nWebinar ID: ${webinarId}`,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: true,
      auto_recording: 'none',
      meeting_authentication: false,
    },
  };

  const response = await fetch(`${ZOOM_API_URL}/users/me/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(meetingData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][zoom-meeting] Failed to create meeting:', error);
    throw new Error(`Failed to create Zoom meeting: ${error}`);
  }

  const meeting: ZoomMeetingResponse = await response.json();

  console.log('[DBG][zoom-meeting] Created meeting with ID:', meeting.id);

  return {
    meetingId: meeting.id.toString(),
    joinUrl: meeting.join_url,
    startUrl: meeting.start_url,
    password: meeting.password,
  };
}

/**
 * Update a Zoom meeting
 */
export async function updateZoomMeeting(
  expertId: string,
  meetingId: string,
  updates: {
    title?: string;
    description?: string;
    startTime?: string;
    duration?: number;
  }
): Promise<void> {
  console.log('[DBG][zoom-meeting] Updating meeting:', meetingId);

  const accessToken = await getValidAccessToken(expertId);

  const meetingData: Record<string, unknown> = {};

  if (updates.title) {
    meetingData.topic = updates.title;
  }
  if (updates.description) {
    meetingData.agenda = updates.description;
  }
  if (updates.startTime) {
    meetingData.start_time = new Date(updates.startTime).toISOString().slice(0, 19);
    meetingData.timezone = 'Asia/Kolkata';
  }
  if (updates.duration) {
    meetingData.duration = updates.duration;
  }

  const response = await fetch(`${ZOOM_API_URL}/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(meetingData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][zoom-meeting] Failed to update meeting:', error);
    throw new Error(`Failed to update Zoom meeting: ${error}`);
  }

  console.log('[DBG][zoom-meeting] Meeting updated');
}

/**
 * Delete a Zoom meeting
 */
export async function deleteZoomMeeting(expertId: string, meetingId: string): Promise<void> {
  console.log('[DBG][zoom-meeting] Deleting meeting:', meetingId);

  const accessToken = await getValidAccessToken(expertId);

  const response = await fetch(`${ZOOM_API_URL}/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // 204 No Content is success for delete
  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    console.error('[DBG][zoom-meeting] Failed to delete meeting:', error);
    throw new Error(`Failed to delete Zoom meeting: ${error}`);
  }

  console.log('[DBG][zoom-meeting] Meeting deleted');
}

/**
 * Get a Zoom meeting's details
 */
export async function getZoomMeeting(
  expertId: string,
  meetingId: string
): Promise<ZoomMeetingResult> {
  console.log('[DBG][zoom-meeting] Getting meeting:', meetingId);

  const accessToken = await getValidAccessToken(expertId);

  const response = await fetch(`${ZOOM_API_URL}/meetings/${meetingId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][zoom-meeting] Failed to get meeting:', error);
    throw new Error(`Failed to get Zoom meeting: ${error}`);
  }

  const meeting: ZoomMeetingResponse = await response.json();

  return {
    meetingId: meeting.id.toString(),
    joinUrl: meeting.join_url,
    startUrl: meeting.start_url,
    password: meeting.password,
  };
}

/**
 * Create Zoom meetings for all sessions in a webinar
 */
export async function createZoomMeetingsForWebinar(
  expertId: string,
  webinarId: string
): Promise<{ sessionId: string; meetingId: string; joinUrl: string }[]> {
  console.log('[DBG][zoom-meeting] Creating Zoom meetings for webinar:', webinarId);

  const webinar = await webinarRepository.getWebinarById(expertId, webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const results: { sessionId: string; meetingId: string; joinUrl: string }[] = [];

  for (const session of webinar.sessions) {
    // Skip if session already has a Zoom link
    if (session.zoomMeetingLink || session.zoomJoinUrl) {
      console.log('[DBG][zoom-meeting] Session already has Zoom link:', session.id);
      results.push({
        sessionId: session.id,
        meetingId: session.zoomMeetingId || '',
        joinUrl: session.zoomJoinUrl || session.zoomMeetingLink || '',
      });
      continue;
    }

    try {
      const result = await createZoomMeeting({
        expertId,
        webinarId,
        sessionId: session.id,
        title: `${webinar.title} - ${session.title}`,
        description: session.description || webinar.description,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
      });

      // Update session with Zoom link
      const updatedSession: Partial<WebinarSession> = {
        zoomMeetingId: result.meetingId,
        zoomMeetingLink: result.joinUrl, // For backward compatibility
        zoomJoinUrl: result.joinUrl,
        zoomStartUrl: result.startUrl,
        zoomPassword: result.password,
      };

      await webinarRepository.updateSession(expertId, webinarId, session.id, updatedSession);

      results.push({
        sessionId: session.id,
        meetingId: result.meetingId,
        joinUrl: result.joinUrl,
      });
    } catch (error) {
      console.error('[DBG][zoom-meeting] Failed to create Zoom for session:', session.id, error);
      throw error;
    }
  }

  console.log('[DBG][zoom-meeting] Created', results.length, 'Zoom meetings');
  return results;
}

/**
 * Add registrants to a Zoom meeting
 * Note: This requires "Allow participants to register" setting enabled
 */
export async function addRegistrantToMeeting(
  expertId: string,
  meetingId: string,
  registrant: {
    email: string;
    firstName: string;
    lastName?: string;
  }
): Promise<{ registrantId: string; joinUrl: string }> {
  console.log('[DBG][zoom-meeting] Adding registrant to meeting:', meetingId);

  const accessToken = await getValidAccessToken(expertId);

  const response = await fetch(`${ZOOM_API_URL}/meetings/${meetingId}/registrants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      email: registrant.email,
      first_name: registrant.firstName,
      last_name: registrant.lastName || '',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][zoom-meeting] Failed to add registrant:', error);
    throw new Error(`Failed to add registrant to Zoom meeting: ${error}`);
  }

  const result = await response.json();

  console.log('[DBG][zoom-meeting] Added registrant');

  return {
    registrantId: result.registrant_id,
    joinUrl: result.join_url,
  };
}
