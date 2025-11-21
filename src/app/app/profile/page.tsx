'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { posthog } from '@/providers/PostHogProvider';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'achievements'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.profile?.name || '',
    email: user?.profile?.email || '',
    bio: user?.profile?.bio || '',
    experienceLevel: user?.profile?.experienceLevel || '',
    weight: user?.profile?.weight?.toString() || '',
    weightUnit: user?.profile?.weightUnit || 'kg',
    height: user?.profile?.height?.toString() || '',
    heightUnit: user?.profile?.heightUnit || 'cm',
    preconditions: user?.profile?.preconditions || '',
  });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const hasLoadedInitialPreferences = useRef(false);

  // Load auto-play preference from database on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        console.log('[DBG][profile] Loading preferences from database');
        const response = await fetch('/api/user/preferences');
        const result = await response.json();

        if (result.success) {
          const dbValue = result.data.autoPlayEnabled ?? false;
          console.log('[DBG][profile] Loaded from DB:', dbValue);
          setAutoPlayEnabled(dbValue);
          // Also update localStorage to keep it in sync
          localStorage.setItem('autoPlayEnabled', String(dbValue));
        } else {
          // Fallback to localStorage if DB fetch fails
          const savedPreference = localStorage.getItem('autoPlayEnabled');
          if (savedPreference !== null) {
            setAutoPlayEnabled(savedPreference === 'true');
          }
        }
      } catch (error) {
        console.error('[DBG][profile] Error loading preferences:', error);
        // Fallback to localStorage
        const savedPreference = localStorage.getItem('autoPlayEnabled');
        if (savedPreference !== null) {
          setAutoPlayEnabled(savedPreference === 'true');
        }
      } finally {
        // Mark that we've completed the initial load
        hasLoadedInitialPreferences.current = true;
      }
    };

    loadPreferences();
  }, []);

  // Save auto-play preference to database when it changes
  useEffect(() => {
    // Skip saving on initial load - only save when user actually changes the preference
    if (!hasLoadedInitialPreferences.current) {
      return;
    }

    const savePreference = async () => {
      try {
        console.log('[DBG][profile] Saving preference to database:', autoPlayEnabled);

        // Save to localStorage immediately for quick access
        localStorage.setItem('autoPlayEnabled', String(autoPlayEnabled));

        // Save to database
        const response = await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autoPlayEnabled }),
        });

        const result = await response.json();

        if (result.success) {
          console.log('[DBG][profile] Preference saved to database successfully');
          setToastMessage('Auto-play preference saved');
          setShowToast(true);
        } else {
          console.error('[DBG][profile] Failed to save to database:', result.error);
          setToastMessage('Saved locally (will sync later)');
          setShowToast(true);
        }
      } catch (error) {
        console.error('[DBG][profile] Error saving preference:', error);
        setToastMessage('Saved locally (will sync later)');
        setShowToast(true);
      }
    };

    savePreference();
  }, [autoPlayEnabled]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Handle password change success message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('password_changed') === 'true') {
      console.log('[DBG][profile] Password changed successfully - showing toast');
      setToastMessage('Password changed successfully!');
      setShowToast(true);
      // Clean up URL without reloading the page
      window.history.replaceState({}, '', '/app/profile');
    }
  }, []);

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  // Check if user is a social login (not Auth0 database user)
  // Social login users cannot change passwords through Auth0
  const isSocialLogin = user.auth0Id && !user.auth0Id.startsWith('auth0|');

  const handleSave = async () => {
    try {
      const profileData: Record<string, string | number | undefined> = {
        name: formData.name,
        bio: formData.bio,
      };

      // Add yoga fields if provided
      if (formData.experienceLevel) profileData.experienceLevel = formData.experienceLevel;
      if (formData.weight) {
        profileData.weight = parseFloat(formData.weight);
        profileData.weightUnit = formData.weightUnit;
      }
      if (formData.height) {
        profileData.height = parseFloat(formData.height);
        profileData.heightUnit = formData.heightUnit;
      }
      if (formData.preconditions) profileData.preconditions = formData.preconditions;

      const response = await fetch(`/data/app/user/${user.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Refresh user data to reflect changes
      await refreshUser();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('[DBG][profile] Update profile error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to update profile'}`);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.profile.name,
      email: user.profile.email,
      bio: user.profile.bio || '',
      experienceLevel: user.profile.experienceLevel || '',
      weight: user.profile.weight?.toString() || '',
      weightUnit: user.profile.weightUnit || 'kg',
      height: user.profile.height?.toString() || '',
      heightUnit: user.profile.heightUnit || 'cm',
      preconditions: user.profile.preconditions || '',
    });
    setIsEditing(false);
  };

  const handleRequestPasswordChange = async () => {
    try {
      setSubscriptionLoading(true);

      const response = await fetch('/api/auth/request-password-change', {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success) {
        // Handle social login users
        if (result.error === 'social_provider') {
          alert(
            result.message ||
              'You signed in with a social provider (Google, Facebook, etc.). Please manage your password through that provider.'
          );
          return;
        }

        throw new Error(result.error || 'Failed to request password change');
      }

      // Redirect to Auth0's password change page
      console.log('[DBG][profile] Redirecting to password change page');
      window.location.href = result.data.ticketUrl;
    } catch (error) {
      console.error('[DBG][profile] Password change request error:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Failed to request password change'}`
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleCancelSubscription = async (reason?: string) => {
    if (!user?.membership?.subscriptionId) return;

    setSubscriptionLoading(true);
    setSubscriptionError(null);

    try {
      const gateway = user.membership.paymentGateway || 'stripe';
      const endpoint = `/api/payment/${gateway}/cancel-subscription`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: user.membership.subscriptionId,
          userId: user.id,
          reason,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // PostHog analytics
      posthog.capture('subscription_cancelled', {
        subscriptionId: user.membership.subscriptionId,
        planType: user.membership.type,
        billingInterval: user.membership.billingInterval,
        reason,
        gateway,
        currentPeriodEnd: user.membership.currentPeriodEnd,
      });

      // Refresh user data to show updated subscription status
      await refreshUser();
      alert(
        'Subscription cancelled successfully. You will have access until the end of your billing period.'
      );
    } catch (error) {
      console.error('[DBG][profile] Cancel subscription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
      setSubscriptionError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user?.membership?.subscriptionId) return;

    setSubscriptionLoading(true);
    setSubscriptionError(null);

    try {
      const gateway = user.membership.paymentGateway || 'stripe';
      const endpoint = `/api/payment/${gateway}/cancel-subscription`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: user.membership.subscriptionId,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      // PostHog analytics
      posthog.capture('subscription_reactivated', {
        subscriptionId: user.membership.subscriptionId,
        planType: user.membership.type,
        billingInterval: user.membership.billingInterval,
        gateway,
        currentPeriodEnd: user.membership.currentPeriodEnd,
      });

      // Refresh user data to show updated subscription status
      await refreshUser();
      alert('Subscription reactivated successfully!');
    } catch (error) {
      console.error('[DBG][profile] Reactivate subscription error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reactivate subscription';
      setSubscriptionError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
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
              ← Back to Dashboard
            </Link>
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            Profile & Settings
          </h1>
          <p style={{ fontSize: '16px', color: '#666' }}>
            Manage your account information and preferences
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
          {/* Sidebar */}
          <div>
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: '84px',
              }}
            >
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: user.profile.avatar
                      ? `url(${user.profile.avatar})`
                      : 'var(--color-primary)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#fff',
                    margin: '0 auto 16px',
                  }}
                >
                  {!user.profile.avatar && user.profile.name.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{user.profile.name}</h3>
              </div>

              <div>
                {[
                  { id: 'profile' as const, label: 'Profile Info', icon: '👤' },
                  { id: 'preferences' as const, label: 'Preferences', icon: '⚙️' },
                  { id: 'achievements' as const, label: 'Achievements', icon: '🏆' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      width: '100%',
                      padding: '16px 24px',
                      background: activeTab === tab.id ? '#f0f4ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: activeTab === tab.id ? 'var(--color-primary)' : '#666',
                      borderLeft:
                        activeTab === tab.id
                          ? '3px solid var(--color-primary)'
                          : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div>
            {activeTab === 'profile' && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    padding: '24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Profile Information</h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                <div style={{ padding: '24px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '24px',
                      marginBottom: '24px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#4a5568',
                        }}
                      >
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: '12px',
                            background: '#f8f8f8',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          {user.profile.name}
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#4a5568',
                        }}
                      >
                        Email Address
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: '12px',
                            background: '#f8f8f8',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          {user.profile.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#4a5568',
                      }}
                    >
                      About Me
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          padding: '12px',
                          background: '#f8f8f8',
                          borderRadius: '8px',
                          fontSize: '14px',
                        }}
                      >
                        {user.profile.bio || 'No bio provided'}
                      </div>
                    )}
                  </div>

                  {/* Yoga Profile Section */}
                  <div
                    style={{
                      marginTop: '32px',
                      paddingTop: '24px',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        color: '#2d3748',
                      }}
                    >
                      Yoga Profile
                    </h3>

                    <div style={{ marginBottom: '24px' }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#4a5568',
                        }}
                      >
                        Experience Level
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.experienceLevel}
                          onChange={e =>
                            setFormData({ ...formData, experienceLevel: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: '#fff',
                          }}
                        >
                          <option value="">Not specified</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      ) : (
                        <div
                          style={{
                            padding: '12px',
                            background: '#f8f8f8',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          {user.profile.experienceLevel
                            ? user.profile.experienceLevel.charAt(0).toUpperCase() +
                              user.profile.experienceLevel.slice(1)
                            : 'Not specified'}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '24px',
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#4a5568',
                          }}
                        >
                          Weight
                        </label>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="number"
                              value={formData.weight}
                              onChange={e => setFormData({ ...formData, weight: e.target.value })}
                              placeholder="0"
                              style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                              }}
                            />
                            <select
                              value={formData.weightUnit}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  weightUnit: e.target.value as 'kg' | 'lbs',
                                })
                              }
                              style={{
                                padding: '12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: '#fff',
                              }}
                            >
                              <option value="kg">kg</option>
                              <option value="lbs">lbs</option>
                            </select>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '12px',
                              background: '#f8f8f8',
                              borderRadius: '8px',
                              fontSize: '14px',
                            }}
                          >
                            {user.profile.weight
                              ? `${user.profile.weight} ${user.profile.weightUnit || 'kg'}`
                              : 'Not specified'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#4a5568',
                          }}
                        >
                          Height
                        </label>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="number"
                              value={formData.height}
                              onChange={e => setFormData({ ...formData, height: e.target.value })}
                              placeholder="0"
                              style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                              }}
                            />
                            <select
                              value={formData.heightUnit}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  heightUnit: e.target.value as 'cm' | 'inches',
                                })
                              }
                              style={{
                                padding: '12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: '#fff',
                              }}
                            >
                              <option value="cm">cm</option>
                              <option value="inches">in</option>
                            </select>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '12px',
                              background: '#f8f8f8',
                              borderRadius: '8px',
                              fontSize: '14px',
                            }}
                          >
                            {user.profile.height
                              ? `${user.profile.height} ${user.profile.heightUnit || 'cm'}`
                              : 'Not specified'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#4a5568',
                        }}
                      >
                        Pre-existing Conditions
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.preconditions}
                          onChange={e =>
                            setFormData({ ...formData, preconditions: e.target.value })
                          }
                          rows={3}
                          placeholder="Any injuries, conditions, or limitations..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            resize: 'vertical',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: '12px',
                            background: '#f8f8f8',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          {user.profile.preconditions || 'None specified'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security Section - Change Password (Temporarily disabled - users can use Forgot Password at login) */}
                  {/* {!isEditing && !isSocialLogin && (
                    <div
                      style={{
                        marginTop: '32px',
                        paddingTop: '24px',
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          marginBottom: '12px',
                          color: '#2d3748',
                        }}
                      >
                        Security
                      </h3>
                      <p style={{ fontSize: '14px', color: '#718096', marginBottom: '16px' }}>
                        Manage your account security and password
                      </p>
                      <button
                        onClick={handleRequestPasswordChange}
                        disabled={subscriptionLoading}
                        style={{
                          padding: '10px 20px',
                          background: subscriptionLoading ? '#ccc' : '#fff',
                          color: subscriptionLoading ? '#666' : 'var(--color-primary)',
                          border: `1px solid ${subscriptionLoading ? '#ccc' : 'var(--color-primary)'}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: subscriptionLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={e => {
                          if (!subscriptionLoading) {
                            e.currentTarget.style.background = 'var(--color-primary)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseOut={e => {
                          if (!subscriptionLoading) {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.color = 'var(--color-primary)';
                          }
                        }}
                      >
                        {subscriptionLoading ? 'Processing...' : 'Change Password'}
                      </button>
                    </div>
                  )} */}

                  {isEditing && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                      <button
                        onClick={handleSave}
                        style={{
                          padding: '12px 24px',
                          background: 'var(--color-highlight)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancel}
                        style={{
                          padding: '12px 24px',
                          background: '#e2e8f0',
                          color: '#4a5568',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TODO: Uncomment when ready to allow users to become experts */}
            {/* {activeTab === 'profile' && user.role !== 'expert' && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '32px',
                  color: '#fff',
                  marginTop: '24px',
                  boxShadow: '0 4px 12px rgba(118, 75, 162, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '24px' }}>
                  <div style={{ fontSize: '48px' }}>🎓</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>
                      Become a Yoga Expert
                    </h3>
                    <p
                      style={{
                        fontSize: '16px',
                        opacity: 0.95,
                        marginBottom: '20px',
                        lineHeight: '1.6',
                      }}
                    >
                      Share your knowledge with the world! As an expert, you can:
                    </p>
                    <ul
                      style={{
                        fontSize: '15px',
                        opacity: 0.95,
                        marginBottom: '24px',
                        paddingLeft: '20px',
                        lineHeight: '1.8',
                      }}
                    >
                      <li>Create and publish your own yoga courses</li>
                      <li>Host live 1-on-1 sessions with students</li>
                      <li>Build your personal brand with a custom landing page</li>
                      <li>Earn revenue from course enrollments and bookings</li>
                      <li>Access detailed analytics about your students</li>
                    </ul>
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            "Ready to become an expert? You'll be taken to the expert portal to complete your profile."
                          )
                        ) {
                          try {
                            const response = await fetch('/api/user/become-expert', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                            });
                            const data = await response.json();

                            if (data.success) {
                              await refreshUser();
                              window.location.href = '/srv';
                            } else {
                              alert('Error: ' + (data.error || 'Failed to become expert'));
                            }
                          } catch (error) {
                            console.error('[DBG][profile] Become expert error:', error);
                            alert('Error: Failed to become expert');
                          }
                        }
                      }}
                      style={{
                        padding: '14px 32px',
                        background: '#fff',
                        color: '#764ba2',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                    >
                      Start Your Expert Journey →
                    </button>
                  </div>
                </div>
              </div>
            )} */}

            {activeTab === 'profile' && user.role === 'expert' && (
              <div
                style={{
                  background: '#f0f4ff',
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  padding: '24px',
                  marginTop: '24px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '32px' }}>👨‍🏫</span>
                  <div>
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#667eea',
                        marginBottom: '4px',
                      }}
                    >
                      You're an Expert!
                    </h3>
                    <p style={{ fontSize: '14px', color: '#4a5568' }}>
                      Manage your courses, live sessions, and analytics in the expert portal
                    </p>
                  </div>
                </div>
                <Link
                  href="/srv"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#667eea',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Go to Expert Portal →
                </Link>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Preferences</h2>
                </div>

                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '32px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                      Notifications
                    </h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                            Email Notifications
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Receive updates about new courses and progress
                          </div>
                        </div>
                        <label
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '48px',
                            height: '24px',
                          }}
                        >
                          <input
                            type="checkbox"
                            defaultChecked={user.preferences.emailNotifications}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: user.preferences.emailNotifications
                                ? 'var(--color-primary)'
                                : '#e2e8f0',
                              borderRadius: '24px',
                              transition: '0.3s',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                content: '""',
                                height: '18px',
                                width: '18px',
                                left: '3px',
                                bottom: '3px',
                                background: '#fff',
                                borderRadius: '50%',
                                transition: '0.3s',
                                transform: user.preferences.emailNotifications
                                  ? 'translateX(24px)'
                                  : 'translateX(0)',
                              }}
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                      Practice Settings
                    </h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#4a5568',
                          }}
                        >
                          Preferred Session Duration
                        </label>
                        <select
                          defaultValue={user.preferences.preferredDuration || '30'}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="45">45 minutes</option>
                          <option value="60">60 minutes</option>
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#4a5568',
                          }}
                        >
                          Video Quality
                        </label>
                        <select
                          defaultValue={user.preferences.videoQuality || 'hd'}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          <option value="sd">Standard (SD)</option>
                          <option value="hd">High (HD)</option>
                          <option value="4k">Ultra (4K)</option>
                        </select>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          background: '#f8f8f8',
                          borderRadius: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                            Auto-play Next Lesson
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Automatically play the next lesson when current video ends
                          </div>
                        </div>
                        <label
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '48px',
                            height: '24px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={autoPlayEnabled}
                            onChange={e => setAutoPlayEnabled(e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: autoPlayEnabled ? 'var(--color-primary)' : '#e2e8f0',
                              borderRadius: '24px',
                              transition: '0.3s',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                content: '""',
                                height: '18px',
                                width: '18px',
                                left: '3px',
                                bottom: '3px',
                                background: '#fff',
                                borderRadius: '50%',
                                transition: '0.3s',
                                transform: autoPlayEnabled ? 'translateX(24px)' : 'translateX(0)',
                              }}
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Your Achievements</h2>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    {user.achievements.length} achievements unlocked
                  </p>
                </div>

                <div style={{ padding: '24px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: '20px',
                    }}
                  >
                    {user.achievements.map(achievement => (
                      <div
                        key={achievement.id}
                        style={{
                          background: '#f8f8f8',
                          borderRadius: '12px',
                          padding: '20px',
                          textAlign: 'center',
                          border: '2px solid #e2e8f0',
                        }}
                      >
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                          {achievement.icon}
                        </div>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '8px',
                          }}
                        >
                          {achievement.title}
                        </h3>
                        <p
                          style={{
                            fontSize: '12px',
                            color: '#666',
                            lineHeight: '1.4',
                            marginBottom: '12px',
                          }}
                        >
                          {achievement.description}
                        </p>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#10b981',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <span style={{ fontSize: '20px' }}>✓</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{toastMessage}</span>
        </div>
      )}

      {/* Toast Animation */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
