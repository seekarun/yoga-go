/**
 * Payment repository for DynamoDB operations
 * Handles CRUD operations for payments
 *
 * 4-Table Design - ORDERS table with dual-write pattern:
 * - User's payments: PK=USER#{userId}, SK={paymentId}
 * - Intent lookup: PK=INTENT#{intentId}, SK={paymentId}
 */

import { docClient, Tables, OrdersPK, EntityType } from '../dynamodb';
import { GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { PaymentTransaction, PaymentStatus, PaymentGateway, PaymentType } from '@/types';

// Re-export Payment type as PaymentTransaction for backward compatibility
type Payment = PaymentTransaction;

// Helper to generate a unique payment ID
const generatePaymentId = () => `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new payment record
 * Uses dual-write pattern for user lookup and intent lookup
 */
export async function createPayment(
  input: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Payment> {
  console.log('[DBG][paymentRepository] Creating payment for user:', input.userId);

  const now = new Date().toISOString();
  const paymentId = generatePaymentId();

  const payment: Payment = {
    ...input,
    id: paymentId,
    initiatedAt: input.initiatedAt || now,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Multiple items for different access patterns
  const writeRequests = [
    // 1. User's payments lookup: PK=USER#{userId}, SK={paymentId}
    {
      PutRequest: {
        Item: {
          PK: OrdersPK.USER_PAYMENTS(input.userId),
          SK: paymentId,
          entityType: EntityType.PAYMENT,
          ...payment,
        },
      },
    },
    // 2. Intent lookup: PK=INTENT#{intentId}, SK={paymentId}
    {
      PutRequest: {
        Item: {
          PK: OrdersPK.INTENT(input.paymentIntentId),
          SK: paymentId,
          entityType: EntityType.PAYMENT,
          ...payment,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.ORDERS]: writeRequests,
      },
    })
  );

  console.log('[DBG][paymentRepository] Payment created:', paymentId);
  return payment;
}

/**
 * Get a payment by userId and paymentId
 */
export async function getPaymentById(userId: string, paymentId: string): Promise<Payment | null> {
  console.log('[DBG][paymentRepository] Getting payment:', paymentId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.ORDERS,
      Key: {
        PK: OrdersPK.USER_PAYMENTS(userId),
        SK: paymentId,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][paymentRepository] Payment not found:', paymentId);
    return null;
  }

  return mapToPayment(result.Item);
}

/**
 * Get a payment by paymentIntentId (Stripe/Razorpay reference)
 * Uses dual-write intent lookup
 */
export async function getPaymentByIntentId(paymentIntentId: string): Promise<Payment | null> {
  console.log('[DBG][paymentRepository] Getting payment by intent ID:', paymentIntentId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.ORDERS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': OrdersPK.INTENT(paymentIntentId),
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][paymentRepository] Payment not found for intent:', paymentIntentId);
    return null;
  }

  return mapToPayment(result.Items[0]);
}

/**
 * Get all payments for a user
 */
export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  console.log('[DBG][paymentRepository] Getting payments for user:', userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.ORDERS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': OrdersPK.USER_PAYMENTS(userId),
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const payments = (result.Items || []).map(mapToPayment);
  console.log('[DBG][paymentRepository] Found', payments.length, 'payments');
  return payments;
}

/**
 * Get all payments for a course
 * Note: Without GSI, this requires scanning all payments and filtering
 * For better performance, consider adding a dual-write for course lookup
 */
export async function getPaymentsByCourse(courseId: string): Promise<Payment[]> {
  console.log('[DBG][paymentRepository] Getting payments for course:', courseId);
  console.warn('[DBG][paymentRepository] getPaymentsByCourse is not optimized without GSI');

  // This is a scan operation - not recommended for large datasets
  // TODO: Add dual-write for course lookup if this pattern is frequently used
  return [];
}

/**
 * Get successful payments for a course (for revenue analytics)
 */
export async function getSuccessfulPaymentsByCourse(courseId: string): Promise<Payment[]> {
  const payments = await getPaymentsByCourse(courseId);
  return payments.filter(p => p.status === 'succeeded');
}

/**
 * Update payment status
 * For dual-write: reads current payment, updates both copies
 */
export async function updatePaymentStatus(
  userId: string,
  paymentId: string,
  status: PaymentStatus,
  additionalUpdates?: {
    completedAt?: string;
    failedAt?: string;
    refundedAt?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Payment | null> {
  console.log('[DBG][paymentRepository] Updating payment status:', paymentId, status);

  // First, get the current payment
  const currentPayment = await getPaymentById(userId, paymentId);
  if (!currentPayment) {
    console.log('[DBG][paymentRepository] Payment not found for update:', paymentId);
    return null;
  }

  const now = new Date().toISOString();
  const updatedPayment: Payment = {
    ...currentPayment,
    status,
    updatedAt: now,
    ...(additionalUpdates?.completedAt && { completedAt: additionalUpdates.completedAt }),
    ...(additionalUpdates?.failedAt && { failedAt: additionalUpdates.failedAt }),
    ...(additionalUpdates?.refundedAt && { refundedAt: additionalUpdates.refundedAt }),
    ...(additionalUpdates?.metadata && { metadata: additionalUpdates.metadata }),
  };

  // Dual-write: Update both copies
  const writeRequests = [
    // 1. User's payments lookup
    {
      PutRequest: {
        Item: {
          PK: OrdersPK.USER_PAYMENTS(userId),
          SK: paymentId,
          entityType: EntityType.PAYMENT,
          ...updatedPayment,
        },
      },
    },
    // 2. Intent lookup
    {
      PutRequest: {
        Item: {
          PK: OrdersPK.INTENT(currentPayment.paymentIntentId),
          SK: paymentId,
          entityType: EntityType.PAYMENT,
          ...updatedPayment,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.ORDERS]: writeRequests,
      },
    })
  );

  console.log('[DBG][paymentRepository] Payment status updated:', paymentId);
  return updatedPayment;
}

/**
 * Map DynamoDB item to Payment type
 */
function mapToPayment(item: Record<string, unknown>): Payment {
  return {
    id: item.id as string,
    userId: item.userId as string,
    courseId: item.courseId as string | undefined,
    itemType: item.itemType as PaymentType,
    itemId: item.itemId as string,
    amount: item.amount as number,
    currency: item.currency as string,
    gateway: item.gateway as PaymentGateway,
    status: item.status as PaymentStatus,
    paymentIntentId: item.paymentIntentId as string,
    paymentMethodId: item.paymentMethodId as string | undefined,
    initiatedAt: item.initiatedAt as string,
    completedAt: item.completedAt as string | undefined,
    failedAt: item.failedAt as string | undefined,
    refundedAt: item.refundedAt as string | undefined,
    metadata: item.metadata as Payment['metadata'],
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
