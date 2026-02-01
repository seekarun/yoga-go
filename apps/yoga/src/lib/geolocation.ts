/**
 * Detect user's country to determine which payment gateway to use
 * Priority: User profile > IP geolocation > Timezone heuristic > Default
 */

import type { SupportedCurrency } from '@/types';
import { getCurrencyForCountry, getCurrencySymbol } from '@/config/currencies';

export interface GeoLocationResult {
  countryCode: string;
  currency: SupportedCurrency;
  timezone: string;
}

/**
 * Detect user's country from IP geolocation
 */
export async function detectUserCountry(): Promise<string> {
  try {
    // Try IP-based geolocation (using ipapi.co free tier)
    const response = await fetch('https://ipapi.co/json/');

    if (!response.ok) {
      throw new Error('Geolocation API failed');
    }

    const data = await response.json();
    return data.country_code || 'US'; // Returns 'IN', 'US', etc.
  } catch (error) {
    console.error('[Geolocation] Failed to detect country via IP:', error);

    // Fallback to timezone heuristic
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Check if timezone suggests India
      if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Calcutta')) {
        return 'IN';
      }

      // Add more timezone mappings for better detection
      if (timezone.includes('Europe/London')) return 'GB';
      if (timezone.includes('Europe/Paris') || timezone.includes('Europe/Berlin')) return 'DE';
      if (timezone.includes('Australia/Sydney') || timezone.includes('Australia/Melbourne'))
        return 'AU';
      if (timezone.includes('Asia/Singapore')) return 'SG';
      if (timezone.includes('America/Toronto')) return 'CA';
      if (timezone.includes('Asia/Dubai')) return 'AE';
    } catch (timezoneError) {
      console.error('[Geolocation] Timezone detection failed:', timezoneError);
    }

    // Default to US for international users
    return 'US';
  }
}

/**
 * Detect user's full location info including currency
 */
export async function detectUserLocation(): Promise<GeoLocationResult> {
  const countryCode = await detectUserCountry();
  const currency = getCurrencyForCountry(countryCode);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    countryCode,
    currency,
    timezone,
  };
}

/**
 * Get payment gateway based on learner's country
 * Uses Razorpay only for India, Stripe for everything else
 */
export function getPaymentGateway(countryCode: string): 'razorpay' | 'stripe' {
  return countryCode === 'IN' ? 'razorpay' : 'stripe';
}

/**
 * Get payment gateway for a transaction based on learner and expert currencies
 * Uses Razorpay only if both learner is in India AND expert's currency is INR
 */
export function getPaymentGatewayForTransaction(
  learnerCountry: string,
  expertCurrency: SupportedCurrency
): 'razorpay' | 'stripe' {
  // Only use Razorpay if learner is in India AND expert charges in INR
  if (learnerCountry === 'IN' && expertCurrency === 'INR') {
    return 'razorpay';
  }
  return 'stripe';
}

/**
 * Get currency for a country (re-exported from config for convenience)
 */
export function getCurrency(countryCode: string): SupportedCurrency {
  return getCurrencyForCountry(countryCode);
}

/**
 * Format price for display (legacy function for backward compatibility)
 * Amount is in smallest unit (paise/cents)
 *
 * For new code, use formatPrice from @/lib/currency/currencyService instead
 */
export function formatPrice(amount: number, currency: 'INR' | 'USD'): string {
  // Amount is in smallest unit (paise/cents)
  const value = amount / 100;
  const symbol = getCurrencySymbol(currency);

  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Format price with full currency support
 * Amount is in smallest unit (paise/cents)
 */
export function formatPriceWithCurrency(amount: number, currency: SupportedCurrency): string {
  // Amount is in smallest unit (paise/cents)
  const value = amount / 100;
  const symbol = getCurrencySymbol(currency);

  // Use 0 decimal places for INR, 2 for others
  const decimals = currency === 'INR' ? 0 : 2;

  return `${symbol}${value.toFixed(decimals)}`;
}
