import type { SupportedCurrency, CurrencyConfig } from '@/types';

// Supported currency configurations
export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    locale: 'en-US',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimalPlaces: 0,
    locale: 'en-IN',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
    locale: 'en-GB',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimalPlaces: 2,
    locale: 'en-AU',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimalPlaces: 2,
    locale: 'en-CA',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    decimalPlaces: 2,
    locale: 'en-SG',
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimalPlaces: 2,
    locale: 'ar-AE',
  },
};

// Map country codes to their default currencies
export const COUNTRY_CURRENCY_MAP: Record<string, SupportedCurrency> = {
  // North America
  US: 'USD',
  CA: 'CAD',

  // Europe
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',

  // Asia Pacific
  IN: 'INR',
  AU: 'AUD',
  SG: 'SGD',
  NZ: 'AUD', // New Zealand uses AUD for simplicity

  // Middle East
  AE: 'AED',
  SA: 'AED', // Saudi uses AED for simplicity
  QA: 'AED', // Qatar uses AED for simplicity
  KW: 'AED', // Kuwait uses AED for simplicity
  BH: 'AED', // Bahrain uses AED for simplicity
  OM: 'AED', // Oman uses AED for simplicity
};

// Default currency for unknown countries
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

// Fallback exchange rates (used when API fails and no cache)
export const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  CAD: 1.36,
  SGD: 1.34,
  AED: 3.67,
};

/**
 * Get the currency for a given country code
 */
export function getCurrencyForCountry(countryCode: string): SupportedCurrency {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return currency in SUPPORTED_CURRENCIES;
}

/**
 * Normalize a currency string to SupportedCurrency type
 * Returns USD if the currency is not supported
 */
export function normalizeCurrency(currency: string | undefined): SupportedCurrency {
  if (!currency) {
    return DEFAULT_CURRENCY;
  }
  const upper = currency.toUpperCase();
  if (isSupportedCurrency(upper)) {
    return upper;
  }
  console.warn(`[DBG][currencies] Unsupported currency "${currency}", defaulting to USD`);
  return DEFAULT_CURRENCY;
}

/**
 * Get currency configuration
 */
export function getCurrencyConfig(currency: SupportedCurrency): CurrencyConfig {
  return SUPPORTED_CURRENCIES[currency];
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  return SUPPORTED_CURRENCIES[currency].symbol;
}

/**
 * Get all supported currencies as an array (for dropdowns)
 */
export function getSupportedCurrencyList(): CurrencyConfig[] {
  return Object.values(SUPPORTED_CURRENCIES);
}
