/**
 * LiveSession repository for DynamoDB operations
 * Handles CRUD operations for live sessions
 *
 * 4-Table Design - CALENDAR table with dual-write pattern:
 * - Expert's sessions: PK=EXPERT#{expertId}, SK={sessionId}
 * - Direct lookup: PK=SESSION, SK={sessionId}
 * - Status lookup: PK=STATUS#{status}, SK={scheduledStartTime}#{sessionId}
 * - Instant code lookup: PK=INSTANT#{code}, SK={sessionId}
 */

import { docClient, Tables, CalendarPK, EntityType } from '../dynamodb';
import { GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { LiveSession, LiveSessionStatus, LiveSessionType, LiveSessionMetadata } from '@/types';

// Helper to generate a unique session ID
const generateSessionId = () => `ls_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Helper to generate instant meeting code
const generateInstantMeetingCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

/**
 * Create a new live session
 * Uses dual-write pattern for multiple access patterns without GSIs
 */
export async function createLiveSession(
  input: Omit<LiveSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LiveSession> {
  console.log('[DBG][liveSessionRepository] Creating session for expert:', input.expertId);

  const now = new Date().toISOString();
  const sessionId = generateSessionId();

  const session: LiveSession = {
    ...input,
    id: sessionId,
    instantMeetingCode:
      input.sessionType === 'instant' ? generateInstantMeetingCode() : input.instantMeetingCode,
    enrolledCount: input.enrolledCount ?? 0,
    attendedCount: input.attendedCount ?? 0,
    currentViewers: input.currentViewers ?? 0,
    currency: input.currency ?? 'INR',
    status: input.status ?? 'scheduled',
    isFree: input.price === 0,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Multiple items for different access patterns
  const writeRequests = [
    // 1. Expert's sessions lookup: PK=EXPERT#{expertId}, SK={sessionId}
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.EXPERT_SESSIONS(input.expertId),
          SK: sessionId,
          entityType: EntityType.LIVE_SESSION,
          ...session,
        },
      },
    },
    // 2. Direct session lookup: PK=SESSION, SK={sessionId}
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.SESSION,
          SK: sessionId,
          entityType: EntityType.LIVE_SESSION,
          ...session,
        },
      },
    },
    // 3. Status lookup: PK=STATUS#{status}, SK={scheduledStartTime}#{sessionId}
    {
      PutRequest: {
        Item: {
          PK: `STATUS#${session.status}`,
          SK: `${session.scheduledStartTime}#${sessionId}`,
          entityType: EntityType.LIVE_SESSION,
          ...session,
        },
      },
    },
  ];

  // 4. Optional: Instant code lookup (only for instant sessions)
  if (session.instantMeetingCode) {
    writeRequests.push({
      PutRequest: {
        Item: {
          PK: `INSTANT#${session.instantMeetingCode}`,
          SK: sessionId,
          entityType: EntityType.LIVE_SESSION,
          ...session,
        },
      },
    });
  }

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CALENDAR]: writeRequests,
      },
    })
  );

  console.log('[DBG][liveSessionRepository] Session created:', sessionId);
  return session;
}

/**
 * Get a live session by expertId and sessionId
 */
export async function getLiveSessionById(
  expertId: string,
  sessionId: string
): Promise<LiveSession | null> {
  console.log('[DBG][liveSessionRepository] Getting session:', sessionId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CALENDAR,
      Key: {
        PK: CalendarPK.EXPERT_SESSIONS(expertId),
        SK: sessionId,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][liveSessionRepository] Session not found:', sessionId);
    return null;
  }

  return mapToLiveSession(result.Item);
}

/**
 * Get a live session by ID only (uses dual-write direct lookup)
 */
export async function getLiveSessionByIdOnly(sessionId: string): Promise<LiveSession | null> {
  console.log('[DBG][liveSessionRepository] Getting session by ID only:', sessionId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CALENDAR,
      Key: {
        PK: CalendarPK.SESSION,
        SK: sessionId,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][liveSessionRepository] Session not found:', sessionId);
    return null;
  }

  return mapToLiveSession(result.Item);
}

/**
 * Get a live session by instant meeting code (uses dual-write instant lookup)
 */
export async function getLiveSessionByInstantCode(code: string): Promise<LiveSession | null> {
  console.log('[DBG][liveSessionRepository] Getting session by instant code:', code);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `INSTANT#${code}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][liveSessionRepository] Session not found for code:', code);
    return null;
  }

  return mapToLiveSession(result.Items[0]);
}

/**
 * Get all live sessions for an expert
 */
export async function getLiveSessionsByExpert(expertId: string): Promise<LiveSession[]> {
  console.log('[DBG][liveSessionRepository] Getting sessions for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CalendarPK.EXPERT_SESSIONS(expertId),
      },
      ScanIndexForward: false,
    })
  );

  const sessions = (result.Items || []).map(mapToLiveSession);
  console.log('[DBG][liveSessionRepository] Found', sessions.length, 'sessions');
  return sessions;
}

/**
 * Get live sessions by status (uses dual-write status lookup)
 */
export async function getLiveSessionsByStatus(status: LiveSessionStatus): Promise<LiveSession[]> {
  console.log('[DBG][liveSessionRepository] Getting sessions by status:', status);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `STATUS#${status}`,
      },
      ScanIndexForward: true, // Order by scheduled time ascending
    })
  );

  const sessions = (result.Items || []).map(mapToLiveSession);
  console.log(
    '[DBG][liveSessionRepository] Found',
    sessions.length,
    'sessions with status',
    status
  );
  return sessions;
}

/**
 * Get upcoming live sessions (scheduled, in the future)
 */
export async function getUpcomingLiveSessions(): Promise<LiveSession[]> {
  const now = new Date().toISOString();
  const sessions = await getLiveSessionsByStatus('scheduled');
  return sessions.filter(s => s.scheduledStartTime >= now);
}

/**
 * Get live sessions currently active
 */
export async function getActiveLiveSessions(): Promise<LiveSession[]> {
  return getLiveSessionsByStatus('live');
}

/**
 * Update a live session
 * For dual-write: reads current session, updates all copies
 */
export async function updateLiveSession(
  expertId: string,
  sessionId: string,
  updates: Partial<
    Pick<
      LiveSession,
      | 'title'
      | 'description'
      | 'thumbnail'
      | 'scheduledStartTime'
      | 'scheduledEndTime'
      | 'actualStartTime'
      | 'actualEndTime'
      | 'maxParticipants'
      | 'currentViewers'
      | 'price'
      | 'meetingLink'
      | 'meetingPlatform'
      | 'status'
      | 'enrolledCount'
      | 'attendedCount'
      | 'recordingS3Key'
      | 'recordedLessonId'
      | 'recordingAvailable'
      | 'metadata'
      | 'featured'
    >
  >
): Promise<LiveSession | null> {
  console.log('[DBG][liveSessionRepository] Updating session:', sessionId);

  // First, get the current session to know the old status (for dual-write cleanup)
  const currentSession = await getLiveSessionById(expertId, sessionId);
  if (!currentSession) {
    console.log('[DBG][liveSessionRepository] Session not found for update:', sessionId);
    return null;
  }

  const now = new Date().toISOString();
  const updatedSession: LiveSession = {
    ...currentSession,
    ...updates,
    isFree: updates.price !== undefined ? updates.price === 0 : currentSession.isFree,
    updatedAt: now,
  };

  // Build write requests for all dual-write items
  const writeRequests = [
    // 1. Expert's sessions lookup
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.EXPERT_SESSIONS(expertId),
          SK: sessionId,
          entityType: EntityType.LIVE_SESSION,
          ...updatedSession,
        },
      },
    },
    // 2. Direct session lookup
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.SESSION,
          SK: sessionId,
          entityType: EntityType.LIVE_SESSION,
          ...updatedSession,
        },
      },
    },
    // 3. New status lookup
    {
      PutRequest: {
        Item: {
          PK: `STATUS#${updatedSession.status}`,
          SK: `${updatedSession.scheduledStartTime}#${sessionId}`,
          entityType: EntityType.LIVE_SESSION,
          ...updatedSession,
        },
      },
    },
  ];

  // If status changed, delete the old status record
  const deleteRequests: Array<{ DeleteRequest: { Key: { PK: string; SK: string } } }> = [];
  if (updates.status && updates.status !== currentSession.status) {
    deleteRequests.push({
      DeleteRequest: {
        Key: {
          PK: `STATUS#${currentSession.status}`,
          SK: `${currentSession.scheduledStartTime}#${sessionId}`,
        },
      },
    });
  }

  // Handle instant code updates
  if (updatedSession.instantMeetingCode) {
    writeRequests.push({
      PutRequest: {
        Item: {
          PK: `INSTANT#${updatedSession.instantMeetingCode}`,
          SK: sessionId,
          entityType: EntityType.LIVE_SESSION,
          ...updatedSession,
        },
      },
    });
  }

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CALENDAR]: [...writeRequests, ...deleteRequests],
      },
    })
  );

  console.log('[DBG][liveSessionRepository] Session updated:', sessionId);
  return updatedSession;
}

/**
 * Update session status
 */
export async function updateLiveSessionStatus(
  expertId: string,
  sessionId: string,
  status: LiveSessionStatus,
  additionalUpdates?: { actualStartTime?: string; actualEndTime?: string }
): Promise<LiveSession | null> {
  return updateLiveSession(expertId, sessionId, {
    status,
    ...additionalUpdates,
  });
}

/**
 * Increment enrolled count
 */
export async function incrementEnrolledCount(
  expertId: string,
  sessionId: string
): Promise<LiveSession | null> {
  const session = await getLiveSessionById(expertId, sessionId);
  if (!session) return null;

  return updateLiveSession(expertId, sessionId, {
    enrolledCount: (session.enrolledCount || 0) + 1,
  });
}

/**
 * Delete a live session
 * Deletes all dual-write copies
 */
export async function deleteLiveSession(expertId: string, sessionId: string): Promise<boolean> {
  console.log('[DBG][liveSessionRepository] Deleting session:', sessionId);

  // Get current session to know all the dual-write keys
  const session = await getLiveSessionById(expertId, sessionId);
  if (!session) {
    console.log('[DBG][liveSessionRepository] Session not found for delete:', sessionId);
    return false;
  }

  const deleteRequests = [
    // 1. Expert's sessions lookup
    {
      DeleteRequest: {
        Key: {
          PK: CalendarPK.EXPERT_SESSIONS(expertId),
          SK: sessionId,
        },
      },
    },
    // 2. Direct session lookup
    {
      DeleteRequest: {
        Key: {
          PK: CalendarPK.SESSION,
          SK: sessionId,
        },
      },
    },
    // 3. Status lookup
    {
      DeleteRequest: {
        Key: {
          PK: `STATUS#${session.status}`,
          SK: `${session.scheduledStartTime}#${sessionId}`,
        },
      },
    },
  ];

  // 4. Instant code lookup (if exists)
  if (session.instantMeetingCode) {
    deleteRequests.push({
      DeleteRequest: {
        Key: {
          PK: `INSTANT#${session.instantMeetingCode}`,
          SK: sessionId,
        },
      },
    });
  }

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CALENDAR]: deleteRequests,
      },
    })
  );

  console.log('[DBG][liveSessionRepository] Session deleted:', sessionId);
  return true;
}

/**
 * Map DynamoDB item to LiveSession type
 */
function mapToLiveSession(item: Record<string, unknown>): LiveSession {
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    expertName: item.expertName as string,
    expertAvatar: item.expertAvatar as string | undefined,
    title: item.title as string,
    description: item.description as string,
    thumbnail: item.thumbnail as string | undefined,
    sessionType: item.sessionType as LiveSessionType,
    instantMeetingCode: item.instantMeetingCode as string | undefined,
    scheduledStartTime: item.scheduledStartTime as string,
    scheduledEndTime: item.scheduledEndTime as string,
    actualStartTime: item.actualStartTime as string | undefined,
    actualEndTime: item.actualEndTime as string | undefined,
    maxParticipants: item.maxParticipants as number | undefined,
    currentViewers: (item.currentViewers as number) ?? 0,
    price: item.price as number,
    currency: (item.currency as string) ?? 'INR',
    meetingLink: item.meetingLink as string | undefined,
    meetingPlatform: item.meetingPlatform as 'zoom' | 'google-meet' | 'other' | undefined,
    status: item.status as LiveSessionStatus,
    recordingS3Key: item.recordingS3Key as string | undefined,
    recordedLessonId: item.recordedLessonId as string | undefined,
    recordingAvailable: (item.recordingAvailable as boolean) ?? false,
    enrolledCount: (item.enrolledCount as number) ?? 0,
    attendedCount: (item.attendedCount as number) ?? 0,
    metadata: item.metadata as LiveSessionMetadata | undefined,
    scheduledByUserId: item.scheduledByUserId as string | undefined,
    scheduledByName: item.scheduledByName as string | undefined,
    scheduledByRole: item.scheduledByRole as 'student' | 'expert' | undefined,
    featured: (item.featured as boolean) ?? false,
    isFree: (item.isFree as boolean) ?? true,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
