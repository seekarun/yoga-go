// Currency Types - Generic currency and pricing types

import type { BaseEntity } from "./base";

/**
 * Supported currencies - can be extended by verticals
 */
export type SupportedCurrency =
  | "USD"
  | "INR"
  | "EUR"
  | "GBP"
  | "AUD"
  | "CAD"
  | "SGD"
  | "AED";

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  decimalPlaces: number;
  locale: string;
}

/**
 * Exchange rate cache for DynamoDB storage
 */
export interface ExchangeRateCache extends BaseEntity {
  baseCurrency: string;
  rates: Record<string, number>;
  fetchedAt: string;
  expiresAt: string;
}

/**
 * Price display information for UI components
 */
export interface PriceDisplayInfo {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  convertedAmount?: number;
  convertedCurrency?: SupportedCurrency;
  exchangeRate?: number;
  isApproximate: boolean;
  formattedOriginal: string;
  formattedConverted?: string;
}
