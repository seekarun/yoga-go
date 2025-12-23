'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Expert, SupportedCurrency } from '@/types';
import { getSupportedCurrencyList } from '@/config/currencies';

// Country options
const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

export default function PreferencesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');

  const currencies = getSupportedCurrencyList();

  // Check if user owns this expert profile
  useEffect(() => {
    if (user && user.expertProfile !== expertId) {
      router.push(`/srv/${user.expertProfile}/preferences`);
    }
  }, [user, expertId, router]);

  // Fetch expert data
  const fetchExpertData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/data/app/expert/me');
      const data = await response.json();

      if (data.success && data.data) {
        const expert: Expert = data.data;
        setLocation(expert.platformPreferences?.location || '');
        setCurrency(expert.platformPreferences?.currency || 'USD');
      }
    } catch (err) {
      console.error('[DBG][preferences] Error fetching expert data:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpertData();
  }, [fetchExpertData]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/expert/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformPreferences: {
            location,
            currency,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Preferences saved successfully');
      } else {
        setError(data.error || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('[DBG][preferences] Error saving preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading preferences...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your location, currency, and other preferences
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        <div className="max-w-2xl">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Location & Currency Section */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Location & Currency
            </h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              Your location determines your default currency for pricing courses and webinars.
            </p>

            {/* Location */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="location"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#333',
                }}
              >
                Location
              </label>
              <select
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fff',
                }}
              >
                <option value="">Select your location</option>
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="currency"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#333',
                }}
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={e => setCurrency(e.target.value as SupportedCurrency)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fff',
                }}
              >
                {currencies.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.name} ({curr.code})
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                This is the currency learners will pay when purchasing your courses and webinars.
              </p>
            </div>

            {/* Info Box */}
            <div
              style={{
                padding: '16px',
                background: '#f0f9ff',
                borderRadius: '8px',
                marginBottom: '24px',
                border: '1px solid #bae6fd',
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <svg
                  className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#0369a1' }}>
                    Currency Conversion
                  </div>
                  <p style={{ fontSize: '13px', color: '#0c4a6e', marginTop: '4px' }}>
                    Learners from other countries will see approximate prices in their local
                    currency, but will be charged in your preferred currency. Exchange rate
                    conversions are applied at the time of purchase.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
