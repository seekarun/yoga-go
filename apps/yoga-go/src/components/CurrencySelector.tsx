'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import type { SupportedCurrency } from '@/types';
import { SUPPORTED_CURRENCIES, getSupportedCurrencyList } from '@/config/currencies';

interface CurrencySelectorProps {
  /** Current selected currency (controlled) */
  value?: SupportedCurrency;
  /** Called when currency changes */
  onChange?: (currency: SupportedCurrency) => void;
  /** Visual variant */
  variant?: 'dropdown' | 'inline' | 'compact';
  /** Additional CSS class */
  className?: string;
  /** Label text */
  label?: string;
  /** Show flag emoji (if available) */
  showFlag?: boolean;
}

// Country code to flag emoji mapping
const COUNTRY_FLAGS: Record<SupportedCurrency, string> = {
  USD: '🇺🇸',
  INR: '🇮🇳',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  SGD: '🇸🇬',
  AED: '🇦🇪',
};

/**
 * CurrencySelector component
 *
 * Allows users to select their preferred display currency.
 * Can be controlled (value/onChange) or use CurrencyContext directly.
 */
export default function CurrencySelector({
  value,
  onChange,
  variant = 'dropdown',
  className = '',
  label = 'Currency',
  showFlag = true,
}: CurrencySelectorProps) {
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  // Use controlled value if provided, otherwise use context
  const currentCurrency = value ?? displayCurrency;
  const handleChange = onChange ?? setDisplayCurrency;

  const currencies = getSupportedCurrencyList();

  if (variant === 'compact') {
    return (
      <select
        value={currentCurrency}
        onChange={e => handleChange(e.target.value as SupportedCurrency)}
        className={`currency-selector currency-selector--compact ${className}`}
        style={{
          padding: '4px 8px',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          fontSize: '13px',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        {currencies.map(currency => (
          <option key={currency.code} value={currency.code}>
            {showFlag && COUNTRY_FLAGS[currency.code]} {currency.symbol}
          </option>
        ))}
      </select>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`currency-selector currency-selector--inline ${className}`}>
        {currencies.map(currency => (
          <button
            key={currency.code}
            type="button"
            onClick={() => handleChange(currency.code)}
            style={{
              padding: '8px 12px',
              margin: '4px',
              border: currentCurrency === currency.code ? '2px solid #111' : '1px solid #e2e8f0',
              borderRadius: '8px',
              background: currentCurrency === currency.code ? '#f8fafc' : '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: currentCurrency === currency.code ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {showFlag && <span style={{ marginRight: '4px' }}>{COUNTRY_FLAGS[currency.code]}</span>}
            {currency.symbol} {currency.code}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`currency-selector currency-selector--dropdown ${className}`}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '8px',
          }}
        >
          {label}
        </label>
      )}
      <select
        value={currentCurrency}
        onChange={e => handleChange(e.target.value as SupportedCurrency)}
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '14px',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        {currencies.map(currency => (
          <option key={currency.code} value={currency.code}>
            {showFlag && COUNTRY_FLAGS[currency.code]} {currency.symbol} {currency.name} (
            {currency.code})
          </option>
        ))}
      </select>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
        Prices will be displayed in your selected currency
      </div>
    </div>
  );
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbolDisplay(currency: SupportedCurrency): string {
  return SUPPORTED_CURRENCIES[currency].symbol;
}

/**
 * Get currency with flag for display
 */
export function getCurrencyWithFlag(currency: SupportedCurrency): string {
  return `${COUNTRY_FLAGS[currency]} ${SUPPORTED_CURRENCIES[currency].symbol}`;
}
