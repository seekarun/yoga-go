'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import CurrencySelector from '@/components/CurrencySelector';
import TimezoneSelector from '@/components/TimezoneSelector';
import UserAvatarUpload from '@/components/UserAvatarUpload';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { displayCurrency, loading: currencyLoading } = useCurrency();
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [timezoneLoading, setTimezoneLoading] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Fetch user preferences on mount
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/data/app/user/me/preferences');
      const data = await response.json();
      if (data.success && data.data) {
        setTimezone(data.data.timezone);
      }
    } catch (error) {
      console.error('[DBG][profile] Error fetching preferences:', error);
    } finally {
      setTimezoneLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Update timezone preference
  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    try {
      await fetch('/data/app/user/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: newTimezone }),
      });
    } catch (error) {
      console.error('[DBG][profile] Error saving timezone:', error);
    }
  };

  // Handle avatar upload complete
  const handleAvatarUpload = async (imageUrl: string) => {
    setAvatarError(null);
    try {
      // Update user profile with new avatar
      const profileResponse = await fetch('/data/app/user/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: imageUrl }),
      });

      const profileResult = await profileResponse.json();

      if (!profileResult.success) {
        throw new Error(profileResult.error || 'Failed to update profile');
      }

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('[DBG][profile] Avatar update error:', error);
      setAvatarError(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Link
              href="/app"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ← Back
            </Link>
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            My Profile
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>Your account information</p>
        </div>
      </div>

      {/* Profile Content */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Profile Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* Details Section */}
          <div style={{ padding: '24px' }}>
            {/* Profile Picture */}
            <div style={{ marginBottom: '24px' }}>
              <UserAvatarUpload
                currentAvatarUrl={user.profile.avatar}
                userName={user.profile.name}
                onUploadComplete={handleAvatarUpload}
                onError={setAvatarError}
              />
              {avatarError && (
                <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>
                  {avatarError}
                </p>
              )}
            </div>

            {/* Name */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Full Name
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#333',
                  border: '1px solid #e9ecef',
                }}
              >
                {user.profile.name}
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Email Address
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#333',
                  border: '1px solid #e9ecef',
                }}
              >
                {user.profile.email}
              </div>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Phone Number
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: user.profile.phoneNumber ? '#333' : '#999',
                  border: '1px solid #e9ecef',
                }}
              >
                {user.profile.phoneNumber || 'Not provided'}
              </div>
            </div>

            {/* Member Since */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Member Since
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#333',
                  border: '1px solid #e9ecef',
                }}
              >
                {formatDate(user.profile.joinedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Currency Preferences Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginTop: '24px',
          }}
        >
          <div style={{ padding: '24px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
              }}
            >
              Currency Preferences
            </h2>

            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Choose your preferred currency for viewing prices. Prices will be converted to your
              selected currency using current exchange rates.
            </p>

            {currencyLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e0e0e0',
                    borderTopColor: '#666',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <span>Loading currency settings...</span>
              </div>
            ) : (
              <div style={{ maxWidth: '280px' }}>
                <CurrencySelector variant="dropdown" label="Display Currency" showFlag={true} />
              </div>
            )}

            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
              }}
            >
              <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                When prices are set in a different currency, approximate value in your preferred
                currency ({displayCurrency}) is shown. Actual conversion rates at the time of
                payment might be slightly different. Your bank may apply conversion fees if
                currencies differ.
              </p>
            </div>
          </div>
        </div>

        {/* Timezone Preferences Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginTop: '24px',
          }}
        >
          <div style={{ padding: '24px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
              }}
            >
              Timezone Preferences
            </h2>

            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Set your timezone to ensure webinar schedules and reminders are displayed in your
              local time.
            </p>

            {timezoneLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e0e0e0',
                    borderTopColor: '#666',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <span>Loading timezone settings...</span>
              </div>
            ) : (
              <div style={{ maxWidth: '400px' }}>
                <TimezoneSelector
                  value={timezone}
                  onChange={handleTimezoneChange}
                  label="Your Timezone"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
