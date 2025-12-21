/**
 * Wallet repository for DynamoDB operations
 * Handles CRUD operations for expert wallets and transactions
 *
 * BOOST Table Access Patterns:
 * - Wallet: PK=WALLET#{expertId}, SK=META
 * - Wallet transactions: PK=WALLET#{expertId}, SK=TXN#{createdAt}#{txnId}
 * - Transaction direct lookup: PK=TXN#{txnId}, SK=META
 */

import { docClient, Tables, BoostPK, EntityType } from '../dynamodb';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ExpertWallet, WalletTransaction, WalletTransactionType } from '@/types';

// Helper to generate unique transaction ID
const generateTxnId = () => `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Get wallet for an expert
 * Returns null if wallet doesn't exist
 */
export async function getWallet(expertId: string): Promise<ExpertWallet | null> {
  console.log('[DBG][walletRepository] Getting wallet for expert:', expertId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.BOOST,
      Key: {
        PK: BoostPK.WALLET(expertId),
        SK: 'META',
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][walletRepository] Wallet not found for expert:', expertId);
    return null;
  }

  return mapToWallet(result.Item);
}

/**
 * Get or create wallet for an expert
 * Creates a new wallet with zero balance if one doesn't exist
 */
export async function getOrCreateWallet(
  expertId: string,
  currency: string = 'USD'
): Promise<ExpertWallet> {
  console.log('[DBG][walletRepository] Getting or creating wallet for expert:', expertId);

  const existingWallet = await getWallet(expertId);
  if (existingWallet) {
    return existingWallet;
  }

  // Create new wallet
  const now = new Date().toISOString();
  const wallet: ExpertWallet = {
    id: `wallet_${expertId}`,
    expertId,
    balance: 0,
    currency,
    totalDeposited: 0,
    totalSpent: 0,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.BOOST,
      Item: {
        PK: BoostPK.WALLET(expertId),
        SK: 'META',
        entityType: EntityType.WALLET,
        ...wallet,
      },
    })
  );

  console.log('[DBG][walletRepository] Wallet created for expert:', expertId);
  return wallet;
}

/**
 * Create a wallet transaction
 * Also updates wallet balance atomically
 */
export async function createTransaction(input: {
  expertId: string;
  type: WalletTransactionType;
  amount: number;
  currency: string;
  paymentIntentId?: string;
  boostId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<WalletTransaction> {
  console.log('[DBG][walletRepository] Creating transaction:', input.type, input.amount);

  const now = new Date().toISOString();
  const txnId = generateTxnId();

  const transaction: WalletTransaction = {
    id: txnId,
    expertId: input.expertId,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    status: 'completed',
    paymentIntentId: input.paymentIntentId,
    boostId: input.boostId,
    description: input.description,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Transaction in wallet partition and direct lookup
  const writeRequests = [
    // 1. Transaction in wallet partition for listing
    {
      PutRequest: {
        Item: {
          PK: BoostPK.WALLET(input.expertId),
          SK: `TXN#${now}#${txnId}`,
          entityType: EntityType.WALLET_TRANSACTION,
          ...transaction,
        },
      },
    },
    // 2. Direct transaction lookup
    {
      PutRequest: {
        Item: {
          PK: BoostPK.TRANSACTION(txnId),
          SK: 'META',
          entityType: EntityType.WALLET_TRANSACTION,
          ...transaction,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.BOOST]: writeRequests,
      },
    })
  );

  // Update wallet balance
  await updateWalletBalance(input.expertId, input.amount, input.type);

  console.log('[DBG][walletRepository] Transaction created:', txnId);
  return transaction;
}

/**
 * Update wallet balance atomically
 */
async function updateWalletBalance(
  expertId: string,
  amount: number,
  type: WalletTransactionType
): Promise<void> {
  console.log('[DBG][walletRepository] Updating wallet balance:', expertId, amount);

  const now = new Date().toISOString();

  // Determine which counters to update
  const isDeposit = type === 'deposit' || type === 'refund';
  const isSpend = type === 'boost_spend';

  let updateExpression =
    'SET balance = balance + :amount, updatedAt = :now, lastTransactionAt = :now';
  const expressionValues: Record<string, unknown> = {
    ':amount': amount,
    ':now': now,
  };

  if (isDeposit && amount > 0) {
    updateExpression += ', totalDeposited = totalDeposited + :absAmount';
    expressionValues[':absAmount'] = Math.abs(amount);
  } else if (isSpend && amount < 0) {
    updateExpression += ', totalSpent = totalSpent + :absAmount';
    expressionValues[':absAmount'] = Math.abs(amount);
  }

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.BOOST,
      Key: {
        PK: BoostPK.WALLET(expertId),
        SK: 'META',
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
    })
  );

  console.log('[DBG][walletRepository] Wallet balance updated');
}

/**
 * Get transactions for an expert
 * Returns transactions in reverse chronological order
 */
export async function getTransactionsByExpert(
  expertId: string,
  limit: number = 50
): Promise<WalletTransaction[]> {
  console.log('[DBG][walletRepository] Getting transactions for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.BOOST,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': BoostPK.WALLET(expertId),
        ':skPrefix': 'TXN#',
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
  );

  const transactions = (result.Items || []).map(mapToTransaction);
  console.log('[DBG][walletRepository] Found', transactions.length, 'transactions');
  return transactions;
}

/**
 * Get a transaction by ID
 */
export async function getTransactionById(txnId: string): Promise<WalletTransaction | null> {
  console.log('[DBG][walletRepository] Getting transaction:', txnId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.BOOST,
      Key: {
        PK: BoostPK.TRANSACTION(txnId),
        SK: 'META',
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][walletRepository] Transaction not found:', txnId);
    return null;
  }

  return mapToTransaction(result.Item);
}

/**
 * Add funds to wallet (deposit)
 * Creates a deposit transaction and updates balance
 */
export async function addFunds(input: {
  expertId: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ wallet: ExpertWallet; transaction: WalletTransaction }> {
  console.log('[DBG][walletRepository] Adding funds:', input.amount);

  // Ensure wallet exists
  await getOrCreateWallet(input.expertId, input.currency);

  // Create deposit transaction
  const transaction = await createTransaction({
    expertId: input.expertId,
    type: 'deposit',
    amount: input.amount, // Positive for deposit
    currency: input.currency,
    paymentIntentId: input.paymentIntentId,
    description: input.description || 'Funds added to wallet',
    metadata: input.metadata,
  });

  // Get updated wallet
  const wallet = await getWallet(input.expertId);
  if (!wallet) {
    throw new Error('Wallet not found after deposit');
  }

  console.log('[DBG][walletRepository] Funds added, new balance:', wallet.balance);
  return { wallet, transaction };
}

/**
 * Debit funds from wallet (for boost spend)
 * Returns error if insufficient balance
 */
export async function debitFunds(input: {
  expertId: string;
  amount: number;
  currency: string;
  boostId: string;
  description?: string;
}): Promise<{ wallet: ExpertWallet; transaction: WalletTransaction } | { error: string }> {
  console.log('[DBG][walletRepository] Debiting funds:', input.amount);

  // Get current wallet
  const wallet = await getWallet(input.expertId);
  if (!wallet) {
    return { error: 'Wallet not found' };
  }

  // Check sufficient balance
  if (wallet.balance < input.amount) {
    console.log('[DBG][walletRepository] Insufficient balance:', wallet.balance, '<', input.amount);
    return { error: 'Insufficient balance' };
  }

  // Create spend transaction (negative amount)
  const transaction = await createTransaction({
    expertId: input.expertId,
    type: 'boost_spend',
    amount: -input.amount, // Negative for spend
    currency: input.currency,
    boostId: input.boostId,
    description: input.description || 'Boost campaign spend',
  });

  // Get updated wallet
  const updatedWallet = await getWallet(input.expertId);
  if (!updatedWallet) {
    throw new Error('Wallet not found after debit');
  }

  console.log('[DBG][walletRepository] Funds debited, new balance:', updatedWallet.balance);
  return { wallet: updatedWallet, transaction };
}

/**
 * Refund funds to wallet (boost cancellation)
 */
export async function refundFunds(input: {
  expertId: string;
  amount: number;
  currency: string;
  boostId: string;
  description?: string;
}): Promise<{ wallet: ExpertWallet; transaction: WalletTransaction }> {
  console.log('[DBG][walletRepository] Refunding funds:', input.amount);

  // Create refund transaction (positive amount)
  const transaction = await createTransaction({
    expertId: input.expertId,
    type: 'refund',
    amount: input.amount, // Positive for refund
    currency: input.currency,
    boostId: input.boostId,
    description: input.description || 'Boost campaign refund',
  });

  // Get updated wallet
  const wallet = await getWallet(input.expertId);
  if (!wallet) {
    throw new Error('Wallet not found after refund');
  }

  console.log('[DBG][walletRepository] Funds refunded, new balance:', wallet.balance);
  return { wallet, transaction };
}

/**
 * Map DynamoDB item to ExpertWallet type
 */
function mapToWallet(item: Record<string, unknown>): ExpertWallet {
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    balance: item.balance as number,
    currency: item.currency as string,
    totalDeposited: item.totalDeposited as number,
    totalSpent: item.totalSpent as number,
    lastTransactionAt: item.lastTransactionAt as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

/**
 * Map DynamoDB item to WalletTransaction type
 */
function mapToTransaction(item: Record<string, unknown>): WalletTransaction {
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    type: item.type as WalletTransaction['type'],
    amount: item.amount as number,
    currency: item.currency as string,
    status: item.status as WalletTransaction['status'],
    paymentIntentId: item.paymentIntentId as string | undefined,
    boostId: item.boostId as string | undefined,
    description: item.description as string | undefined,
    metadata: item.metadata as Record<string, unknown> | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
