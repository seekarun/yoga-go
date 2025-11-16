'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from 'react-calendar';
import { format, addDays } from 'date-fns';
import type { User, ExpertAvailability } from '@/types';
import 'react-calendar/dist/Calendar.css';

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

  // Meeting link for 1-on-1 sessions
  const [meetingLink, setMeetingLink] = useState('');

  // Recurring form state
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('17:00');

  // One-time form state
  const [oneTimeDate, setOneTimeDate] = useState('');
  const [oneTimeStartTime, setOneTimeStartTime] = useState('09:00');
  const [oneTimeEndTime, setOneTimeEndTime] = useState('17:00');

  // Calendar view state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [newSlotStartTime, setNewSlotStartTime] = useState('09:00');
  const [newSlotEndTime, setNewSlotEndTime] = useState('10:00');
  const [isRecurringSlot, setIsRecurringSlot] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Calculate window duration whenever start/end time changes
  const windowDurationMinutes = useMemo(() => {
    const [startHour, startMinute] = newSlotStartTime.split(':').map(Number);
    const [endHour, endMinute] = newSlotEndTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    return endTotalMinutes - startTotalMinutes;
  }, [newSlotStartTime, newSlotEndTime]);

  // Auto-set session duration if window is <= 60 minutes
  useEffect(() => {
    if (windowDurationMinutes <= 60) {
      if (windowDurationMinutes <= 30) {
        setSessionDuration(30);
      } else {
        setSessionDuration(60);
      }
    }
  }, [windowDurationMinutes]);

  // Filter available duration options based on window size
  const availableDurationOptions = useMemo(() => {
    const options = [];
    if (windowDurationMinutes >= 30) options.push(30);
    if (windowDurationMinutes >= 60) options.push(60);
    // 90-minute option removed - only offering 30 and 60 minute sessions
    return options;
  }, [windowDurationMinutes]);

  // Should show duration selector (only if window > 60 minutes)
  const shouldShowDurationSelector = windowDurationMinutes > 60;

  // Pending slots for batch creation
  type PendingSlot = {
    id: string;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    sessionDuration: number;
    bufferMinutes: number;
  };
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);

  // Bulk delete state
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      // Auto-fill meeting link from profile default
      if (user.defaultMeetingLink) {
        setMeetingLink(user.defaultMeetingLink);
        console.log(
          '[DBG][availability] Auto-filled meeting link from profile:',
          user.defaultMeetingLink
        );
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

    if (!meetingLink.trim()) {
      setError('Please provide a meeting link');
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
            meetingLink: meetingLink.trim(),
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

    if (!meetingLink.trim()) {
      setError('Please provide a meeting link');
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
          meetingLink: meetingLink.trim(),
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

  const handleDeleteAll = async () => {
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/srv/live/availability', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'All availability slots deleted successfully');
        setShowDeleteAllConfirm(false);
        await fetchAvailability();
      } else {
        setError(data.error || 'Failed to delete all availability slots');
      }
    } catch (err) {
      console.error('[DBG][availability] Error deleting all availability:', err);
      setError('Failed to delete all availability slots');
    } finally {
      setDeleting(false);
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

  // Generate time options in 30-minute increments
  const generateTimeOptions = (): string[] => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30]) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        times.push(timeStr);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Calendar view helper functions
  const getSlotsForDate = (date: Date): ExpertAvailability[] => {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');

    // Get recurring slots for this day of week
    const recurringForDay = availabilitySlots.filter(
      slot => slot.isRecurring && slot.dayOfWeek === dayOfWeek
    );

    // Get one-time slots for this specific date
    const oneTimeForDate = availabilitySlots.filter(
      slot => !slot.isRecurring && slot.date === dateStr
    );

    return [...recurringForDay, ...oneTimeForDate];
  };

  const handleDateClick = (value: any) => {
    // Calendar can return Date, null, or [Date, Date] for ranges
    // We only want single date selection
    if (!value || value instanceof Array) return;
    setSelectedDate(value as Date);
    setShowTimeSlotModal(true);
    setNewSlotStartTime('09:00');
    setNewSlotEndTime('10:00');
    setIsRecurringSlot(false);
    setPendingSlots([]); // Clear pending slots when opening modal
  };

  const handleAddToPendingList = () => {
    if (newSlotStartTime >= newSlotEndTime) {
      setError('End time must be after start time');
      return;
    }

    // Check for duplicate in pending list
    const isDuplicate = pendingSlots.some(
      slot =>
        slot.startTime === newSlotStartTime &&
        slot.endTime === newSlotEndTime &&
        slot.isRecurring === isRecurringSlot
    );

    if (isDuplicate) {
      setError('This time slot is already in your pending list');
      return;
    }

    // Add to pending list
    const newPendingSlot: PendingSlot = {
      id: `pending-${Date.now()}-${Math.random()}`,
      startTime: newSlotStartTime,
      endTime: newSlotEndTime,
      isRecurring: isRecurringSlot,
      sessionDuration: sessionDuration,
      bufferMinutes: bufferMinutes,
    };

    setPendingSlots(prev => [...prev, newPendingSlot]);
    setError('');

    // Reset form for next slot
    setNewSlotStartTime('09:00');
    setNewSlotEndTime('10:00');
    setIsRecurringSlot(false);
    // Keep duration and buffer settings for convenience
  };

  const handleRemoveFromPending = (id: string) => {
    setPendingSlots(prev => prev.filter(slot => slot.id !== id));
  };

  const handleSaveAllSlots = async () => {
    if (!selectedDate) return;
    if (pendingSlots.length === 0) {
      setError('Please add at least one time slot');
      return;
    }

    if (!meetingLink.trim()) {
      setError('Please provide a meeting link');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const dayOfWeek = selectedDate.getDay();
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Save all pending slots
      const promises = pendingSlots.map(slot =>
        fetch('/api/srv/live/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayOfWeek: slot.isRecurring ? dayOfWeek : undefined,
            date: !slot.isRecurring ? dateStr : undefined,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isRecurring: slot.isRecurring,
            sessionDuration: slot.sessionDuration,
            bufferMinutes: slot.bufferMinutes,
            meetingLink: meetingLink.trim(),
          }),
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);

      // Check if all succeeded
      const allSucceeded = results.every(data => data.success);

      if (allSucceeded) {
        setSuccess(
          `Successfully added ${pendingSlots.length} availability slot${pendingSlots.length > 1 ? 's' : ''}`
        );
        setShowTimeSlotModal(false);
        setPendingSlots([]);
        await fetchAvailability();
      } else {
        const failedCount = results.filter(data => !data.success).length;
        setError(`Failed to add ${failedCount} of ${pendingSlots.length} slots`);
      }
    } catch (err) {
      console.error('[DBG][availability] Error saving time slots:', err);
      setError('Failed to save availability slots');
    } finally {
      setSaving(false);
    }
  };

  const getTileClassName = ({ date }: { date: Date }) => {
    const slots = getSlotsForDate(date);
    if (slots.length > 0) return 'has-availability';
    return '';
  };

  const getTileContent = ({ date }: { date: Date }) => {
    const slots = getSlotsForDate(date);
    if (slots.length === 0) return null;

    return (
      <div
        style={{
          fontSize: '11px',
          color: 'white',
          fontWeight: '700',
          marginTop: '2px',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {slots.length} slot{slots.length > 1 ? 's' : ''}
      </div>
    );
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

      {/* MVP: Group session configuration hidden for now - 1-on-1 sessions only */}
      {/* Session Configuration */}
      {/* <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
          Session Configuration
        </h2>
        <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
          Configure your group session settings
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              Session Duration
            </label>
            <select
              value={sessionDuration}
              onChange={e => setSessionDuration(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#fff',
              }}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>

          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              Max Students
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxStudents}
              onChange={e => setMaxStudents(Number(e.target.value))}
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
              Buffer Between Sessions
            </label>
            <select
              value={bufferTime}
              onChange={e => setBufferTime(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#fff',
              }}
            >
              <option value={0}>No buffer</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              Meeting Platform
            </label>
            <select
              value={meetingPlatform}
              onChange={e => setMeetingPlatform(e.target.value as 'google-meet' | 'zoom')}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#fff',
              }}
            >
              <option value="google-meet">Google Meet</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label
              style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
            >
              Meeting Link <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="url"
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/... or https://zoom.us/j/..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
              This link will be shared with all students who book your sessions
            </p>
          </div>
        </div>
      </div> */}

      {/* Meeting Link Configuration */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Meeting Link</h2>
        <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
          This link will be shared with students who book your sessions
        </p>
        <div>
          <label
            style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}
          >
            Meeting Link <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="url"
            value={meetingLink}
            onChange={e => setMeetingLink(e.target.value)}
            placeholder="https://meet.google.com/... or https://zoom.us/j/..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            {meetingLink ? (
              <>ℹ️ Using your default meeting link from profile. You can change this anytime.</>
            ) : (
              <>
                This link will be shared with all students who book your sessions. You can set a
                default in your profile settings.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Calendar View */}
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
          Availability Calendar
        </h2>
        <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
          Click on a date to add or manage your availability. You can schedule up to 2 months in
          advance.
        </p>

        <Calendar
          onChange={handleDateClick}
          value={selectedDate}
          tileClassName={getTileClassName}
          tileContent={getTileContent}
          minDate={new Date()}
          maxDate={addDays(new Date(), 60)}
          className="booking-calendar"
        />

        <div
          style={{ marginTop: '16px', padding: '12px', background: '#f7fafc', borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#667eea',
                }}
              />
              <span>Has availability</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#e2e8f0',
                }}
              />
              <span>No availability</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {availabilitySlots.length > 0 && (
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
            Bulk Actions
          </h2>
          <p style={{ color: '#718096', marginBottom: '16px', fontSize: '14px' }}>
            You have {availabilitySlots.length} availability slot
            {availabilitySlots.length !== 1 ? 's' : ''} configured.
          </p>
          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            style={{
              padding: '12px 24px',
              background: '#fff',
              color: '#e53e3e',
              border: '2px solid #fc8181',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Delete All Availability Slots
          </button>
        </div>
      )}

      {/* Modal for adding time slots */}
      {showTimeSlotModal && selectedDate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowTimeSlotModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Manage Availability</h2>
              <button
                onClick={() => setShowTimeSlotModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                background: '#f7fafc',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </div>
              <div style={{ fontSize: '14px', color: '#718096' }}>
                Day of week: {dayNames[selectedDate.getDay()]}
              </div>
            </div>

            {/* Existing slots for this date */}
            {getSlotsForDate(selectedDate).length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Existing Time Slots
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {getSlotsForDate(selectedDate).map(slot => (
                    <div
                      key={slot.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: slot.isRecurring ? '#f0f4ff' : '#f0fff4',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>
                          {slot.isRecurring ? `Every ${dayNames[slot.dayOfWeek!]}` : 'One-time'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#fff',
                          border: '1px solid #fc8181',
                          borderRadius: '6px',
                          color: '#e53e3e',
                          cursor: 'pointer',
                          fontSize: '12px',
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

            {/* Pending slots list */}
            {pendingSlots.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#667eea',
                  }}
                >
                  Pending Slots ({pendingSlots.length})
                </h3>
                <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                  {pendingSlots.map(slot => (
                    <div
                      key={slot.id}
                      style={{
                        padding: '12px',
                        border: '2px solid #667eea',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f7fafc',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>
                          {slot.isRecurring
                            ? `Every ${dayNames[selectedDate.getDay()]}`
                            : 'One-time'}{' '}
                          • {slot.sessionDuration} min sessions
                          {slot.bufferMinutes > 0 && ` • ${slot.bufferMinutes} min buffer`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromPending(slot.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#fff',
                          border: '1px solid #fc8181',
                          borderRadius: '6px',
                          color: '#e53e3e',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new time slot form */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                {pendingSlots.length > 0 ? 'Add Another Time Slot' : 'Add New Time Slot'}
              </h3>

              {/* Time selection (moved to top) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: '600',
                      marginBottom: '8px',
                      fontSize: '14px',
                    }}
                  >
                    Start Time
                  </label>
                  <select
                    value={newSlotStartTime}
                    onChange={e => setNewSlotStartTime(e.target.value)}
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
                    {timeOptions.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: '600',
                      marginBottom: '8px',
                      fontSize: '14px',
                    }}
                  >
                    End Time
                  </label>
                  <select
                    value={newSlotEndTime}
                    onChange={e => setNewSlotEndTime(e.target.value)}
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
                    {timeOptions.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Session Duration Selector (only shown when window > 60 minutes) */}
              {shouldShowDurationSelector ? (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontWeight: '600',
                        marginBottom: '8px',
                        fontSize: '14px',
                      }}
                    >
                      Session Duration <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={sessionDuration}
                      onChange={e => setSessionDuration(Number(e.target.value))}
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
                      {availableDurationOptions.map(duration => (
                        <option key={duration} value={duration}>
                          {duration} minutes{duration === 60 ? ' (1 hour)' : ''}
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                      This time window will be divided into {sessionDuration}-minute bookable slots
                    </p>
                  </div>

                  {/* Advanced Options Toggle */}
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#667eea',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {showAdvancedOptions ? '▼' : '▶'} Advanced Options
                    </button>
                  </div>

                  {/* Buffer Time Selector (conditionally shown) */}
                  {showAdvancedOptions && (
                    <div
                      style={{
                        marginBottom: '16px',
                        paddingLeft: '16px',
                        borderLeft: '3px solid #e2e8f0',
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          fontWeight: '600',
                          marginBottom: '8px',
                          fontSize: '14px',
                        }}
                      >
                        Buffer Time Between Sessions
                      </label>
                      <select
                        value={bufferMinutes}
                        onChange={e => setBufferMinutes(Number(e.target.value))}
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
                        <option value={0}>No buffer (back-to-back)</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                      </select>
                      <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                        Add break time between consecutive sessions for preparation
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Auto-duration info message when window <= 60 minutes */
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    background: '#f0f4ff',
                    borderRadius: '8px',
                    border: '1px solid #c7d2fe',
                  }}
                >
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#4338ca',
                      fontWeight: '500',
                      marginBottom: '4px',
                    }}
                  >
                    ✓ Single {sessionDuration}-minute session slot
                  </p>
                  <p style={{ fontSize: '12px', color: '#6366f1' }}>
                    This time window will create one bookable slot. Select a larger window (more
                    than 60 minutes) to subdivide into multiple slots.
                  </p>
                </div>
              )}

              {/* Recurring checkbox (moved to bottom) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isRecurringSlot}
                    onChange={e => setIsRecurringSlot(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    Repeat every {dayNames[selectedDate.getDay()]}
                  </span>
                </label>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#718096',
                    marginTop: '4px',
                    marginLeft: '24px',
                  }}
                >
                  {isRecurringSlot
                    ? `This will create a recurring slot for all ${dayNames[selectedDate.getDay()]}s`
                    : `This will only add availability for ${format(selectedDate, 'MMMM d, yyyy')}`}
                </p>
              </div>

              {/* Add to pending button */}
              <button
                onClick={handleAddToPendingList}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: '#f7fafc',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                + Add to List
              </button>

              {/* Save all button */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleSaveAllSlots}
                  disabled={saving || pendingSlots.length === 0}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: saving || pendingSlots.length === 0 ? '#cbd5e0' : '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: saving || pendingSlots.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : `Save Availability${pendingSlots.length > 0 ? ` (${pendingSlots.length})` : ''}`}
                </button>
                <button
                  onClick={() => {
                    setShowTimeSlotModal(false);
                    setPendingSlots([]);
                  }}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    background: '#fff',
                    color: '#2d3748',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Dialog */}
      {showDeleteAllConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => !deleting && setShowDeleteAllConfirm(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#e53e3e' }}>
                ⚠️ Delete All Availability?
              </h2>
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={deleting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  color: '#999',
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                marginBottom: '24px',
                fontSize: '16px',
                lineHeight: '1.5',
                color: '#4a5568',
              }}
            >
              This will permanently delete{' '}
              <strong>
                all {availabilitySlots.length} availability slot
                {availabilitySlots.length !== 1 ? 's' : ''}
              </strong>{' '}
              from your calendar. Students will no longer be able to book sessions during these
              times.
            </p>

            <p style={{ marginBottom: '24px', fontSize: '14px', color: '#718096' }}>
              This action cannot be undone. Are you absolutely sure?
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: deleting ? '#cbd5e0' : '#e53e3e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete All'}
              </button>
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={deleting}
                style={{
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#2d3748',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animation and calendar styles */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        :global(.booking-calendar) {
          width: 100%;
          border: none;
          font-family: inherit;
        }

        :global(.booking-calendar .react-calendar__tile) {
          padding: 12px 8px;
          position: relative;
          background: #fff;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        :global(.booking-calendar .react-calendar__tile:hover) {
          background: #f7fafc;
        }

        :global(.booking-calendar .react-calendar__tile--active) {
          background: #667eea !important;
          color: white;
        }

        :global(.booking-calendar .react-calendar__tile.has-availability) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 600;
        }

        :global(.booking-calendar .react-calendar__tile.has-availability:hover) {
          background: linear-gradient(135deg, #5568d3 0%, #63408a 100%);
        }

        :global(.booking-calendar .react-calendar__month-view__days__day--neighboringMonth) {
          color: #cbd5e0;
        }

        :global(.booking-calendar .react-calendar__navigation button) {
          font-size: 16px;
          font-weight: 600;
          color: #2d3748;
        }

        :global(.booking-calendar .react-calendar__navigation button:hover) {
          background: #f7fafc;
        }
      `}</style>
    </div>
  );
}
