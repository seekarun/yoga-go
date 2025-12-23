/**
 * Exchange Rate Repository for DynamoDB operations
 * Handles caching of exchange rates from Open Exchange Rates API
 *
 * CORE Table Access Patterns:
 * - Exchange rates: PK=EXCHANGE_RATE, SK={baseCurrency}
 */

import { docClient, Tables, CorePK, EntityType } from '../dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { ExchangeRateCache } from '@/types';

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Get cached exchange rates for a base currency
 * Returns null if not found or expired
 */
export async function getExchangeRates(baseCurrency: string): Promise<ExchangeRateCache | null> {
  console.log('[DBG][exchangeRateRepository] Getting exchange rates for:', baseCurrency);

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: Tables.CORE,
        Key: {
          PK: CorePK.EXCHANGE_RATE,
          SK: baseCurrency.toUpperCase(),
        },
      })
    );

    if (!result.Item) {
      console.log('[DBG][exchangeRateRepository] No cached rates found for:', baseCurrency);
      return null;
    }

    const cache = mapToExchangeRateCache(result.Item);

    // Check if cache is expired
    if (new Date(cache.expiresAt) <= new Date()) {
      console.log('[DBG][exchangeRateRepository] Cached rates expired for:', baseCurrency);
      return null;
    }

    console.log('[DBG][exchangeRateRepository] Found valid cached rates for:', baseCurrency);
    return cache;
  } catch (error) {
    console.error('[DBG][exchangeRateRepository] Error getting exchange rates:', error);
    return null;
  }
}

/**
 * Save exchange rates to cache
 */
export async function saveExchangeRates(
  baseCurrency: string,
  rates: Record<string, number>
): Promise<ExchangeRateCache> {
  console.log('[DBG][exchangeRateRepository] Saving exchange rates for:', baseCurrency);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);

  const cache: ExchangeRateCache = {
    id: `exchange_rate_${baseCurrency.toLowerCase()}`,
    baseCurrency: baseCurrency.toUpperCase(),
    rates,
    fetchedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: {
          PK: CorePK.EXCHANGE_RATE,
          SK: baseCurrency.toUpperCase(),
          entityType: EntityType.EXCHANGE_RATE,
          ...cache,
        },
      })
    );

    console.log('[DBG][exchangeRateRepository] Exchange rates saved successfully');
    return cache;
  } catch (error) {
    console.error('[DBG][exchangeRateRepository] Error saving exchange rates:', error);
    throw error;
  }
}

/**
 * Get or fetch exchange rates
 * Returns cached rates if valid, otherwise fetches fresh rates
 */
export async function getOrFetchExchangeRates(
  baseCurrency: string,
  fetchFn: () => Promise<Record<string, number>>
): Promise<Record<string, number>> {
  console.log('[DBG][exchangeRateRepository] Getting or fetching rates for:', baseCurrency);

  // Try to get cached rates
  const cached = await getExchangeRates(baseCurrency);
  if (cached) {
    console.log('[DBG][exchangeRateRepository] Using cached rates');
    return cached.rates;
  }

  // Fetch fresh rates
  console.log('[DBG][exchangeRateRepository] Fetching fresh rates');
  try {
    const rates = await fetchFn();
    await saveExchangeRates(baseCurrency, rates);
    return rates;
  } catch (error) {
    console.error('[DBG][exchangeRateRepository] Error fetching rates:', error);
    throw error;
  }
}

/**
 * Check if cached rates are still valid (not expired)
 */
export async function isCacheValid(baseCurrency: string): Promise<boolean> {
  const cached = await getExchangeRates(baseCurrency);
  return cached !== null;
}

/**
 * Map DynamoDB item to ExchangeRateCache type
 */
function mapToExchangeRateCache(item: Record<string, unknown>): ExchangeRateCache {
  return {
    id: item.id as string,
    baseCurrency: item.baseCurrency as string,
    rates: item.rates as Record<string, number>,
    fetchedAt: item.fetchedAt as string,
    expiresAt: item.expiresAt as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
