/**
 * Detect user's country to determine which payment gateway to use
 * Priority: User profile > IP geolocation > Timezone heuristic > Default
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
      if (
        timezone.includes('Asia/Kolkata') ||
        timezone.includes('Asia/Calcutta') ||
        timezone.includes('Asia/Kolkata')
      ) {
        return 'IN';
      }
    } catch (timezoneError) {
      console.error('[Geolocation] Timezone detection failed:', timezoneError);
    }

    // Default to US for international users
    return 'US';
  }
}

export function getPaymentGateway(countryCode: string): 'razorpay' | 'stripe' {
  return countryCode === 'IN' ? 'razorpay' : 'stripe';
}

export function getCurrency(countryCode: string): 'INR' | 'USD' {
  return countryCode === 'IN' ? 'INR' : 'USD';
}

export function formatPrice(amount: number, currency: 'INR' | 'USD'): string {
  // Amount is in smallest unit (paise/cents)
  const value = amount / 100;

  if (currency === 'INR') {
    return `₹${value.toFixed(2)}`;
  }

  return `$${value.toFixed(2)}`;
}
