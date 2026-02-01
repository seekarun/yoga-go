'use client';

import { PrimaryButton } from '@/components/Button';
import {
  renderTemplateSection,
  type EditorRenderContext,
} from '@/components/landing-page/editor/templateSections';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';
import { DEFAULT_TEMPLATE, templates } from '@/components/landing-page/templates';
import { generatePalette } from '@/lib/colorPalette';
import type { CustomLandingPageConfig, LandingPageTemplate } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { yogaCategories, type YogaCategory } from '@/data/yogaCategories';
import { BASE_URL } from '@/config/env';

// Dummy image for preview (will be replaced with proper images later)
const DUMMY_IMAGE = '/template/hero.jpg';

// About placeholder image - use absolute URL so it works on subdomains
const ABOUT_PLACEHOLDER_IMAGE = `${BASE_URL}/aboutmePlaceholder.png`;

// Comprehensive list of all countries (ISO 3166-1 alpha-2)
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (Democratic Republic)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Korea (North)' },
  { code: 'KR', name: 'Korea (South)' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macao' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

// Currency options with symbols (common currencies supported by payment processors)
const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

// Comprehensive map of country codes to default currencies
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Africa
  DZ: 'USD',
  EG: 'EGP',
  ET: 'USD',
  GH: 'USD',
  KE: 'USD',
  MA: 'USD',
  NG: 'NGN',
  ZA: 'ZAR',
  TN: 'USD',
  UG: 'USD',
  TZ: 'USD',
  CI: 'USD',
  SN: 'USD',
  CM: 'USD',
  AO: 'USD',
  MZ: 'USD',
  MG: 'USD',
  ZW: 'USD',
  ZM: 'USD',
  BW: 'USD',
  NA: 'USD',
  MU: 'USD',
  RW: 'USD',
  // Americas
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'USD',
  CO: 'USD',
  CL: 'USD',
  PE: 'USD',
  VE: 'USD',
  EC: 'USD',
  GT: 'USD',
  CU: 'USD',
  BO: 'USD',
  DO: 'USD',
  HN: 'USD',
  PY: 'USD',
  SV: 'USD',
  NI: 'USD',
  CR: 'USD',
  PA: 'USD',
  UY: 'USD',
  JM: 'USD',
  TT: 'USD',
  PR: 'USD',
  // Asia
  CN: 'CNY',
  IN: 'INR',
  ID: 'IDR',
  PK: 'PKR',
  BD: 'BDT',
  JP: 'JPY',
  PH: 'PHP',
  VN: 'VND',
  TR: 'TRY',
  IR: 'USD',
  TH: 'THB',
  MM: 'USD',
  KR: 'KRW',
  IQ: 'USD',
  AF: 'USD',
  SA: 'SAR',
  UZ: 'USD',
  MY: 'MYR',
  NP: 'INR',
  YE: 'USD',
  KP: 'USD',
  TW: 'TWD',
  SY: 'USD',
  LK: 'LKR',
  KZ: 'USD',
  JO: 'USD',
  AZ: 'USD',
  AE: 'AED',
  TJ: 'USD',
  IL: 'ILS',
  HK: 'HKD',
  LA: 'USD',
  LB: 'USD',
  KG: 'USD',
  TM: 'USD',
  SG: 'SGD',
  OM: 'USD',
  PS: 'USD',
  KW: 'KWD',
  GE: 'USD',
  MN: 'USD',
  AM: 'USD',
  QA: 'QAR',
  BH: 'USD',
  TL: 'USD',
  BT: 'USD',
  MO: 'HKD',
  MV: 'USD',
  BN: 'USD',
  KH: 'USD',
  // Europe
  RU: 'RUB',
  DE: 'EUR',
  GB: 'GBP',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  UA: 'USD',
  PL: 'PLN',
  RO: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  CZ: 'EUR',
  GR: 'EUR',
  PT: 'EUR',
  SE: 'SEK',
  HU: 'EUR',
  BY: 'USD',
  AT: 'EUR',
  CH: 'CHF',
  BG: 'EUR',
  RS: 'EUR',
  DK: 'DKK',
  FI: 'EUR',
  SK: 'EUR',
  NO: 'NOK',
  IE: 'EUR',
  HR: 'EUR',
  BA: 'EUR',
  MD: 'USD',
  AL: 'EUR',
  LT: 'EUR',
  MK: 'EUR',
  SI: 'EUR',
  LV: 'EUR',
  EE: 'EUR',
  ME: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  IS: 'USD',
  AD: 'EUR',
  MC: 'EUR',
  LI: 'CHF',
  SM: 'EUR',
  VA: 'EUR',
  CY: 'EUR',
  // Oceania
  AU: 'AUD',
  PG: 'USD',
  NZ: 'NZD',
  FJ: 'USD',
  SB: 'USD',
  VU: 'USD',
  WS: 'USD',
  KI: 'USD',
  TO: 'USD',
  FM: 'USD',
  PW: 'USD',
  MH: 'USD',
  NR: 'USD',
  TV: 'USD',
  // Caribbean
  HT: 'USD',
  BS: 'USD',
  BB: 'USD',
  LC: 'USD',
  GD: 'USD',
  VC: 'USD',
  AG: 'USD',
  DM: 'USD',
  KN: 'USD',
  BZ: 'USD',
  GY: 'USD',
  SR: 'USD',
  // Other
  SC: 'USD',
  ST: 'USD',
  CV: 'USD',
  KM: 'USD',
  DJ: 'USD',
  GQ: 'USD',
  GA: 'USD',
  CG: 'USD',
  CD: 'USD',
  CF: 'USD',
  TD: 'USD',
  NE: 'USD',
  ML: 'USD',
  BF: 'USD',
  GN: 'USD',
  SL: 'USD',
  LR: 'USD',
  GW: 'USD',
  GM: 'USD',
  MR: 'USD',
  BJ: 'USD',
  TG: 'USD',
  ER: 'USD',
  SS: 'USD',
  SD: 'USD',
  LY: 'USD',
  SO: 'USD',
  MW: 'USD',
  LS: 'USD',
  SZ: 'USD',
  BI: 'USD',
};

// Lorem ipsum dummy content
const LOREM = {
  short: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  medium:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.',
  long: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
};

// URL-friendly validation: lowercase letters, numbers, and hyphens only
const isUrlFriendly = (value: string): boolean => {
  return /^[a-z0-9-]+$/.test(value);
};

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface ExpertOnboardingProps {
  userEmail: string;
  userName: string;
}

interface LandingPageContent {
  selectedCategory: YogaCategory | null;
}

interface ExtractedContent {
  hero: {
    headline: string;
    description: string;
    ctaText: string;
  };
  valuePropositions: {
    type: 'list';
    items: string[];
  };
}

export default function ExpertOnboarding({ userEmail, userName }: ExpertOnboardingProps) {
  // Suppress unused variable warning - used for future functionality
  void userEmail;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  // Extracted content from AI
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);

  // Expert ID validation state
  const [idValidation, setIdValidation] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved';
    message: string;
  }>({ status: 'idle', message: '' });

  // Track if user has manually edited the Expert ID
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);

  // Convert name to URL-friendly ID (first name only, lowercase, no special chars)
  const nameToExpertId = (name: string): string => {
    const firstName = name.trim().split(/\s+/)[0] || '';
    return firstName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 20); // Limit length
  };

  // Initialize Expert ID from userName if provided
  const initialExpertId = userName ? nameToExpertId(userName) : '';

  const [formData, setFormData] = useState({
    id: initialExpertId,
    name: userName || '',
    location: '',
    currency: 'USD',
  });

  // Geo-detection state
  const [geoDetected, setGeoDetected] = useState(false);

  // Auto-detect location and currency from Vercel geo cookie (set by middleware)
  useEffect(() => {
    const detectLocation = () => {
      try {
        console.log('[DBG][ExpertOnboarding] Detecting location from geo cookie...');

        // Read country code from cookie set by middleware (x-geo-country)
        const cookies = document.cookie.split(';').reduce(
          (acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            if (key && value) acc[key] = value;
            return acc;
          },
          {} as Record<string, string>
        );

        const countryCode = cookies['x-geo-country'];

        if (countryCode) {
          console.log('[DBG][ExpertOnboarding] Detected country from cookie:', countryCode);

          // Check if the country exists in our list
          const countryExists = COUNTRIES.some(c => c.code === countryCode);
          if (countryExists) {
            const currency = COUNTRY_TO_CURRENCY[countryCode] || 'USD';
            setFormData(prev => ({
              ...prev,
              location: countryCode,
              currency: currency,
            }));
            setGeoDetected(true);
            console.log(
              '[DBG][ExpertOnboarding] Pre-populated location:',
              countryCode,
              'currency:',
              currency
            );
          }
        } else {
          console.log(
            '[DBG][ExpertOnboarding] No geo cookie found (running locally or first request)'
          );
        }
      } catch (err) {
        console.log('[DBG][ExpertOnboarding] Could not detect location:', err);
        // Silently fail - user can still select manually
      }
    };

    detectLocation();
  }, []);

  // Landing page content for step 2
  const [landingContent, setLandingContent] = useState<LandingPageContent>({
    selectedCategory: null,
  });

  // Category dropdown state
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Template selection for step 3
  const [selectedTemplate, setSelectedTemplate] = useState<LandingPageTemplate>(DEFAULT_TEMPLATE);
  const [previewTemplateIndex, setPreviewTemplateIndex] = useState(0);

  // Debounced expert ID for validation
  const debouncedExpertId = useDebounce(formData.id, 500);

  // Check expert ID availability
  const checkExpertIdAvailability = useCallback(async (expertId: string) => {
    if (!expertId) {
      setIdValidation({ status: 'idle', message: '' });
      return;
    }

    // First check URL-friendly format
    if (!isUrlFriendly(expertId)) {
      setIdValidation({
        status: 'invalid',
        message: 'Only lowercase letters, numbers, and hyphens are allowed',
      });
      return;
    }

    // Must be at least 3 characters
    if (expertId.length < 3) {
      setIdValidation({
        status: 'invalid',
        message: 'Must be at least 3 characters',
      });
      return;
    }

    // Cannot start or end with hyphen
    if (expertId.startsWith('-') || expertId.endsWith('-')) {
      setIdValidation({
        status: 'invalid',
        message: 'Cannot start or end with a hyphen',
      });
      return;
    }

    setIdValidation({ status: 'checking', message: 'Checking availability...' });

    try {
      const response = await fetch(`/data/experts/validate-id?id=${encodeURIComponent(expertId)}`);
      const data = await response.json();

      if (data.isValid) {
        setIdValidation({ status: 'available', message: data.message || 'This ID is available!' });
      } else if (data.isReserved) {
        setIdValidation({ status: 'reserved', message: data.error || 'This ID is not allowed' });
      } else if (data.isFlagged) {
        setIdValidation({
          status: 'reserved',
          message: data.error || 'This ID contains inappropriate content',
        });
      } else if (data.isTaken) {
        setIdValidation({ status: 'taken', message: data.error || 'This ID is already taken' });
      } else {
        setIdValidation({ status: 'invalid', message: data.error || 'Invalid ID' });
      }
    } catch (err) {
      console.error('[DBG][ExpertOnboarding] Error checking expert ID:', err);
      setIdValidation({ status: 'idle', message: '' });
    }
  }, []);

  // Effect to check availability when debounced ID changes
  useEffect(() => {
    checkExpertIdAvailability(debouncedExpertId);
  }, [debouncedExpertId, checkExpertIdAvailability]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'name') {
      // When name changes, auto-populate Expert ID if not manually edited
      setFormData(prev => ({
        ...prev,
        name: value,
        ...(idManuallyEdited ? {} : { id: nameToExpertId(value) }),
      }));
    } else if (name === 'id') {
      // Mark as manually edited when user types in Expert ID field
      setIdManuallyEdited(true);
      setFormData(prev => ({
        ...prev,
        id: value,
      }));
    } else if (name === 'location') {
      // When location changes, auto-detect currency based on country
      const detectedCurrency = COUNTRY_TO_CURRENCY[value] || 'USD';
      setFormData(prev => ({
        ...prev,
        location: value,
        currency: detectedCurrency,
      }));
    } else {
      // Handle other fields like currency
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCategorySelect = (category: YogaCategory) => {
    setLandingContent(prev => ({
      ...prev,
      selectedCategory: category,
    }));
    setIsCategoryDropdownOpen(false);
  };

  const handleNext = async () => {
    setError('');

    if (step === 1) {
      if (!formData.id || !formData.name || !formData.location) {
        setError('Please fill in all required fields');
        return;
      }
      // Check if expert ID is valid and available
      if (idValidation.status === 'invalid') {
        setError('Please fix the Expert ID: ' + idValidation.message);
        return;
      }
      if (idValidation.status === 'reserved') {
        setError(idValidation.message || 'This ID is not allowed. Please choose a different one.');
        return;
      }
      if (idValidation.status === 'taken') {
        setError('This Expert ID is already taken. Please choose a different one.');
        return;
      }
      if (idValidation.status === 'checking') {
        setError('Please wait while we check the availability of your Expert ID.');
        return;
      }
      if (idValidation.status !== 'available') {
        setError('Please enter a valid Expert ID');
        return;
      }
    }

    // When moving from step 2 to step 3, generate content from selected category
    if (step === 2) {
      if (!landingContent.selectedCategory) {
        setError('Please select a yoga niche');
        return;
      }

      console.log(
        '[DBG][ExpertOnboarding] Generating content from category:',
        landingContent.selectedCategory.category
      );

      // Generate extracted content from the selected category
      const category = landingContent.selectedCategory;
      setExtractedContent({
        hero: {
          headline: category.hook.problem_hook,
          description: category.hook.solution_hook,
          ctaText: 'Start Your Journey',
        },
        valuePropositions: {
          type: 'list',
          items: category.value_propositions.map(vp => vp.title),
        },
      });
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    console.log('[DBG][ExpertOnboarding] Submitting expert profile');

    try {
      // Get content from selected category (already set in extractedContent)
      const category = landingContent.selectedCategory;
      const contentToUse = extractedContent;

      // Prepare expert data with landing page config
      const expertId = formData.id.trim();
      const expertData = {
        id: expertId,
        name: formData.name.trim(),
        title: category?.category || '',
        bio: '',
        avatar: ABOUT_PLACEHOLDER_IMAGE,
        rating: 0,
        totalCourses: 0,
        totalStudents: 0,
        specializations: [],
        featured: false,
        certifications: [],
        experience: '',
        platformPreferences: {
          featuredOnPlatform: true,
          defaultEmail: `${expertId}@myyoga.guru`,
          location: formData.location,
          currency: formData.currency,
        },
        socialLinks: {},
        // Landing page starts as DRAFT (not published) - expert must explicitly publish
        isLandingPagePublished: false,
        // Save to draftLandingPage, NOT customLandingPage (published)
        // Include rich default content so expert has a complete starting point to edit
        draftLandingPage: {
          template: selectedTemplate,
          theme: {
            primaryColor: '#2A9D8F', // Default teal - user can customize in landing page editor
          },
          // Hero section with background image
          hero: {
            headline:
              contentToUse?.hero?.headline ||
              `Transform Your Life with ${formData.name || 'Expert'}`,
            description:
              contentToUse?.hero?.description ||
              'Discover the path to inner peace and physical wellness through personalized yoga practice.',
            ctaText: contentToUse?.hero?.ctaText || 'Start Your Journey',
            alignment: 'center' as const,
            heroImage: '/template/hero.jpg',
          },
          // Value propositions from selected category
          valuePropositions: category
            ? {
                type: 'cards' as const,
                items: category.value_propositions.map((vp, idx) => ({
                  title: vp.title,
                  description: vp.description,
                  image: `/template/gallery${(idx % 2) + 1}.jpg`,
                })),
              }
            : {
                type: 'cards' as const,
                items: [
                  {
                    title: 'Personalized Practice',
                    description:
                      'Tailored sessions designed to meet your unique needs and goals on your wellness journey.',
                    image: '/template/gallery1.jpg',
                  },
                  {
                    title: 'Mind-Body Connection',
                    description:
                      'Learn techniques that harmonize your physical practice with mental clarity and peace.',
                    image: '/template/gallery2.jpg',
                  },
                  {
                    title: 'Flexible Learning',
                    description:
                      'Access classes anytime, anywhere with our on-demand library and live sessions.',
                    image: '/template/gallery1.jpg',
                  },
                ],
              },
          // About section - use about_me from selected category
          about: {
            layoutType: 'image-text' as const,
            imageUrl: ABOUT_PLACEHOLDER_IMAGE,
            text:
              category?.about_me ||
              'With years of dedicated practice and teaching experience, I guide students through transformative yoga journeys. My approach combines traditional wisdom with modern understanding, creating a safe space for all levels to explore and grow.',
            bio: category?.about_me || '',
            highlights: [],
          },
          // Courses section header
          courses: {
            title: 'Featured Courses',
            description: `Start your learning journey with ${formData.name || 'me'}`,
          },
          // Photo gallery with placeholder images
          photoGallery: {
            title: 'Gallery',
            description: 'A glimpse into our practice',
            images: [
              { id: '1', url: '/template/gallery1.jpg', caption: 'Peaceful morning yoga session' },
              { id: '2', url: '/template/gallery2.jpg', caption: 'Group meditation practice' },
              { id: '3', url: '/template/gallery1.jpg', caption: 'Advanced pose workshop' },
              { id: '4', url: '/template/gallery2.jpg', caption: 'Sunset yoga by the beach' },
            ],
          },
          // Blog section header
          blog: {
            title: 'From the Blog',
            description: `Insights and articles from ${formData.name || 'me'}`,
          },
          // Act (CTA) section
          act: {
            title: 'Ready to Transform Your Practice?',
            text: 'Take the first step towards a healthier, more balanced life. Join our community and discover the transformative power of yoga.',
            imageUrl: '/template/hero.jpg',
          },
          // Footer
          footer: {
            tagline: 'Namaste - The light in me honors the light in you',
            showSocialLinks: true,
            socialLinks: {
              instagram: '#',
              youtube: '#',
              facebook: '#',
            },
            showLegalLinks: true,
            legalLinks: {
              privacyPolicy: '#',
              termsOfService: '#',
            },
            showContactInfo: true,
            contactEmail: `hello@${expertId}.myyoga.guru`,
          },
          sectionOrder: [
            'hero',
            'valuePropositions',
            'about',
            'courses',
            'webinars',
            'photoGallery',
            'blog',
            'act',
            'footer',
          ],
          // Disable courses, webinars, and blog by default - expert can enable when ready
          disabledSections: ['courses', 'webinars', 'blog'],
        },
        onboardingCompleted: true,
      };

      console.log('[DBG][ExpertOnboarding] Sending data:', expertData);

      const response = await fetch('/data/experts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expertData),
      });

      const result = await response.json();
      console.log('[DBG][ExpertOnboarding] Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create expert profile');
      }

      console.log('[DBG][ExpertOnboarding] Expert profile created successfully');

      // Add expert role to user now that onboarding is complete
      try {
        const roleResponse = await fetch('/api/user/become-expert', {
          method: 'POST',
        });
        const roleResult = await roleResponse.json();
        if (!roleResponse.ok || !roleResult.success) {
          console.error('[DBG][ExpertOnboarding] Failed to add expert role:', roleResult);
          // Continue anyway - profile was created successfully
        } else {
          console.log('[DBG][ExpertOnboarding] Expert role added successfully');
        }
      } catch (roleErr) {
        console.error('[DBG][ExpertOnboarding] Error adding expert role:', roleErr);
        // Continue anyway - profile was created successfully
      }

      window.location.href = `/srv/${expertId}/landing-page`;
    } catch (err) {
      console.error('[DBG][ExpertOnboarding] Error creating expert profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to create expert profile');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Progress Indicator */}
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '16px',
            gap: '8px',
          }}
        >
          {[1, 2, 3].map(num => (
            <div
              key={num}
              style={{
                flex: 1,
                height: '4px',
                background: num <= step ? 'var(--color-primary)' : '#e2e8f0',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>Step {step} of 3</div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* Step Header with Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <button
              onClick={handleBack}
              disabled={true}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#ccc',
                opacity: 0.5,
              }}
            >
              ‹
            </button>
            <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Basic Information</h2>
            <button
              onClick={handleNext}
              disabled={loading || extracting}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: loading || extracting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: loading || extracting ? '#ccc' : 'var(--color-primary)',
              }}
            >
              ›
            </button>
          </div>

          {/* Name - First field */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Expert ID - Auto-populated from name */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}
            >
              Expert ID (URL-friendly) *
            </label>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Use only lowercase letters, numbers, and hyphens (e.g., john-doe, yoga123)
            </div>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleChange}
              placeholder="e.g., john-doe"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${
                  idValidation.status === 'invalid' ||
                  idValidation.status === 'taken' ||
                  idValidation.status === 'reserved'
                    ? '#ef4444'
                    : idValidation.status === 'available'
                      ? '#22c55e'
                      : '#e2e8f0'
                }`,
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            {/* Validation Status */}
            {idValidation.status !== 'idle' && (
              <div
                style={{
                  fontSize: '12px',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color:
                    idValidation.status === 'available'
                      ? '#22c55e'
                      : idValidation.status === 'invalid' ||
                          idValidation.status === 'taken' ||
                          idValidation.status === 'reserved'
                        ? '#ef4444'
                        : '#666',
                }}
              >
                {idValidation.status === 'checking' && (
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                    ⏳
                  </span>
                )}
                {idValidation.status === 'available' && '✓'}
                {(idValidation.status === 'invalid' ||
                  idValidation.status === 'taken' ||
                  idValidation.status === 'reserved') &&
                  '✗'}
                {idValidation.message}
              </div>
            )}
            {/* Dynamic Preview */}
            {formData.id && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              >
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#666' }}>Your URL: </span>
                  <span style={{ color: '#111', fontWeight: '500' }}>
                    {formData.id}.myyoga.guru
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#666' }}>Your email: </span>
                  <span style={{ color: '#111', fontWeight: '500' }}>
                    {formData.id}@myyoga.guru
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                  You can connect your own custom domain later in settings
                </div>
              </div>
            )}
          </div>

          {/* Location and Currency Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            {/* Location */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                Location *
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
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
                <option value="">Select your country</option>
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
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
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Used for pricing your courses and services
              </div>
            </div>
          </div>

          {/* Auto-detected hint */}
          {geoDetected && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📍</span>
              <span>
                Location and currency auto-detected based on your IP. Feel free to change if needed.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Yoga Niche */}
      {step === 2 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* Step Header with Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <button
              onClick={handleBack}
              disabled={loading || extracting}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: loading || extracting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: loading || extracting ? '#ccc' : 'var(--color-primary)',
              }}
            >
              ‹
            </button>
            <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
              Select Your Yoga Niche
            </h2>
            <button
              onClick={handleNext}
              disabled={loading || extracting || !landingContent.selectedCategory}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor:
                  loading || extracting || !landingContent.selectedCategory
                    ? 'not-allowed'
                    : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color:
                  loading || extracting || !landingContent.selectedCategory
                    ? '#ccc'
                    : 'var(--color-primary)',
              }}
            >
              ›
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', textAlign: 'center' }}>
            Choose the area you specialize in - we&apos;ll create a landing page tailored to your
            niche
          </p>

          {/* Custom Category Dropdown */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              What type of yoga do you teach? *
            </label>

            {/* Custom dropdown trigger */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: landingContent.selectedCategory
                    ? '2px solid var(--color-primary)'
                    : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                {landingContent.selectedCategory ? (
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {landingContent.selectedCategory.category}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                      {landingContent.selectedCategory.hint}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '16px', color: '#999' }}>Select your yoga niche...</div>
                  </div>
                )}
                <span
                  style={{
                    transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    fontSize: '20px',
                    color: '#666',
                    marginLeft: '12px',
                    flexShrink: 0,
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Dropdown options */}
              {isCategoryDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    marginTop: '8px',
                    zIndex: 100,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {yogaCategories.map((category, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        border: 'none',
                        borderBottom:
                          idx < yogaCategories.length - 1 ? '1px solid #f0f0f0' : 'none',
                        background:
                          landingContent.selectedCategory?.category === category.category
                            ? 'var(--color-primary-light, #e6f7f5)'
                            : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (landingContent.selectedCategory?.category !== category.category) {
                          e.currentTarget.style.background = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={e => {
                        if (landingContent.selectedCategory?.category !== category.category) {
                          e.currentTarget.style.background = '#fff';
                        }
                      }}
                    >
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          marginBottom: '6px',
                          color:
                            landingContent.selectedCategory?.category === category.category
                              ? 'var(--color-primary)'
                              : '#333',
                        }}
                      >
                        {category.category}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#666',
                          lineHeight: '1.5',
                        }}
                      >
                        {category.hint}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Template Selection - Full Preview Carousel */}
      {step === 3 &&
        (() => {
          const currentTemplate = templates[previewTemplateIndex];
          const expertName = formData.name || 'Your Name';

          // Default brand color (same as used when creating expert profile)
          const defaultBrandColor = '#2A9D8F';

          // Build comprehensive preview data with dummy content where real data is missing
          const previewData: CustomLandingPageConfig = {
            template: currentTemplate.id,
            // Theme with default brand color
            theme: {
              primaryColor: defaultBrandColor,
            },
            // Hero section with dummy image
            hero: {
              headline:
                extractedContent?.hero?.headline || `Transform Your Life with ${expertName}`,
              description: extractedContent?.hero?.description || LOREM.medium,
              ctaText: extractedContent?.hero?.ctaText || 'Start Your Journey',
              alignment: 'center',
              heroImage: DUMMY_IMAGE,
            },
            // Value propositions from selected category
            valuePropositions: landingContent.selectedCategory
              ? {
                  type: 'cards' as const,
                  items: landingContent.selectedCategory.value_propositions.map((vp, idx) => ({
                    title: vp.title,
                    description: vp.description,
                    image: `/template/gallery${(idx % 2) + 1}.jpg`,
                  })),
                }
              : {
                  type: 'cards' as const,
                  items: [
                    {
                      title: 'Personalized Practice',
                      description:
                        'Tailored sessions designed to meet your unique needs and goals on your wellness journey.',
                      image: '/template/gallery1.jpg',
                    },
                    {
                      title: 'Mind-Body Connection',
                      description:
                        'Learn techniques that harmonize your physical practice with mental clarity and peace.',
                      image: '/template/gallery2.jpg',
                    },
                    {
                      title: 'Flexible Learning',
                      description:
                        'Access classes anytime, anywhere with our on-demand library and live sessions.',
                      image: '/template/gallery1.jpg',
                    },
                  ],
                },
            // About section with selected category about_me
            about: {
              layoutType: 'image-text',
              imageUrl: ABOUT_PLACEHOLDER_IMAGE,
              text: landingContent.selectedCategory?.about_me || LOREM.long,
            },
            // Courses section header
            courses: {
              title: 'Featured Courses',
              description: `Start your learning journey with ${expertName}`,
            },
            // Photo gallery with dummy images
            photoGallery: {
              title: 'Gallery',
              description: 'A glimpse into our practice',
              images: [
                {
                  id: '1',
                  url: '/template/gallery1.jpg',
                  caption: 'Peaceful morning yoga session',
                },
                { id: '2', url: '/template/gallery2.jpg', caption: 'Group meditation practice' },
                { id: '3', url: '/template/gallery1.jpg', caption: 'Advanced pose workshop' },
                { id: '4', url: '/template/gallery2.jpg', caption: 'Sunset yoga by the beach' },
              ],
            },
            // Blog section header
            blog: {
              title: 'From the Blog',
              description: `Insights and articles from ${expertName}`,
            },
            // Act (CTA) section with dummy content
            act: {
              title: 'Ready to Transform Your Practice?',
              text: LOREM.medium,
              imageUrl: DUMMY_IMAGE,
            },
            // Footer with dummy links
            footer: {
              tagline: 'Namaste - The light in me honors the light in you',
              showSocialLinks: true,
              socialLinks: {
                instagram: '#',
                youtube: '#',
                facebook: '#',
              },
              showLegalLinks: true,
              legalLinks: {
                privacyPolicy: '#',
                termsOfService: '#',
              },
              showContactInfo: true,
              contactEmail: `hello@${formData.id || 'example'}.myyoga.guru`,
            },
          };

          return (
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {/* Step Header with Navigation */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                }}
              >
                <button
                  onClick={handleBack}
                  disabled={loading || extracting}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    cursor: loading || extracting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: loading || extracting ? '#ccc' : 'var(--color-primary)',
                  }}
                >
                  ‹
                </button>
                <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                  Choose Your Template
                </h2>
                <button
                  disabled={true}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#ccc',
                    opacity: 0.5,
                  }}
                >
                  ›
                </button>
              </div>

              {/* Template Dropdown */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#333',
                  }}
                >
                  Select Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={e => {
                    const newTemplateId = e.target.value as LandingPageTemplate;
                    setSelectedTemplate(newTemplateId);
                    const newIndex = templates.findIndex(t => t.id === newTemplateId);
                    if (newIndex !== -1) {
                      setPreviewTemplateIndex(newIndex);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                  }}
                >
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Preview - All Sections */}
              {(() => {
                // Build render context for template sections
                const renderContext: EditorRenderContext = {
                  data: previewData,
                  expertName: expertName,
                  expertBio: landingContent.selectedCategory?.about_me || LOREM.medium,
                  expertId: formData.id || 'preview',
                  courses: [],
                  webinars: [],
                  latestBlogPost: undefined,
                };

                // Sections to preview (excluding courses, webinars, blog which are empty)
                const previewSections = [
                  'hero',
                  'valuePropositions',
                  'about',
                  'photoGallery',
                  'act',
                  'footer',
                ] as const;

                return (
                  <div
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                  >
                    <LandingPageThemeProvider palette={generatePalette(defaultBrandColor)}>
                      {previewSections.map(sectionId =>
                        renderTemplateSection(sectionId, currentTemplate.id, renderContext)
                      )}
                    </LandingPageThemeProvider>
                  </div>
                );
              })()}

              {/* Template Dots Indicator */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '16px',
                }}
              >
                {templates.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => setPreviewTemplateIndex(idx)}
                    style={{
                      width: idx === previewTemplateIndex ? '24px' : '10px',
                      height: '10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: idx === previewTemplateIndex ? 'var(--color-primary)' : '#e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    title={t.name}
                  />
                ))}
              </div>
            </div>
          );
        })()}

      {/* Navigation Links */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        {step > 1 ? (
          <button
            onClick={handleBack}
            disabled={loading || extracting}
            style={{
              background: 'none',
              border: 'none',
              color: loading || extracting ? '#ccc' : 'var(--color-primary)',
              fontSize: '15px',
              fontWeight: '500',
              cursor: loading || extracting ? 'not-allowed' : 'pointer',
              padding: '8px 0',
            }}
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={loading || extracting || (step === 2 && !landingContent.selectedCategory)}
            style={{
              background: 'none',
              border: 'none',
              color:
                loading || extracting || (step === 2 && !landingContent.selectedCategory)
                  ? '#ccc'
                  : 'var(--color-primary)',
              fontSize: '15px',
              fontWeight: '500',
              cursor:
                loading || extracting || (step === 2 && !landingContent.selectedCategory)
                  ? 'not-allowed'
                  : 'pointer',
              padding: '8px 0',
            }}
          >
            {extracting ? 'Generating...' : 'Next →'}
          </button>
        ) : (
          <PrimaryButton onClick={handleSubmit} disabled={loading} loading={loading}>
            {loading ? 'Creating Your Page...' : '✨ Create My Landing Page'}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
