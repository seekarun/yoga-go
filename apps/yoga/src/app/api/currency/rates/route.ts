/**
 * Exchange Rates API
 * GET /api/currency/rates
 *
 * Returns current exchange rates for supported currencies.
 * Rates are cached in DynamoDB for 24 hours to minimize API calls.
 */

import { NextResponse } from 'next/server';
import {
  getExchangeRates as getExchangeRatesFromRepository,
  saveExchangeRates,
} from '@/lib/repositories/exchangeRateRepository';
import { fetchExchangeRatesFromAPI } from '@/lib/currency/currencyService';
import { FALLBACK_EXCHANGE_RATES } from '@/config/currencies';

export const dynamic = 'force-dynamic'; // Don't cache this route
export const revalidate = 0;

export async function GET() {
  console.log('[DBG][api/currency/rates] GET request received');

  try {
    // Try to get cached rates from DynamoDB
    const cached = await getExchangeRatesFromRepository('USD');

    if (cached) {
      console.log('[DBG][api/currency/rates] Returning cached rates');
      return NextResponse.json({
        success: true,
        data: {
          baseCurrency: cached.baseCurrency,
          rates: cached.rates,
          fetchedAt: cached.fetchedAt,
          expiresAt: cached.expiresAt,
          source: 'cache',
        },
      });
    }

    // Cache miss or expired - fetch fresh rates
    console.log('[DBG][api/currency/rates] Cache miss, fetching fresh rates');

    try {
      const rates = await fetchExchangeRatesFromAPI();

      // Save to DynamoDB cache
      const savedCache = await saveExchangeRates('USD', rates);

      console.log('[DBG][api/currency/rates] Fresh rates fetched and cached');
      return NextResponse.json({
        success: true,
        data: {
          baseCurrency: savedCache.baseCurrency,
          rates: savedCache.rates,
          fetchedAt: savedCache.fetchedAt,
          expiresAt: savedCache.expiresAt,
          source: 'api',
        },
      });
    } catch (fetchError) {
      console.error('[DBG][api/currency/rates] Error fetching from API:', fetchError);

      // Return fallback rates if API fails
      console.log('[DBG][api/currency/rates] Using fallback rates');
      return NextResponse.json({
        success: true,
        data: {
          baseCurrency: 'USD',
          rates: FALLBACK_EXCHANGE_RATES,
          fetchedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          source: 'fallback',
        },
        warning: 'Using fallback rates due to API unavailability',
      });
    }
  } catch (error) {
    console.error('[DBG][api/currency/rates] Error:', error);

    // Even on complete failure, return fallback rates
    return NextResponse.json({
      success: true,
      data: {
        baseCurrency: 'USD',
        rates: FALLBACK_EXCHANGE_RATES,
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        source: 'fallback',
      },
      warning: 'Using fallback rates due to error',
    });
  }
}
