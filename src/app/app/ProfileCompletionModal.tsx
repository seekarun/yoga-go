'use client';

import { useState } from 'react';
import type { User } from '@/types';

interface ProfileCompletionModalProps {
  user: User;
  onComplete: () => void;
}

export default function ProfileCompletionModal({ user, onComplete }: ProfileCompletionModalProps) {
  // Only pre-fill name if it's NOT from email (i.e., from social login like Google, Facebook)
  const [fullName, setFullName] = useState(
    user.profile.nameIsFromEmail ? '' : user.profile.name || ''
  );
  const [experienceLevel, setExperienceLevel] = useState<
    'beginner' | 'intermediate' | 'advanced' | ''
  >('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'inches'>('cm');
  const [preconditions, setPreconditions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[DBG][ProfileCompletionModal] Updating profile with name:', fullName);

      const profileData: Record<string, string | number | boolean | undefined> = {
        name: fullName.trim(),
        onboardingCompleted: true, // Mark onboarding as completed
      };

      // Add optional fields if provided
      if (experienceLevel) profileData.experienceLevel = experienceLevel;
      if (weight) {
        profileData.weight = parseFloat(weight);
        profileData.weightUnit = weightUnit;
      }
      if (height) {
        profileData.height = parseFloat(height);
        profileData.heightUnit = heightUnit;
      }
      if (preconditions.trim()) profileData.preconditions = preconditions.trim();

      const response = await fetch(`/data/app/user/${user.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      console.log('[DBG][ProfileCompletionModal] Profile updated successfully');

      // Call onComplete to refresh user data and close modal
      onComplete();
    } catch (err) {
      console.error('[DBG][ProfileCompletionModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxWidth: '620px',
          width: '100%',
          position: 'relative',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: '48px 40px 48px 32px',
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img
              src="/myg.png"
              alt="My Yoga.Guru Logo"
              style={{
                height: '64px',
                width: 'auto',
                marginBottom: '16px',
                display: 'block',
                margin: '0 auto 16px auto',
              }}
            />
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#2d3748',
                marginBottom: '8px',
                margin: 0,
              }}
            >
              Welcome to My Yoga.Guru!
            </h2>
            <p
              style={{ fontSize: '16px', color: '#718096', lineHeight: '1.5', margin: '8px 0 0 0' }}
            >
              Let's complete your profile to personalize your experience
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="fullName"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4a5568',
                }}
              >
                What should we call you?
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                disabled={isLoading}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#667eea';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e8f0';
                }}
              />
              <p
                style={{
                  fontSize: '12px',
                  color: '#a0aec0',
                  marginTop: '6px',
                  margin: '6px 0 0 0',
                }}
              >
                This is how you'll appear to others on the platform
              </p>
            </div>

            <div
              style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}
            >
              <p
                style={{
                  fontSize: '13px',
                  color: '#718096',
                  marginBottom: '16px',
                  margin: '0 0 16px 0',
                }}
              >
                Optional: Help us personalize your yoga journey
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="experienceLevel"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#4a5568',
                  }}
                >
                  Experience Level
                </label>
                <select
                  id="experienceLevel"
                  value={experienceLevel}
                  onChange={e =>
                    setExperienceLevel(
                      e.target.value as 'beginner' | 'intermediate' | 'advanced' | ''
                    )
                  }
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff',
                  }}
                >
                  <option value="">Select your level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label
                    htmlFor="weight"
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#4a5568',
                    }}
                  >
                    Weight
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="weight"
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="0"
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <select
                      value={weightUnit}
                      onChange={e => setWeightUnit(e.target.value as 'kg' | 'lbs')}
                      disabled={isLoading}
                      style={{
                        padding: '12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#fff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="height"
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#4a5568',
                    }}
                  >
                    Height
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="height"
                      type="number"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="0"
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <select
                      value={heightUnit}
                      onChange={e => setHeightUnit(e.target.value as 'cm' | 'inches')}
                      disabled={isLoading}
                      style={{
                        padding: '12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#fff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="cm">cm</option>
                      <option value="inches">in</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="preconditions"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#4a5568',
                  }}
                >
                  Pre-existing Conditions
                </label>
                <textarea
                  id="preconditions"
                  value={preconditions}
                  onChange={e => setPreconditions(e.target.value)}
                  placeholder="Any injuries, conditions, or limitations we should know about..."
                  disabled={isLoading}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  color: '#c00',
                  fontSize: '14px',
                  marginBottom: '24px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !fullName.trim()}
              style={{
                width: '100%',
                padding: '16px',
                background: isLoading || !fullName.trim() ? '#cbd5e0' : '#667eea',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: isLoading || !fullName.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                if (!isLoading && fullName.trim()) {
                  e.currentTarget.style.background = '#5568d3';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseOut={e => {
                if (!isLoading && fullName.trim()) {
                  e.currentTarget.style.background = '#667eea';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '13px', color: '#a0aec0', margin: 0 }}>
              You can update this information later in your profile settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
