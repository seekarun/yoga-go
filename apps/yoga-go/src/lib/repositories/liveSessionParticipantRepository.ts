/**
 * LiveSessionParticipant repository for DynamoDB operations
 * Handles CRUD operations for live session participants
 *
 * 4-Table Design - CALENDAR table with dual-write pattern:
 * - Session participants: PK=PARTICIPANTS#{sessionId}, SK={participantId}
 * - User's enrolled sessions: PK=ENROLLED#{userId}, SK={sessionId}
 * - Unique constraint: PK=SESSION_USER#{sessionId}#{userId}, SK=PARTICIPANT
 */

import { docClient, Tables, CalendarPK, EntityType } from '../dynamodb';
import { GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { LiveSessionParticipant } from '@/types';

// Helper to generate a unique participant ID
const generateParticipantId = () => `part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new participant record (enrolling in a session)
 * Uses dual-write pattern for multiple access patterns
 */
export async function createParticipant(
  input: Omit<LiveSessionParticipant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LiveSessionParticipant> {
  console.log(
    '[DBG][liveSessionParticipantRepository] Creating participant for session:',
    input.sessionId
  );

  const now = new Date().toISOString();
  const participantId = generateParticipantId();

  const participant: LiveSessionParticipant = {
    ...input,
    id: participantId,
    attended: input.attended ?? false,
    paid: input.paid ?? false,
    watchTime: input.watchTime ?? 0,
    chatMessages: input.chatMessages ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Multiple items for different access patterns
  const writeRequests = [
    // 1. Session participants lookup: PK=PARTICIPANTS#{sessionId}, SK={participantId}
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.PARTICIPANTS(input.sessionId),
          SK: participantId,
          entityType: EntityType.LIVE_PARTICIPANT,
          ...participant,
        },
      },
    },
    // 2. User's enrolled sessions: PK=ENROLLED#{userId}, SK={sessionId}
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.ENROLLED(input.userId),
          SK: input.sessionId,
          entityType: EntityType.LIVE_PARTICIPANT,
          participantId, // For cross-reference
          ...participant,
        },
      },
    },
    // 3. Unique constraint lookup: PK=SESSION_USER#{sessionId}#{userId}, SK=PARTICIPANT
    {
      PutRequest: {
        Item: {
          PK: `SESSION_USER#${input.sessionId}#${input.userId}`,
          SK: 'PARTICIPANT',
          entityType: EntityType.LIVE_PARTICIPANT,
          participantId, // For cross-reference
          ...participant,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CALENDAR]: writeRequests,
      },
    })
  );

  console.log('[DBG][liveSessionParticipantRepository] Participant created:', participantId);
  return participant;
}

/**
 * Get a participant by sessionId and participantId
 */
export async function getParticipantById(
  sessionId: string,
  participantId: string
): Promise<LiveSessionParticipant | null> {
  console.log('[DBG][liveSessionParticipantRepository] Getting participant:', participantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CALENDAR,
      Key: {
        PK: CalendarPK.PARTICIPANTS(sessionId),
        SK: participantId,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][liveSessionParticipantRepository] Participant not found:', participantId);
    return null;
  }

  return mapToParticipant(result.Item);
}

/**
 * Get a participant by ID only
 * Note: With dual-write, we need to scan or maintain an additional index
 * For now, this function requires sessionId to be efficient
 */
export async function getParticipantByIdOnly(
  participantId: string
): Promise<LiveSessionParticipant | null> {
  console.log(
    '[DBG][liveSessionParticipantRepository] Getting participant by ID only:',
    participantId
  );

  // With no GSI, we need to extract sessionId from the participantId
  // or use a scan (not recommended). For now, log a warning.
  console.warn(
    '[DBG][liveSessionParticipantRepository] getParticipantByIdOnly requires sessionId for efficiency'
  );
  return null;
}

/**
 * Get a participant by sessionId and userId (check if user is enrolled)
 * Uses dual-write unique constraint lookup
 */
export async function getParticipantBySessionAndUser(
  sessionId: string,
  userId: string
): Promise<LiveSessionParticipant | null> {
  console.log(
    '[DBG][liveSessionParticipantRepository] Getting participant for session:',
    sessionId,
    'user:',
    userId
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CALENDAR,
      Key: {
        PK: `SESSION_USER#${sessionId}#${userId}`,
        SK: 'PARTICIPANT',
      },
    })
  );

  if (!result.Item) {
    console.log(
      '[DBG][liveSessionParticipantRepository] No participant found for session-user combo'
    );
    return null;
  }

  return mapToParticipant(result.Item);
}

/**
 * Get all participants for a session
 */
export async function getParticipantsBySession(
  sessionId: string
): Promise<LiveSessionParticipant[]> {
  console.log(
    '[DBG][liveSessionParticipantRepository] Getting participants for session:',
    sessionId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CalendarPK.PARTICIPANTS(sessionId),
      },
    })
  );

  const participants = (result.Items || []).map(mapToParticipant);
  console.log('[DBG][liveSessionParticipantRepository] Found', participants.length, 'participants');
  return participants;
}

/**
 * Get sessions a user is enrolled in (uses dual-write enrolled lookup)
 */
export async function getSessionsByUser(userId: string): Promise<LiveSessionParticipant[]> {
  console.log('[DBG][liveSessionParticipantRepository] Getting sessions for user:', userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CalendarPK.ENROLLED(userId),
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const participants = (result.Items || []).map(mapToParticipant);
  console.log(
    '[DBG][liveSessionParticipantRepository] Found',
    participants.length,
    'enrolled sessions'
  );
  return participants;
}

/**
 * Get attended participants for a session
 */
export async function getAttendedParticipantsBySession(
  sessionId: string
): Promise<LiveSessionParticipant[]> {
  const participants = await getParticipantsBySession(sessionId);
  return participants.filter(p => p.attended);
}

/**
 * Update a participant record
 * For dual-write: reads current participant, updates all copies
 */
export async function updateParticipant(
  sessionId: string,
  participantId: string,
  updates: Partial<
    Pick<
      LiveSessionParticipant,
      | 'attended'
      | 'joinedAt'
      | 'leftAt'
      | 'watchTime'
      | 'paid'
      | 'paymentId'
      | 'paymentGateway'
      | 'amountPaid'
      | 'chatMessages'
      | 'feedbackRating'
      | 'feedbackComment'
    >
  >
): Promise<LiveSessionParticipant | null> {
  console.log('[DBG][liveSessionParticipantRepository] Updating participant:', participantId);

  // First, get the current participant
  const currentParticipant = await getParticipantById(sessionId, participantId);
  if (!currentParticipant) {
    console.log(
      '[DBG][liveSessionParticipantRepository] Participant not found for update:',
      participantId
    );
    return null;
  }

  const now = new Date().toISOString();
  const updatedParticipant: LiveSessionParticipant = {
    ...currentParticipant,
    ...updates,
    updatedAt: now,
  };

  // Dual-write: Update all copies
  const writeRequests = [
    // 1. Session participants lookup
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.PARTICIPANTS(sessionId),
          SK: participantId,
          entityType: EntityType.LIVE_PARTICIPANT,
          ...updatedParticipant,
        },
      },
    },
    // 2. User's enrolled sessions
    {
      PutRequest: {
        Item: {
          PK: CalendarPK.ENROLLED(currentParticipant.userId),
          SK: sessionId,
          entityType: EntityType.LIVE_PARTICIPANT,
          participantId,
          ...updatedParticipant,
        },
      },
    },
    // 3. Unique constraint lookup
    {
      PutRequest: {
        Item: {
          PK: `SESSION_USER#${sessionId}#${currentParticipant.userId}`,
          SK: 'PARTICIPANT',
          entityType: EntityType.LIVE_PARTICIPANT,
          participantId,
          ...updatedParticipant,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CALENDAR]: writeRequests,
      },
    })
  );

  console.log('[DBG][liveSessionParticipantRepository] Participant updated:', participantId);
  return updatedParticipant;
}

/**
 * Mark participant as attended
 */
export async function markParticipantAttended(
  sessionId: string,
  participantId: string,
  joinedAt: string
): Promise<LiveSessionParticipant | null> {
  return updateParticipant(sessionId, participantId, {
    attended: true,
    joinedAt,
  });
}

/**
 * Mark participant as left
 */
export async function markParticipantLeft(
  sessionId: string,
  participantId: string,
  leftAt: string,
  watchTime: number
): Promise<LiveSessionParticipant | null> {
  return updateParticipant(sessionId, participantId, {
    leftAt,
    watchTime,
  });
}

/**
 * Delete a participant record
 * Deletes all dual-write copies
 */
export async function deleteParticipant(
  sessionId: string,
  participantId: string
): Promise<boolean> {
  console.log('[DBG][liveSessionParticipantRepository] Deleting participant:', participantId);

  // Get current participant to know all the dual-write keys
  const participant = await getParticipantById(sessionId, participantId);
  if (!participant) {
    console.log(
      '[DBG][liveSessionParticipantRepository] Participant not found for delete:',
      participantId
    );
    return false;
  }

  const deleteRequests = [
    // 1. Session participants lookup
    {
      DeleteRequest: {
        Key: {
          PK: CalendarPK.PARTICIPANTS(sessionId),
          SK: participantId,
        },
      },
    },
    // 2. User's enrolled sessions
    {
      DeleteRequest: {
        Key: {
          PK: CalendarPK.ENROLLED(participant.userId),
          SK: sessionId,
        },
      },
    },
    // 3. Unique constraint lookup
    {
      DeleteRequest: {
        Key: {
          PK: `SESSION_USER#${sessionId}#${participant.userId}`,
          SK: 'PARTICIPANT',
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CALENDAR]: deleteRequests,
      },
    })
  );

  console.log('[DBG][liveSessionParticipantRepository] Participant deleted:', participantId);
  return true;
}

/**
 * Map DynamoDB item to LiveSessionParticipant type
 */
function mapToParticipant(item: Record<string, unknown>): LiveSessionParticipant {
  return {
    id: item.id as string,
    sessionId: item.sessionId as string,
    userId: item.userId as string,
    userName: item.userName as string,
    userEmail: item.userEmail as string,
    userAvatar: item.userAvatar as string | undefined,
    enrolledAt: item.enrolledAt as string,
    attended: (item.attended as boolean) ?? false,
    joinedAt: item.joinedAt as string | undefined,
    leftAt: item.leftAt as string | undefined,
    watchTime: (item.watchTime as number) ?? 0,
    paid: (item.paid as boolean) ?? false,
    paymentId: item.paymentId as string | undefined,
    paymentGateway: item.paymentGateway as 'stripe' | 'razorpay' | undefined,
    amountPaid: item.amountPaid as number | undefined,
    chatMessages: (item.chatMessages as number) ?? 0,
    feedbackRating: item.feedbackRating as number | undefined,
    feedbackComment: item.feedbackComment as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
