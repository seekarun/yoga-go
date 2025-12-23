'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import type { SupportedCurrency } from '@/types';

interface PriceDisplayProps {
  /** Price amount (in the currency's base unit, NOT cents/paise) */
  amount: number;
  /** Currency of the price (expert's currency) */
  currency: SupportedCurrency;
  /** Whether to show the converted price (default: true) */
  showConverted?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class */
  className?: string;
  /** Show "Free" text for zero amount */
  showFreeLabel?: boolean;
}

/**
 * PriceDisplay component
 *
 * Displays a price with optional currency conversion.
 * When the display currency differs from the original currency,
 * shows the converted amount with an "approx." note.
 *
 * Format examples:
 * - Same currency: "$54.00"
 * - Different currency: "~₹4,500 (approx. $54 USD)"
 */
export default function PriceDisplay({
  amount,
  currency,
  showConverted = true,
  size = 'md',
  className = '',
  showFreeLabel = true,
}: PriceDisplayProps) {
  const { convertPrice, displayCurrency, loading } = useCurrency();

  // Handle free items
  if (amount === 0 && showFreeLabel) {
    return (
      <span
        className={`price-display price-display--free ${className}`}
        style={getSizeStyles(size)}
      >
        Free
      </span>
    );
  }

  // Show loading placeholder
  if (loading) {
    return (
      <span
        className={`price-display price-display--loading ${className}`}
        style={getSizeStyles(size)}
      >
        ...
      </span>
    );
  }

  const priceInfo = convertPrice(amount, currency);

  // If same currency or conversion not needed
  if (!showConverted || !priceInfo.isApproximate || currency === displayCurrency) {
    return (
      <span className={`price-display ${className}`} style={getSizeStyles(size)}>
        {priceInfo.formattedOriginal}
      </span>
    );
  }

  // Show both converted and original prices
  return (
    <span className={`price-display price-display--converted ${className}`}>
      <span className="price-display__converted" style={getSizeStyles(size)}>
        ~{priceInfo.formattedConverted}
      </span>
      <span
        className="price-display__original"
        style={{
          fontSize: size === 'lg' ? '14px' : size === 'md' ? '12px' : '10px',
          color: '#666',
          marginLeft: '4px',
        }}
      >
        (approx. {priceInfo.formattedOriginal})
      </span>
    </span>
  );
}

function getSizeStyles(size: 'sm' | 'md' | 'lg'): React.CSSProperties {
  switch (size) {
    case 'sm':
      return { fontSize: '14px', fontWeight: 500 };
    case 'md':
      return { fontSize: '18px', fontWeight: 600 };
    case 'lg':
      return { fontSize: '24px', fontWeight: 700 };
    default:
      return { fontSize: '18px', fontWeight: 600 };
  }
}

/**
 * Compact version of PriceDisplay for tight spaces
 * Only shows the converted amount without the original
 */
export function PriceDisplayCompact({
  amount,
  currency,
  className = '',
  showFreeLabel = true,
}: Omit<PriceDisplayProps, 'size' | 'showConverted'>) {
  const { convertPrice, displayCurrency, loading } = useCurrency();

  if (amount === 0 && showFreeLabel) {
    return <span className={`price-compact ${className}`}>Free</span>;
  }

  if (loading) {
    return <span className={`price-compact ${className}`}>...</span>;
  }

  const priceInfo = convertPrice(amount, currency);

  // Show converted price if different currency, otherwise original
  if (priceInfo.isApproximate && currency !== displayCurrency && priceInfo.formattedConverted) {
    return (
      <span
        className={`price-compact ${className}`}
        title={`Approx. ${priceInfo.formattedOriginal}`}
      >
        ~{priceInfo.formattedConverted}
      </span>
    );
  }

  return <span className={`price-compact ${className}`}>{priceInfo.formattedOriginal}</span>;
}
