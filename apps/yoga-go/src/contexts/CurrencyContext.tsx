'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { SupportedCurrency, PriceDisplayInfo } from '@/types';
import { detectUserLocation } from '@/lib/geolocation';
import {
  getPriceDisplayInfoSync,
  setExchangeRatesCache,
  formatPrice,
} from '@/lib/currency/currencyService';
import { FALLBACK_EXCHANGE_RATES, DEFAULT_CURRENCY } from '@/config/currencies';
import { useAuth } from './AuthContext';

interface CurrencyContextType {
  // Current display currency (learner's currency)
  displayCurrency: SupportedCurrency;
  // User's detected country
  userCountry: string;
  // Exchange rates (relative to USD)
  exchangeRates: Record<string, number> | null;
  // Loading state
  loading: boolean;
  // Set display currency manually
  setDisplayCurrency: (currency: SupportedCurrency) => void;
  // Convert price from source currency to display currency
  convertPrice: (amount: number, fromCurrency: SupportedCurrency) => PriceDisplayInfo;
  // Format a price with its currency symbol
  formatPriceAmount: (amount: number, currency: SupportedCurrency) => string;
  // Refresh location detection
  refreshLocation: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [userCountry, setUserCountry] = useState<string>('US');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to get user's preferred currency from auth context
  const { user } = useAuth();

  // Fetch exchange rates from API
  const fetchRates = useCallback(async () => {
    try {
      console.log('[DBG][CurrencyContext] Fetching exchange rates');
      const response = await fetch('/api/currency/rates');
      const data = await response.json();

      if (data.success && data.data?.rates) {
        setExchangeRates(data.data.rates);
        setExchangeRatesCache(data.data.rates);
        console.log('[DBG][CurrencyContext] Exchange rates loaded from:', data.data.source);
      } else {
        throw new Error('Invalid rates response');
      }
    } catch (error) {
      console.error('[DBG][CurrencyContext] Error fetching rates:', error);
      // Use fallback rates
      setExchangeRates(FALLBACK_EXCHANGE_RATES);
      setExchangeRatesCache(FALLBACK_EXCHANGE_RATES);
    }
  }, []);

  // Detect user location and set initial currency
  const detectLocation = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DBG][CurrencyContext] Detecting user location');

      const location = await detectUserLocation();
      setUserCountry(location.countryCode);

      // Use user's saved preference if available, otherwise use detected currency
      if (user?.preferences?.preferredCurrency) {
        console.log(
          '[DBG][CurrencyContext] Using saved currency preference:',
          user.preferences.preferredCurrency
        );
        setDisplayCurrencyState(user.preferences.preferredCurrency);
      } else {
        console.log('[DBG][CurrencyContext] Using detected currency:', location.currency);
        setDisplayCurrencyState(location.currency);
      }
    } catch (error) {
      console.error('[DBG][CurrencyContext] Error detecting location:', error);
      // Keep defaults
    } finally {
      setLoading(false);
    }
  }, [user?.preferences?.preferredCurrency]);

  // Initialize on mount
  useEffect(() => {
    detectLocation();
    fetchRates();
  }, [detectLocation, fetchRates]);

  // Update display currency when user's preference changes
  useEffect(() => {
    if (user?.preferences?.preferredCurrency) {
      setDisplayCurrencyState(user.preferences.preferredCurrency);
    }
  }, [user?.preferences?.preferredCurrency]);

  // Set display currency (manual override)
  const setDisplayCurrency = useCallback(
    async (currency: SupportedCurrency) => {
      console.log('[DBG][CurrencyContext] Setting display currency to:', currency);
      setDisplayCurrencyState(currency);

      // Save to user preferences if logged in
      if (user) {
        try {
          const response = await fetch('/data/app/user/me/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredCurrency: currency }),
          });
          const data = await response.json();
          if (data.success) {
            console.log('[DBG][CurrencyContext] Currency preference saved');
          } else {
            console.error('[DBG][CurrencyContext] Failed to save currency preference:', data.error);
          }
        } catch (error) {
          console.error('[DBG][CurrencyContext] Error saving currency preference:', error);
        }
      }
    },
    [user]
  );

  // Convert price from source currency to display currency
  const convertPrice = useCallback(
    (amount: number, fromCurrency: SupportedCurrency): PriceDisplayInfo => {
      const rates = exchangeRates || FALLBACK_EXCHANGE_RATES;
      return getPriceDisplayInfoSync(amount, fromCurrency, displayCurrency, rates);
    },
    [displayCurrency, exchangeRates]
  );

  // Format price with currency symbol
  const formatPriceAmount = useCallback((amount: number, currency: SupportedCurrency): string => {
    return formatPrice(amount, currency);
  }, []);

  const value: CurrencyContextType = {
    displayCurrency,
    userCountry,
    exchangeRates,
    loading,
    setDisplayCurrency,
    convertPrice,
    formatPriceAmount,
    refreshLocation: detectLocation,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
