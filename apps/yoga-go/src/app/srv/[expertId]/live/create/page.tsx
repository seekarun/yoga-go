'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateLiveSessionPage({
  params,
}: {
  params: Promise<{ expertId: string }>;
}) {
  const { expertId } = use(params);
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingPlatform: 'google-meet' as 'zoom' | 'google-meet',
    meetingLink: '',
    sessionType: 'group' as '1-on-1' | 'group',
    scheduledStartTime: '',
    scheduledEndTime: '',
    maxParticipants: 10,
    price: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill end time as 1 hour after start time
  const handleStartTimeChange = (startTime: string) => {
    setFormData(prev => {
      const newData = { ...prev, scheduledStartTime: startTime };

      // Auto-fill end time if start time is set
      if (startTime && !prev.scheduledEndTime) {
        const startDate = new Date(startTime);
        startDate.setHours(startDate.getHours() + 1);
        const endTime = startDate.toISOString().slice(0, 16);
        newData.scheduledEndTime = endTime;
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/live/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/srv/${expertId}/live`);
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch (_err) {
      setError('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
        Create Live Session
      </h1>
      <p style={{ color: '#718096', marginBottom: '32px' }}>
        Schedule a new live video session with your students
      </p>

      {error && (
        <div
          style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c33',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Morning Vinyasa Flow"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Description *
          </label>
          <textarea
            required
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your session..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Meeting Platform *
          </label>
          <select
            value={formData.meetingPlatform}
            onChange={e =>
              setFormData({
                ...formData,
                meetingPlatform: e.target.value as 'zoom' | 'google-meet',
              })
            }
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          >
            <option value="google-meet">Google Meet</option>
            <option value="zoom">Zoom</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Meeting Link *
          </label>
          <input
            type="url"
            required
            value={formData.meetingLink}
            onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
            placeholder="https://zoom.us/j/... or https://meet.google.com/..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          />
          <p style={{ fontSize: '12px', color: '#718096', marginTop: '6px' }}>
            Paste your Zoom, Google Meet, or other video meeting link
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Session Type *
          </label>
          <select
            value={formData.sessionType}
            onChange={e =>
              setFormData({ ...formData, sessionType: e.target.value as '1-on-1' | 'group' })
            }
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          >
            <option value="1-on-1">1-on-1 Session</option>
            <option value="group">Group Session</option>
          </select>
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
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Start Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.scheduledStartTime}
              onChange={e => handleStartTimeChange(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              End Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.scheduledEndTime}
              onChange={e => setFormData({ ...formData, scheduledEndTime: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Max Participants {formData.sessionType === '1-on-1' && '(automatically set to 1)'}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.sessionType === '1-on-1' ? 1 : formData.maxParticipants}
            onChange={e => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
            disabled={formData.sessionType === '1-on-1'}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push(`/srv/${expertId}/live`)}
            style={{
              flex: 1,
              padding: '14px',
              background: '#f7fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              background: loading ? '#cbd5e0' : '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  );
}
