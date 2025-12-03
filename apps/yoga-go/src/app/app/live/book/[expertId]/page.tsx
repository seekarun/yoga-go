'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from 'react-calendar';
import { format, addDays } from 'date-fns';
import type { Expert, AvailableSlot } from '@/types';
import 'react-calendar/dist/Calendar.css';

export default function BookSessionPage({ params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = use(params);
  const router = useRouter();

  const [expert, setExpert] = useState<Expert | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AvailableSlot[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [_loadingAvailability, setLoadingAvailability] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExpert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchExpert is stable, only runs on mount/expertId change
  }, [expertId]);

  useEffect(() => {
    prefetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefetchAvailability is stable, only runs on mount/expertId change
  }, [expertId]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSlots is stable, only runs when selectedDate changes
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
    } catch (_err) {
      setError('Failed to load expert');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    if (!selectedDate) return;

    try {
      setLoadingSlots(true);
      setError('');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const cacheKey = dateStr;

      // Check if we already have this data in the availability map
      if (availabilityMap.has(cacheKey)) {
        setSlots(availabilityMap.get(cacheKey) || []);
        setLoadingSlots(false);
        return;
      }

      const response = await fetch(
        `/api/live/experts/${expertId}/available-slots?date=${dateStr}&duration=60`
      );
      const data = await response.json();

      if (data.success) {
        setSlots(data.data || []);
      } else {
        setError(data.error || 'Failed to load time slots');
      }
    } catch (_err) {
      setError('Failed to load time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const prefetchAvailability = async () => {
    try {
      setLoadingAvailability(true);
      const today = new Date();
      const promises: Promise<{ date: string; slots: AvailableSlot[] }>[] = [];

      // Fetch availability for next 14 days (60-minute sessions)
      for (let i = 0; i < 14; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');

        const promise = fetch(
          `/api/live/experts/${expertId}/available-slots?date=${dateStr}&duration=60`
        )
          .then(res => res.json())
          .then(data => ({
            date: dateStr,
            slots: data.success ? data.data || [] : [],
          }))
          .catch(() => ({
            date: dateStr,
            slots: [],
          }));

        promises.push(promise);
      }

      const results = await Promise.all(promises);

      // Build availability map
      const newMap = new Map<string, AvailableSlot[]>();
      results.forEach(({ date, slots }) => {
        newMap.set(date, slots);
      });

      setAvailabilityMap(newMap);

      // If we have a selected date, update slots from prefetched data
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        if (newMap.has(dateStr)) {
          setSlots(newMap.get(dateStr) || []);
        }
      }
    } catch (err) {
      console.error('[DBG][booking] Error prefetching availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleBookSlot = async (slot: AvailableSlot) => {
    setBookingSlotId(slot.startTime);
    setError('');

    try {
      const response = await fetch('/api/live/sessions/book-1on1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Session booked successfully! Check "My Sessions" to join when it starts.');
        router.push('/app/live');
      } else {
        setError(data.error || 'Failed to book session');
      }
    } catch (_err) {
      setError('Failed to book session');
    } finally {
      setBookingSlotId(null);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getTileClassName = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotsForDate = availabilityMap.get(dateStr);

    if (!slotsForDate) return ''; // Still loading or no data

    const availableCount = slotsForDate.filter(slot => slot.available).length;

    if (availableCount > 0) return 'has-availability';
    if (slotsForDate.length > 0 && availableCount === 0) return 'fully-booked';
    return ''; // No availability configured
  };

  const getTileContent = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotsForDate = availabilityMap.get(dateStr);

    if (!slotsForDate) return null; // Still loading

    const availableCount = slotsForDate.filter(slot => slot.available).length;

    if (slotsForDate.length === 0) {
      // No availability configured for this day
      return null;
    }

    if (availableCount === 0) {
      // Fully booked
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '2px',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#ef4444',
            }}
          />
        </div>
      );
    }

    // Has available slots
    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
          }}
        />
        <div style={{ fontSize: '10px', color: '#059669', fontWeight: '600', marginTop: '2px' }}>
          {availableCount}
        </div>
      </div>
    );
  };

  const tileDisabled = ({ date }: { date: Date }) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable dates more than 14 days away
    const maxDate = addDays(today, 14);
    if (date > maxDate) return true;

    return false;
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

  return (
    <div style={{ minHeight: '100vh', paddingTop: '80px', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
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
            Book a Session
          </h1>
          <p style={{ fontSize: '18px', color: '#718096' }}>with {expert.name}</p>
        </div>

        {/* Error Message */}
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Calendar */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
              Select a Date
            </h2>
            <Calendar
              onChange={value => setSelectedDate(value as Date)}
              value={selectedDate}
              tileDisabled={tileDisabled}
              tileClassName={getTileClassName}
              tileContent={getTileContent}
              minDate={new Date()}
              maxDate={addDays(new Date(), 14)}
              className="booking-calendar"
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
              * You can book up to 14 days in advance
            </p>
          </div>

          {/* Time Slots */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
              Available Times
            </h2>

            {selectedDate && (
              <p style={{ fontSize: '14px', color: '#4a5568', marginBottom: '16px' }}>
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            )}

            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Loading available times...</div>
              </div>
            ) : slots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
                <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
                  No available times
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>
                  Try selecting a different date
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {slots.map((slot, index) => {
                  const isBooked = !slot.available;

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        background: isBooked ? '#f9fafb' : '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isBooked ? '#9ca3af' : '#10b981',
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '600' }}>
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {isBooked ? 'Booked' : 'Available'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookSlot(slot)}
                        disabled={bookingSlotId !== null || isBooked}
                        style={{
                          padding: '8px 20px',
                          background: isBooked ? '#e5e7eb' : '#667eea',
                          color: isBooked ? '#9ca3af' : '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: isBooked || bookingSlotId !== null ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isBooked
                          ? 'Booked'
                          : bookingSlotId === slot.startTime
                            ? 'Booking...'
                            : 'Book'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
            Calendar Legend:
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#10b981',
                }}
              />
              <span>Available slots (green dot + number)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ef4444',
                }}
              />
              <span>Fully booked (red dot)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#d1d5db',
                  border: '1px solid #9ca3af',
                }}
              />
              <span>No availability configured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Styles */}
      <style jsx global>{`
        .booking-calendar {
          width: 100%;
          border: none !important;
          font-family: inherit;
        }

        .booking-calendar .react-calendar__tile {
          padding: 12px 6px;
          font-size: 14px;
        }

        .booking-calendar .react-calendar__tile--active {
          background: #667eea !important;
          color: white;
        }

        .booking-calendar .react-calendar__tile--now {
          background: #e0e7ff;
        }

        .booking-calendar .react-calendar__tile:enabled:hover {
          background: #f3f4f6;
        }

        .booking-calendar .react-calendar__tile:disabled {
          background: #f9fafb;
          color: #d1d5db;
        }

        .booking-calendar .react-calendar__month-view__weekdays {
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
        }

        .booking-calendar .has-availability {
          background: #f0fdf4 !important;
        }

        .booking-calendar .has-availability:hover {
          background: #dcfce7 !important;
        }

        .booking-calendar .fully-booked {
          background: #fef2f2 !important;
        }

        .booking-calendar .fully-booked:hover {
          background: #fee2e2 !important;
        }

        .booking-calendar .react-calendar__tile--active.has-availability {
          background: #667eea !important;
        }

        .booking-calendar .react-calendar__tile--active.fully-booked {
          background: #667eea !important;
        }
      `}</style>
    </div>
  );
}
