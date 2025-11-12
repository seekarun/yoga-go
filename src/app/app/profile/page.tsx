'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { posthog } from '@/providers/PostHogProvider';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'membership' | 'preferences' | 'achievements'
  >('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.profile?.name || '',
    email: user?.profile?.email || '',
    bio: user?.profile?.bio || '',
    location: user?.profile?.location || '',
  });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // In a real app, this would make an API call to update the profile
    setIsEditing(false);
    alert('Profile updated successfully! 🎉');
  };

  const handleCancel = () => {
    setFormData({
      name: user.profile.name,
      email: user.profile.email,
      bio: user.profile.bio || '',
      location: user.profile.location || '',
    });
    setIsEditing(false);
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
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                  {user.profile.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  {user.membership.type.charAt(0).toUpperCase() + user.membership.type.slice(1)}{' '}
                  Member
                </p>
              </div>

              <div>
                {[
                  { id: 'profile' as const, label: 'Profile Info', icon: '👤' },
                  { id: 'membership' as const, label: 'Membership', icon: '💎' },
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
                      Bio
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
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
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
                        {user.profile.location || 'No location provided'}
                      </div>
                    )}
                  </div>

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

            {activeTab === 'profile' && user.role !== 'expert' && (
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
            )}

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

            {activeTab === 'membership' && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Membership Details</h2>
                </div>

                <div style={{ padding: '24px' }}>
                  {/* Subscription Status Alert */}
                  {user.membership.cancelAtPeriodEnd && (
                    <div
                      style={{
                        background: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '24px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px', color: '#856404' }}>
                            Subscription Cancelled
                          </div>
                          <div style={{ fontSize: '14px', color: '#856404' }}>
                            Your subscription will end on{' '}
                            {user.membership.currentPeriodEnd
                              ? new Date(user.membership.currentPeriodEnd).toLocaleDateString()
                              : 'the end of your billing period'}
                            . You will still have access until then.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                      borderRadius: '12px',
                      padding: '24px',
                      color: '#fff',
                      marginBottom: '24px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                        {user.membership.type.charAt(0).toUpperCase() +
                          user.membership.type.slice(1)}{' '}
                        Plan
                      </h3>
                      <span
                        style={{
                          padding: '4px 12px',
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: '100px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {user.membership.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                      <strong>Billing:</strong> {user.membership.billingInterval || 'yearly'} · via{' '}
                      {user.membership.paymentGateway || 'payment gateway'}
                    </div>

                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                      <strong>Member since:</strong>{' '}
                      {new Date(user.membership.startDate).toLocaleDateString()}
                    </div>

                    {user.membership.currentPeriodEnd && (
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>
                        <strong>
                          {user.membership.cancelAtPeriodEnd ? 'Access until' : 'Next billing'}:
                        </strong>{' '}
                        {new Date(user.membership.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                      Plan Benefits
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {user.membership.benefits.map((benefit, index) => (
                        <div
                          key={index}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                        >
                          <span style={{ color: 'var(--color-highlight)', fontSize: '16px' }}>
                            ✓
                          </span>
                          <span style={{ fontSize: '14px' }}>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subscription Actions */}
                  <div style={{ marginTop: '24px' }}>
                    {user.membership.subscriptionId && (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {user.membership.cancelAtPeriodEnd ? (
                          <button
                            onClick={handleReactivateSubscription}
                            disabled={subscriptionLoading}
                            style={{
                              padding: '12px 24px',
                              background: subscriptionLoading ? '#ccc' : '#48bb78',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: subscriptionLoading ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {subscriptionLoading ? 'Processing...' : 'Reactivate Subscription'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  'Are you sure you want to cancel? You will still have access until the end of your billing period.'
                                )
                              ) {
                                handleCancelSubscription();
                              }
                            }}
                            disabled={subscriptionLoading}
                            style={{
                              padding: '12px 24px',
                              background: 'transparent',
                              color: subscriptionLoading ? '#ccc' : '#dc3545',
                              border: `1px solid ${subscriptionLoading ? '#ccc' : '#dc3545'}`,
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: subscriptionLoading ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {subscriptionLoading ? 'Processing...' : 'Cancel Subscription'}
                          </button>
                        )}

                        <Link
                          href="/pricing"
                          style={{
                            padding: '12px 24px',
                            background: 'transparent',
                            color: '#764ba2',
                            border: '1px solid #764ba2',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'inline-block',
                          }}
                        >
                          Change Plan
                        </Link>
                      </div>
                    )}

                    {!user.membership.subscriptionId && user.membership.type === 'free' && (
                      <Link
                        href="/pricing"
                        style={{
                          padding: '12px 24px',
                          background: '#764ba2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Upgrade to Premium
                      </Link>
                    )}
                  </div>
                </div>
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

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                            Push Notifications
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Get reminders for practice sessions
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
                            defaultChecked={user.preferences.pushNotifications}
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
                              background: user.preferences.pushNotifications
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
                                transform: user.preferences.pushNotifications
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
                    </div>
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <button
                      style={{
                        padding: '12px 24px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Save Preferences
                    </button>
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
    </div>
  );
}
