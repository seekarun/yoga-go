'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User, ExpertAvailability } from '@/types';

export default function AvailabilityManagementPage({
  params,
}: {
  params: Promise<{ expertId: string }>;
}) {
  const { expertId } = use(params);
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<ExpertAvailability[]>([]);

  // Recurring form state
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('17:00');

  // One-time form state
  const [oneTimeDate, setOneTimeDate] = useState('');
  const [oneTimeStartTime, setOneTimeStartTime] = useState('09:00');
  const [oneTimeEndTime, setOneTimeEndTime] = useState('17:00');

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Check authorization first
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  useEffect(() => {
    if (!authChecking) {
      fetchAvailability();
    }
  }, [authChecking]);

  const checkAuthorization = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.success || !data.data) {
        router.push('/');
        return;
      }

      const user: User = data.data;

      if (user.role !== 'expert') {
        router.push('/');
        return;
      }

      // Check if expert profile is set up
      if (!user.expertProfile) {
        router.push('/srv');
        return;
      }

      if (user.expertProfile !== expertId) {
        router.push(`/srv/${user.expertProfile}/live/availability`);
        return;
      }

      setAuthChecking(false);
    } catch (err) {
      console.error('[DBG][availability] Error checking authorization:', err);
      router.push('/');
    }
  };

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/srv/live/availability');
      const data = await response.json();

      if (data.success) {
        setAvailabilitySlots(data.data || []);
      } else {
        setError(data.error || 'Failed to load availability');
      }
    } catch (err) {
      console.error('[DBG][availability] Error fetching availability:', err);
      setError('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleRecurringSubmit = async () => {
    if (recurringDays.length === 0) {
      setError('Please select at least one day');
      return;
    }

    if (recurringStartTime >= recurringEndTime) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Create one availability slot for each selected day
      const promises = recurringDays.map(dayOfWeek =>
        fetch('/api/srv/live/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayOfWeek,
            startTime: recurringStartTime,
            endTime: recurringEndTime,
            isRecurring: true,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));

      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        setSuccess(`Added recurring availability for ${recurringDays.length} day(s)`);
        setRecurringDays([]);
        await fetchAvailability();
      } else {
        setError('Some availability slots failed to save');
      }
    } catch (err) {
      console.error('[DBG][availability] Error saving recurring availability:', err);
      setError('Failed to save recurring availability');
    } finally {
      setSaving(false);
    }
  };

  const handleOneTimeSubmit = async () => {
    if (!oneTimeDate) {
      setError('Please select a date');
      return;
    }

    if (oneTimeStartTime >= oneTimeEndTime) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/srv/live/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: oneTimeDate,
          startTime: oneTimeStartTime,
          endTime: oneTimeEndTime,
          isRecurring: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('One-time availability added successfully');
        setOneTimeDate('');
        await fetchAvailability();
      } else {
        setError(data.error || 'Failed to save availability');
      }
    } catch (err) {
      console.error('[DBG][availability] Error saving one-time availability:', err);
      setError('Failed to save one-time availability');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/srv/live/availability/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Availability slot deleted');
        await fetchAvailability();
      } else {
        setError(data.error || 'Failed to delete availability');
      }
    } catch (err) {
      console.error('[DBG][availability] Error deleting availability:', err);
      setError('Failed to delete availability');
    }
  };

  const toggleDay = (day: number) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (authChecking || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
          <p style={{ marginTop: '16px', color: '#718096' }}>
            {authChecking ? 'Verifying access...' : 'Loading availability...'}
          </p>
        </div>
      </div>
    );
  }

  const recurringSlots = availabilitySlots.filter(s => s.isRecurring);
  const oneTimeSlots = availabilitySlots.filter(s => !s.isRecurring);

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '8px 16px',
            background: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          Manage Availability
        </h1>
        <p style={{ color: '#718096' }}>
          Set your weekly schedule and special availability for 1-on-1 sessions
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: '16px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#c33',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: '16px',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#155724',
          }}
        >
          {success}
        </div>
      )}

      {/* Recurring Weekly Availability */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
          Weekly Recurring Availability
        </h2>
        <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
          Set regular weekly hours when you're available for bookings
        </p>

        {/* Day selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
            Select Days
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dayNames.map((day, index) => (
              <button
                key={index}
                onClick={() => toggleDay(index)}
                style={{
                  padding: '12px 20px',
                  background: recurringDays.includes(index) ? '#667eea' : '#fff',
                  color: recurringDays.includes(index) ? '#fff' : '#2d3748',
                  border: `2px solid ${recurringDays.includes(index) ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                }}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time range */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              Start Time
            </label>
            <input
              type="time"
              value={recurringStartTime}
              onChange={e => setRecurringStartTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              End Time
            </label>
            <input
              type="time"
              value={recurringEndTime}
              onChange={e => setRecurringEndTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleRecurringSubmit}
          disabled={saving || recurringDays.length === 0}
          style={{
            padding: '12px 32px',
            background: saving || recurringDays.length === 0 ? '#cbd5e0' : '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving || recurringDays.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Adding...' : 'Add Weekly Availability'}
        </button>
      </div>

      {/* One-Time Availability */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
          One-Time Availability
        </h2>
        <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
          Add special availability for a specific date
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              Date
            </label>
            <input
              type="date"
              value={oneTimeDate}
              onChange={e => setOneTimeDate(e.target.value)}
              min={getMinDate()}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              Start Time
            </label>
            <input
              type="time"
              value={oneTimeStartTime}
              onChange={e => setOneTimeStartTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              End Time
            </label>
            <input
              type="time"
              value={oneTimeEndTime}
              onChange={e => setOneTimeEndTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleOneTimeSubmit}
          disabled={saving || !oneTimeDate}
          style={{
            padding: '12px 32px',
            background: saving || !oneTimeDate ? '#cbd5e0' : '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving || !oneTimeDate ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Adding...' : 'Add One-Time Availability'}
        </button>
      </div>

      {/* Current Availability List */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
          Current Availability
        </h2>

        {/* Recurring Slots */}
        {recurringSlots.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#667eea',
              }}
            >
              Weekly Recurring ({recurringSlots.length})
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {recurringSlots.map(slot => (
                <div
                  key={slot.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {dayNames[slot.dayOfWeek!]}
                    </div>
                    <div style={{ fontSize: '14px', color: '#718096' }}>
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    style={{
                      padding: '8px 16px',
                      background: '#fff',
                      border: '1px solid #fc8181',
                      borderRadius: '6px',
                      color: '#e53e3e',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* One-Time Slots */}
        {oneTimeSlots.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#48bb78',
              }}
            >
              One-Time Special ({oneTimeSlots.length})
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {oneTimeSlots.map(slot => (
                <div
                  key={slot.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {new Date(slot.date!).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div style={{ fontSize: '14px', color: '#718096' }}>
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    style={{
                      padding: '8px 16px',
                      background: '#fff',
                      border: '1px solid #fc8181',
                      borderRadius: '6px',
                      color: '#e53e3e',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {recurringSlots.length === 0 && oneTimeSlots.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <p>No availability set yet. Add your first availability slot above.</p>
          </div>
        )}
      </div>

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
