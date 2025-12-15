/**
 * Google Meet Integration
 *
 * Creates Google Calendar events with Meet links for webinar sessions
 */

import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { getOAuth2ClientForExpert } from './google-auth';
import * as webinarRepository from './repositories/webinarRepository';
import type { WebinarSession } from '@/types';

interface CreateMeetEventParams {
  expertId: string;
  webinarId: string;
  sessionId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  attendeeEmails?: string[];
}

interface MeetEventResult {
  eventId: string;
  meetLink: string;
  calendarLink: string;
}

/**
 * Create a Google Calendar event with Meet link for a session
 */
export async function createMeetEvent(params: CreateMeetEventParams): Promise<MeetEventResult> {
  const { expertId, webinarId, sessionId, title, description, startTime, endTime, attendeeEmails } =
    params;

  console.log('[DBG][google-meet] Creating Meet event for session:', sessionId);

  const oauth2Client = await getOAuth2ClientForExpert(expertId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Create event with Meet conference
  const event: calendar_v3.Schema$Event = {
    summary: title,
    description: description || `Live yoga session via MyYoga.guru\n\nWebinar ID: ${webinarId}`,
    start: {
      dateTime: startTime,
      timeZone: 'Asia/Kolkata', // Default to IST
    },
    end: {
      dateTime: endTime,
      timeZone: 'Asia/Kolkata',
    },
    conferenceData: {
      createRequest: {
        requestId: `yoga-${webinarId}-${sessionId}-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    attendees: attendeeEmails?.map(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 }, // 1 hour before
        { method: 'popup', minutes: 10 }, // 10 minutes before
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1, // Required for Meet link creation
    sendUpdates: 'all', // Send invites to attendees
  });

  const createdEvent = response.data;

  if (!createdEvent.id || !createdEvent.conferenceData?.entryPoints) {
    throw new Error('Failed to create calendar event with Meet link');
  }

  // Find the Meet link from entry points
  const meetEntryPoint = createdEvent.conferenceData.entryPoints.find(
    ep => ep.entryPointType === 'video'
  );

  if (!meetEntryPoint?.uri) {
    throw new Error('No Meet link in created event');
  }

  console.log('[DBG][google-meet] Created event with Meet link:', meetEntryPoint.uri);

  return {
    eventId: createdEvent.id,
    meetLink: meetEntryPoint.uri,
    calendarLink: createdEvent.htmlLink || '',
  };
}

/**
 * Update a Google Calendar event
 */
export async function updateMeetEvent(
  expertId: string,
  eventId: string,
  updates: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<void> {
  console.log('[DBG][google-meet] Updating event:', eventId);

  const oauth2Client = await getOAuth2ClientForExpert(expertId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event: calendar_v3.Schema$Event = {};

  if (updates.title) {
    event.summary = updates.title;
  }
  if (updates.description) {
    event.description = updates.description;
  }
  if (updates.startTime) {
    event.start = {
      dateTime: updates.startTime,
      timeZone: 'Asia/Kolkata',
    };
  }
  if (updates.endTime) {
    event.end = {
      dateTime: updates.endTime,
      timeZone: 'Asia/Kolkata',
    };
  }

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: event,
    sendUpdates: 'all',
  });

  console.log('[DBG][google-meet] Event updated');
}

/**
 * Delete a Google Calendar event
 */
export async function deleteMeetEvent(expertId: string, eventId: string): Promise<void> {
  console.log('[DBG][google-meet] Deleting event:', eventId);

  const oauth2Client = await getOAuth2ClientForExpert(expertId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });

  console.log('[DBG][google-meet] Event deleted');
}

/**
 * Create Meet events for all sessions in a webinar
 */
export async function createMeetEventsForWebinar(
  expertId: string,
  webinarId: string
): Promise<{ sessionId: string; meetLink: string; eventId: string }[]> {
  console.log('[DBG][google-meet] Creating Meet events for webinar:', webinarId);

  const webinar = await webinarRepository.getWebinarById(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const results: { sessionId: string; meetLink: string; eventId: string }[] = [];

  for (const session of webinar.sessions) {
    // Skip if session already has a Meet link
    if (session.googleMeetLink) {
      console.log('[DBG][google-meet] Session already has Meet link:', session.id);
      results.push({
        sessionId: session.id,
        meetLink: session.googleMeetLink,
        eventId: session.googleEventId || '',
      });
      continue;
    }

    try {
      const result = await createMeetEvent({
        expertId,
        webinarId,
        sessionId: session.id,
        title: `${webinar.title} - ${session.title}`,
        description: session.description || webinar.description,
        startTime: session.startTime,
        endTime: session.endTime,
      });

      // Update session with Meet link
      const updatedSession: Partial<WebinarSession> = {
        googleMeetLink: result.meetLink,
        googleEventId: result.eventId,
      };

      await webinarRepository.updateSession(webinarId, session.id, updatedSession);

      results.push({
        sessionId: session.id,
        meetLink: result.meetLink,
        eventId: result.eventId,
      });
    } catch (error) {
      console.error('[DBG][google-meet] Failed to create Meet for session:', session.id, error);
      throw error;
    }
  }

  console.log('[DBG][google-meet] Created', results.length, 'Meet events');
  return results;
}

/**
 * Add attendees to an existing calendar event
 */
export async function addAttendeesToEvent(
  expertId: string,
  eventId: string,
  emails: string[]
): Promise<void> {
  console.log('[DBG][google-meet] Adding attendees to event:', eventId);

  const oauth2Client = await getOAuth2ClientForExpert(expertId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get current event
  const eventResponse = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  const currentAttendees = eventResponse.data.attendees || [];
  const currentEmails = new Set(currentAttendees.map(a => a.email));

  // Add new attendees
  const newAttendees = emails.filter(email => !currentEmails.has(email)).map(email => ({ email }));

  if (newAttendees.length === 0) {
    console.log('[DBG][google-meet] All attendees already added');
    return;
  }

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: {
      attendees: [...currentAttendees, ...newAttendees],
    },
    sendUpdates: 'all',
  });

  console.log('[DBG][google-meet] Added', newAttendees.length, 'attendees');
}
