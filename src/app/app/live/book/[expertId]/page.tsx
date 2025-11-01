'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Expert, AvailableSlot } from '@/types';

export default function BookSessionPage({ params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = use(params);
  const router = useRouter();

  const [expert, setExpert] = useState<Expert | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  // Get next 7 days
  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const [weekDays] = useState(getNext7Days());

  useEffect(() => {
    fetchExpert();
    // Set today as default
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, [expertId]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
  }, [selectedDate]);

  const fetchExpert = async () => {
    try {
      const response = await fetch(`/data/experts/${expertId}`);
      const data = await response.json();
      if (data.success) {
        setExpert(data.data);
      } else {
        setError('Expert not found');
      }
    } catch (err) {
      setError('Failed to load expert');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      setError('');
      const response = await fetch(
        `/api/live/experts/${expertId}/available-slots?date=${selectedDate}&duration=60`
      );
      const data = await response.json();

      if (data.success) {
        setSlots(data.data || []);
      } else {
        setError(data.error || 'Failed to load time slots');
      }
    } catch (err) {
      setError('Failed to load time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;

    setBooking(true);
    setError('');

    try {
      const response = await fetch('/api/live/sessions/book-1on1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Session booked successfully! You will receive a notification when it starts.');
        router.push('/app/live');
      } else {
        setError(data.error || 'Failed to book session');
      }
    } catch (err) {
      setError('Failed to book session');
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
          Expert not found
        </div>
        <button
          onClick={() => router.push('/experts')}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Browse Experts
        </button>
      </div>
    );
  }

  const availableSlots = slots.filter(s => s.available);

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        style={{
          padding: '8px 16px',
          background: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '24px',
        }}
      >
        ← Back
      </button>

      {/* Expert Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <img
            src={expert.avatar}
            alt={expert.name}
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {expert.name}
            </h1>
            <p style={{ color: '#718096', marginBottom: '8px' }}>{expert.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#f59e0b' }}>⭐</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{expert.rating}</span>
              <span style={{ fontSize: '14px', color: '#718096' }}>
                • {expert.totalStudents} students
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Select a Date</h2>

      {/* Date Selector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
          marginBottom: '32px',
        }}
      >
        {weekDays.map(day => {
          const dateStr = day.toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              style={{
                padding: '12px',
                background: isSelected ? '#667eea' : '#fff',
                color: isSelected ? '#fff' : '#000',
                border: isToday ? '2px solid #667eea' : '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              <div>{formatDayName(day)}</div>
              <div style={{ fontSize: '16px', marginTop: '4px' }}>{formatDate(day)}</div>
            </button>
          );
        })}
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
        Available Time Slots
      </h2>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            marginBottom: '16px',
            color: '#c33',
          }}
        >
          {error}
        </div>
      )}

      {/* Time Slots */}
      {loadingSlots ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading time slots...
        </div>
      ) : availableSlots.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            background: '#f7fafc',
            borderRadius: '12px',
            color: '#666',
          }}
        >
          No available slots for this date. Please select another date.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          {availableSlots.map((slot, index) => {
            const isSelected = selectedSlot?.startTime === slot.startTime;
            return (
              <button
                key={index}
                onClick={() => setSelectedSlot(slot)}
                style={{
                  padding: '16px',
                  background: isSelected ? '#667eea' : '#fff',
                  color: isSelected ? '#fff' : '#000',
                  border: '2px solid' + (isSelected ? '#667eea' : '#e2e8f0'),
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                }}
              >
                {formatTime(slot.startTime)}
              </button>
            );
          })}
        </div>
      )}

      {/* Booking Confirmation */}
      {selectedSlot && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            Confirm Booking
          </h3>
          <div style={{ marginBottom: '16px', color: '#4a5568' }}>
            <p>
              <strong>Expert:</strong> {expert.name}
            </p>
            <p>
              <strong>Date:</strong>{' '}
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p>
              <strong>Time:</strong> {formatTime(selectedSlot.startTime)} -{' '}
              {formatTime(selectedSlot.endTime)}
            </p>
            <p>
              <strong>Duration:</strong> {selectedSlot.duration} minutes
            </p>
            <p>
              <strong>Price:</strong> Free (for now)
            </p>
          </div>

          <button
            onClick={handleBookSlot}
            disabled={booking}
            style={{
              width: '100%',
              padding: '16px',
              background: booking ? '#cbd5e0' : '#48bb78',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: booking ? 'not-allowed' : 'pointer',
            }}
          >
            {booking ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
