/**
 * DiscussionVote repository for DynamoDB operations
 * Handles CRUD operations for discussion votes
 *
 * 5-Table Design - DISCUSSIONS table with dual-write pattern:
 * - Vote by discussion: PK=VOTE#{discussionId}, SK={userId}
 * - User's votes: PK=USERVOTE#{userId}, SK={discussionId}
 */

import { docClient, Tables, DiscussionsPK, EntityType } from '../dynamodb';
import {
  GetCommand,
  QueryCommand,
  BatchWriteCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DiscussionVote, VoteType } from '@/types';

/**
 * Create or update a vote
 * Uses dual-write pattern for efficient lookups
 */
export async function upsertVote(
  discussionId: string,
  userId: string,
  voteType: VoteType
): Promise<DiscussionVote> {
  console.log('[DBG][discussionVoteRepository] Upserting vote:', {
    discussionId,
    userId,
    voteType,
  });

  const now = new Date().toISOString();
  const voteId = `${discussionId}#${userId}`;

  const vote: DiscussionVote = {
    id: voteId,
    discussionId,
    userId,
    voteType,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Multiple items for different access patterns
  const writeRequests = [
    // 1. Votes by discussion: PK=VOTE#{discussionId}, SK={userId}
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.VOTES(discussionId),
          SK: userId,
          entityType: EntityType.VOTE,
          ...vote,
        },
      },
    },
    // 2. User's votes: PK=USERVOTE#{userId}, SK={discussionId}
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.USER_VOTES(userId),
          SK: discussionId,
          entityType: EntityType.VOTE,
          ...vote,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.DISCUSSIONS]: writeRequests,
      },
    })
  );

  console.log('[DBG][discussionVoteRepository] Vote upserted:', voteId);
  return vote;
}

/**
 * Get a vote by discussionId and userId
 */
export async function getVote(
  discussionId: string,
  userId: string
): Promise<DiscussionVote | null> {
  console.log('[DBG][discussionVoteRepository] Getting vote:', { discussionId, userId });

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.DISCUSSIONS,
      Key: {
        PK: DiscussionsPK.VOTES(discussionId),
        SK: userId,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][discussionVoteRepository] Vote not found');
    return null;
  }

  return mapToVote(result.Item);
}

/**
 * Get all votes for a discussion
 */
export async function getVotesByDiscussion(discussionId: string): Promise<DiscussionVote[]> {
  console.log('[DBG][discussionVoteRepository] Getting votes for discussion:', discussionId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': DiscussionsPK.VOTES(discussionId),
      },
    })
  );

  const votes = (result.Items || []).map(mapToVote);
  console.log('[DBG][discussionVoteRepository] Found', votes.length, 'votes');
  return votes;
}

/**
 * Get all votes by a user
 * Uses dual-write user votes lookup - efficient O(n) where n is user's votes
 */
export async function getVotesByUser(userId: string): Promise<DiscussionVote[]> {
  console.log('[DBG][discussionVoteRepository] Getting votes for user:', userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': DiscussionsPK.USER_VOTES(userId),
      },
    })
  );

  const votes = (result.Items || []).map(mapToVote);
  console.log('[DBG][discussionVoteRepository] Found', votes.length, 'votes for user');
  return votes;
}

/**
 * Get user's votes for multiple discussions
 * Uses BatchGetItem for efficient lookup of specific votes
 */
export async function getUserVotesForDiscussions(
  userId: string,
  discussionIds: string[]
): Promise<Map<string, VoteType>> {
  console.log(
    '[DBG][discussionVoteRepository] Getting user votes for discussions:',
    discussionIds.length
  );

  if (discussionIds.length === 0) {
    return new Map<string, VoteType>();
  }

  // Use BatchGetItem for efficient lookup of specific votes
  // DynamoDB BatchGetItem can handle max 100 items at a time
  const voteMap = new Map<string, VoteType>();
  const batchSize = 100;

  for (let i = 0; i < discussionIds.length; i += batchSize) {
    const batch = discussionIds.slice(i, i + batchSize);

    const keys = batch.map(discussionId => ({
      PK: DiscussionsPK.VOTES(discussionId),
      SK: userId,
    }));

    const result = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [Tables.DISCUSSIONS]: {
            Keys: keys,
          },
        },
      })
    );

    const items = result.Responses?.[Tables.DISCUSSIONS] || [];
    for (const item of items) {
      const vote = mapToVote(item);
      voteMap.set(vote.discussionId, vote.voteType);
    }
  }

  console.log('[DBG][discussionVoteRepository] Found', voteMap.size, 'matching votes');
  return voteMap;
}

/**
 * Delete a vote
 * Deletes both dual-write copies
 */
export async function deleteVote(discussionId: string, userId: string): Promise<boolean> {
  console.log('[DBG][discussionVoteRepository] Deleting vote:', { discussionId, userId });

  const deleteRequests = [
    // 1. Votes by discussion
    {
      DeleteRequest: {
        Key: {
          PK: DiscussionsPK.VOTES(discussionId),
          SK: userId,
        },
      },
    },
    // 2. User's votes
    {
      DeleteRequest: {
        Key: {
          PK: DiscussionsPK.USER_VOTES(userId),
          SK: discussionId,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.DISCUSSIONS]: deleteRequests,
      },
    })
  );

  console.log('[DBG][discussionVoteRepository] Vote deleted');
  return true;
}

/**
 * Map DynamoDB item to DiscussionVote type
 */
function mapToVote(item: Record<string, unknown>): DiscussionVote {
  return {
    id: item.id as string,
    discussionId: item.discussionId as string,
    userId: item.userId as string,
    voteType: item.voteType as VoteType,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
