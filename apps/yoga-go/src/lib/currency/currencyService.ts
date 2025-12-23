import type { SupportedCurrency, PriceDisplayInfo, ExchangeRateCache } from '@/types';
import { FALLBACK_EXCHANGE_RATES, getCurrencyConfig, normalizeCurrency } from '@/config/currencies';

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// Open Exchange Rates API endpoint
const OPEN_EXCHANGE_RATES_URL = 'https://openexchangerates.org/api/latest.json';

// In-memory cache for client-side usage
let memoryCache: { rates: Record<string, number>; expiresAt: number } | null = null;

/**
 * Fetch fresh exchange rates from Open Exchange Rates API
 * Returns rates relative to USD
 */
export async function fetchExchangeRatesFromAPI(): Promise<Record<string, number>> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;

  if (!appId) {
    console.warn('[DBG][currencyService] OPEN_EXCHANGE_RATES_APP_ID not set, using fallback rates');
    return FALLBACK_EXCHANGE_RATES;
  }

  try {
    const response = await fetch(`${OPEN_EXCHANGE_RATES_URL}?app_id=${appId}`, {
      next: { revalidate: CACHE_DURATION_MS / 1000 }, // Next.js caching
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.rates) {
      throw new Error('Invalid API response: missing rates');
    }

    console.log('[DBG][currencyService] Successfully fetched exchange rates');
    return data.rates;
  } catch (error) {
    console.error('[DBG][currencyService] Failed to fetch exchange rates:', error);
    throw error;
  }
}

/**
 * Get exchange rates with caching
 * Server-side: Uses DynamoDB cache via repository
 * Client-side: Uses in-memory cache
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  // Check in-memory cache first (for client-side)
  if (memoryCache && Date.now() < memoryCache.expiresAt) {
    return memoryCache.rates;
  }

  try {
    // Try to fetch fresh rates
    const rates = await fetchExchangeRatesFromAPI();

    // Update memory cache
    memoryCache = {
      rates,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    };

    return rates;
  } catch (error) {
    console.error('[DBG][currencyService] Error getting exchange rates:', error);

    // Return stale cache if available
    if (memoryCache) {
      console.warn('[DBG][currencyService] Using stale cached rates');
      return memoryCache.rates;
    }

    // Ultimate fallback
    console.warn('[DBG][currencyService] Using hardcoded fallback rates');
    return FALLBACK_EXCHANGE_RATES;
  }
}

/**
 * Set exchange rates in memory cache (for client-side initialization)
 */
export function setExchangeRatesCache(rates: Record<string, number>): void {
  memoryCache = {
    rates,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  };
}

/**
 * Convert amount from one currency to another
 * All rates are relative to USD, so conversion goes: source -> USD -> target
 */
export function convertAmount(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  // Convert: amount in source -> USD -> target
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;

  return convertedAmount;
}

/**
 * Format a price with the correct currency symbol and locale
 */
export function formatPrice(
  amount: number,
  currency: SupportedCurrency,
  options?: {
    showDecimals?: boolean;
    compact?: boolean;
  }
): string {
  const config = getCurrencyConfig(currency);
  const { showDecimals = true, compact = false } = options || {};

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: showDecimals ? config.decimalPlaces : 0,
      maximumFractionDigits: showDecimals ? config.decimalPlaces : 0,
      notation: compact ? 'compact' : 'standard',
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback formatting
    console.error('[DBG][currencyService] Error formatting price:', error);
    return `${config.symbol}${amount.toFixed(config.decimalPlaces)}`;
  }
}

/**
 * Get complete price display information for UI components
 * Returns both original and converted amounts with formatting
 */
export async function getPriceDisplayInfo(
  originalAmount: number,
  originalCurrency: SupportedCurrency,
  displayCurrency?: SupportedCurrency
): Promise<PriceDisplayInfo> {
  const safeCurrency = normalizeCurrency(originalCurrency);
  const safeDisplayCurrency = displayCurrency ? normalizeCurrency(displayCurrency) : safeCurrency;

  // If same currency, no conversion needed
  if (safeCurrency === safeDisplayCurrency) {
    return {
      originalAmount,
      originalCurrency: safeCurrency,
      isApproximate: false,
      formattedOriginal: formatPrice(originalAmount, safeCurrency),
    };
  }

  // Get exchange rates and convert
  const rates = await getExchangeRates();
  const convertedAmount = convertAmount(originalAmount, safeCurrency, safeDisplayCurrency, rates);
  const exchangeRate = rates[safeDisplayCurrency] / rates[safeCurrency];

  return {
    originalAmount,
    originalCurrency: safeCurrency,
    convertedAmount,
    convertedCurrency: safeDisplayCurrency,
    exchangeRate,
    isApproximate: true,
    formattedOriginal: formatPrice(originalAmount, safeCurrency),
    formattedConverted: formatPrice(convertedAmount, safeDisplayCurrency),
  };
}

/**
 * Synchronous version for when rates are already available
 */
export function getPriceDisplayInfoSync(
  originalAmount: number,
  originalCurrency: SupportedCurrency,
  displayCurrency: SupportedCurrency | undefined,
  rates: Record<string, number>
): PriceDisplayInfo {
  const safeCurrency = normalizeCurrency(originalCurrency);
  const safeDisplayCurrency = displayCurrency ? normalizeCurrency(displayCurrency) : safeCurrency;

  // If same currency, no conversion needed
  if (safeCurrency === safeDisplayCurrency) {
    return {
      originalAmount,
      originalCurrency: safeCurrency,
      isApproximate: false,
      formattedOriginal: formatPrice(originalAmount, safeCurrency),
    };
  }

  // Convert using provided rates
  const convertedAmount = convertAmount(originalAmount, safeCurrency, safeDisplayCurrency, rates);
  const exchangeRate = (rates[safeDisplayCurrency] || 1) / (rates[safeCurrency] || 1);

  return {
    originalAmount,
    originalCurrency: safeCurrency,
    convertedAmount,
    convertedCurrency: safeDisplayCurrency,
    exchangeRate,
    isApproximate: true,
    formattedOriginal: formatPrice(originalAmount, safeCurrency),
    formattedConverted: formatPrice(convertedAmount, safeDisplayCurrency),
  };
}

/**
 * Create an ExchangeRateCache object for DynamoDB storage
 */
export function createExchangeRateCache(
  baseCurrency: string,
  rates: Record<string, number>
): Omit<ExchangeRateCache, 'id' | 'createdAt' | 'updatedAt'> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);

  return {
    baseCurrency,
    rates,
    fetchedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Check if an ExchangeRateCache is still valid (not expired)
 */
export function isCacheValid(cache: ExchangeRateCache | null): boolean {
  if (!cache) return false;
  return new Date(cache.expiresAt) > new Date();
}
