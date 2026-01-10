/**
 * Expert Calendar Route
 * GET /data/app/expert/me/calendar - Get combined calendar data (events + webinar sessions)
 * POST /data/app/expert/me/calendar - Create a new calendar event
 */

import { NextResponse } from 'next/server';
import type {
  ApiResponse,
  CalendarEvent,
  CalendarItem,
  CreateCalendarEventInput,
  WebinarStatus,
} from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as calendarEventRepository from '@/lib/repositories/calendarEventRepository';
import * as webinarRepository from '@/lib/repositories/webinarRepository';

// Color constants for calendar items
const COLORS = {
  liveSession: '#7d8e74', // Sage green (--color-highlight)
  generalEvent: '#a35638', // Terracotta (--color-primary)
};

/**
 * GET /data/app/expert/me/calendar
 * Get combined calendar data (events + webinar sessions)
 *
 * Query params:
 *   - start: ISO date (required) - Start of date range
 *   - end: ISO date (required) - End of date range
 *   - type: 'all' | 'events' | 'sessions' (default: 'all')
 */
export async function GET(request: Request) {
  console.log('[DBG][expert/me/calendar] GET called');

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<CalendarItem[]>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<CalendarItem[]>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const filterType = searchParams.get('type') || 'all';

    if (!start || !end) {
      return NextResponse.json<ApiResponse<CalendarItem[]>>(
        { success: false, error: 'start and end query parameters are required' },
        { status: 400 }
      );
    }

    // Extract date parts (YYYY-MM-DD)
    const startDate = start.substring(0, 10);
    const endDate = end.substring(0, 10);

    console.log(
      '[DBG][expert/me/calendar] Getting calendar for range:',
      startDate,
      'to',
      endDate,
      'type:',
      filterType
    );

    const calendarItems: CalendarItem[] = [];

    // Fetch calendar events if needed
    if (filterType === 'all' || filterType === 'events') {
      const events = await calendarEventRepository.getCalendarEventsByDateRange(
        expertId,
        startDate,
        endDate
      );

      // Transform events to CalendarItem format
      for (const event of events) {
        calendarItems.push({
          id: event.id,
          title: event.title,
          start: event.startTime,
          end: event.endTime,
          allDay: event.isAllDay,
          type: event.type === 'live_session' ? 'live_session' : 'event',
          color:
            event.color ||
            (event.type === 'live_session' ? COLORS.liveSession : COLORS.generalEvent),
          extendedProps: {
            description: event.description,
            webinarId: event.webinarId,
            sessionId: event.sessionId,
            meetingLink: event.meetingLink,
            location: event.location,
            status: event.status,
          },
        });
      }
    }

    // Fetch webinar sessions if needed
    if (filterType === 'all' || filterType === 'sessions') {
      const webinars = await webinarRepository.getTenantWebinars(expertId);

      // Extract sessions from webinars and filter by date range
      for (const webinar of webinars) {
        if (!webinar.sessions || webinar.sessions.length === 0) continue;

        for (const session of webinar.sessions) {
          const sessionDate = session.startTime.substring(0, 10);

          // Check if session falls within date range
          if (sessionDate >= startDate && sessionDate <= endDate) {
            // Determine meeting link
            const meetingLink =
              session.googleMeetLink || session.zoomJoinUrl || session.zoomMeetingLink;

            calendarItems.push({
              id: `session_${webinar.id}_${session.id}`,
              title: `${webinar.title}: ${session.title}`,
              start: session.startTime,
              end: session.endTime,
              type: 'live_session',
              color: COLORS.liveSession,
              extendedProps: {
                description: session.description || webinar.description,
                webinarId: webinar.id,
                sessionId: session.id,
                meetingLink,
                status: webinar.status as WebinarStatus,
              },
            });
          }
        }
      }
    }

    // Sort by start time
    calendarItems.sort((a, b) => a.start.localeCompare(b.start));

    console.log('[DBG][expert/me/calendar] Returning', calendarItems.length, 'calendar items');
    return NextResponse.json<ApiResponse<CalendarItem[]>>({
      success: true,
      data: calendarItems,
    });
  } catch (error) {
    console.error('[DBG][expert/me/calendar] Error:', error);
    return NextResponse.json<ApiResponse<CalendarItem[]>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /data/app/expert/me/calendar
 * Create a new calendar event (general type)
 */
export async function POST(request: Request) {
  console.log('[DBG][expert/me/calendar] POST called');

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;
    const body = await request.json();

    // Validate required fields
    const { title, startTime, endTime, type } = body as Partial<CreateCalendarEventInput>;

    if (!title || !startTime || !endTime || !type) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: 'title, startTime, endTime, and type are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const input: CreateCalendarEventInput = {
      title,
      description: body.description,
      startTime,
      endTime,
      type,
      webinarId: body.webinarId,
      sessionId: body.sessionId,
      meetingLink: body.meetingLink,
      location: body.location,
      isAllDay: body.isAllDay,
      color: body.color,
      notes: body.notes,
    };

    console.log('[DBG][expert/me/calendar] Creating event:', title, 'type:', type);

    const event = await calendarEventRepository.createCalendarEvent(expertId, input);

    console.log('[DBG][expert/me/calendar] Created event:', event.id);
    return NextResponse.json<ApiResponse<CalendarEvent>>({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('[DBG][expert/me/calendar] Error creating event:', error);
    return NextResponse.json<ApiResponse<CalendarEvent>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      },
      { status: 500 }
    );
  }
}
