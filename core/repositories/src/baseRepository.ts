/**
 * Base Repository Pattern
 *
 * Provides common patterns for DynamoDB repository operations.
 * Apps extend these patterns with their specific table configurations.
 */

import type { BaseEntity } from "@core/types";

/**
 * Base interface for DynamoDB items with PK/SK
 */
export interface DynamoDBItem {
  PK: string;
  SK: string;
  entityType?: string;
}

/**
 * Removes DynamoDB-specific fields from an item
 */
export function stripDynamoDBFields<T extends DynamoDBItem>(
  item: T,
): Omit<T, "PK" | "SK" | "entityType"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, entityType, ...rest } = item;
  return rest;
}

/**
 * Creates a timestamped entity with createdAt and updatedAt
 */
export function createTimestampedEntity<T extends Partial<BaseEntity>>(
  entity: T,
): T & { createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  return {
    ...entity,
    createdAt: entity.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Updates the updatedAt timestamp
 */
export function updateTimestamp<T extends Partial<BaseEntity>>(
  entity: T,
): T & { updatedAt: string } {
  return {
    ...entity,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pagination helper
 */
export interface PaginationOptions {
  limit?: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  lastEvaluatedKey?: Record<string, unknown>;
  hasMore: boolean;
}

/**
 * Creates a paginated result from DynamoDB response
 */
export function createPaginatedResult<T>(
  items: T[],
  lastEvaluatedKey?: Record<string, unknown>,
): PaginatedResult<T> {
  return {
    items,
    lastEvaluatedKey,
    hasMore: !!lastEvaluatedKey,
  };
}
