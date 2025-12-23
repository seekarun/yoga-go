/**
 * Currency module exports
 */

// Currency service functions
export {
  fetchExchangeRatesFromAPI,
  getExchangeRates,
  setExchangeRatesCache,
  convertAmount,
  formatPrice,
  getPriceDisplayInfo,
  getPriceDisplayInfoSync,
  createExchangeRateCache,
  isCacheValid,
} from './currencyService';

// Re-export config for convenience
export {
  SUPPORTED_CURRENCIES,
  COUNTRY_CURRENCY_MAP,
  DEFAULT_CURRENCY,
  FALLBACK_EXCHANGE_RATES,
  getCurrencyForCountry,
  isSupportedCurrency,
  normalizeCurrency,
  getCurrencyConfig,
  getCurrencySymbol,
  getSupportedCurrencyList,
} from '@/config/currencies';

// Re-export types
export type {
  SupportedCurrency,
  CurrencyConfig,
  ExchangeRateCache,
  PriceDisplayInfo,
} from '@/types';
