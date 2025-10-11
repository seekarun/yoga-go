'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { detectUserCountry, getPaymentGateway, getCurrency } from '@/lib/geolocation';
import type { PaymentGateway } from '@/config/payment';

interface PaymentContextType {
  gateway: PaymentGateway;
  country: string;
  currency: 'INR' | 'USD';
  loading: boolean;
  refreshLocation: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [gateway, setGateway] = useState<PaymentGateway>('stripe');
  const [country, setCountry] = useState<string>('US');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('USD');
  const [loading, setLoading] = useState(true);

  const detectLocation = async () => {
    try {
      setLoading(true);
      const detectedCountry = await detectUserCountry();
      const detectedGateway = getPaymentGateway(detectedCountry);
      const detectedCurrency = getCurrency(detectedCountry);

      setCountry(detectedCountry);
      setGateway(detectedGateway);
      setCurrency(detectedCurrency);
    } catch (error) {
      console.error('[PaymentContext] Error detecting location:', error);
      // Keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const value = {
    gateway,
    country,
    currency,
    loading,
    refreshLocation: detectLocation,
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
