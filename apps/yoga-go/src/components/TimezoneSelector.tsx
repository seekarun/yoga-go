'use client';

import { useState, useEffect, useRef } from 'react';

interface TimezoneSelectorProps {
  /** Current selected timezone (IANA format) */
  value?: string;
  /** Called when timezone changes */
  onChange: (timezone: string) => void;
  /** Label text */
  label?: string;
  /** Show "Saved" indicator after change */
  showSavedIndicator?: boolean;
}

// Common timezones grouped by region
const TIMEZONE_GROUPS: { label: string; zones: { value: string; label: string }[] }[] = [
  {
    label: 'Americas',
    zones: [
      { value: 'America/New_York', label: 'Eastern Time (New York)' },
      { value: 'America/Chicago', label: 'Central Time (Chicago)' },
      { value: 'America/Denver', label: 'Mountain Time (Denver)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
      { value: 'America/Anchorage', label: 'Alaska Time' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
      { value: 'America/Toronto', label: 'Toronto' },
      { value: 'America/Vancouver', label: 'Vancouver' },
      { value: 'America/Mexico_City', label: 'Mexico City' },
      { value: 'America/Sao_Paulo', label: 'São Paulo' },
      { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
    ],
  },
  {
    label: 'Europe & Africa',
    zones: [
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Paris, Berlin, Rome' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam' },
      { value: 'Europe/Berlin', label: 'Berlin' },
      { value: 'Europe/Madrid', label: 'Madrid' },
      { value: 'Europe/Rome', label: 'Rome' },
      { value: 'Europe/Athens', label: 'Athens' },
      { value: 'Europe/Moscow', label: 'Moscow' },
      { value: 'Africa/Cairo', label: 'Cairo' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg' },
      { value: 'Africa/Lagos', label: 'Lagos' },
    ],
  },
  {
    label: 'Asia & Pacific',
    zones: [
      { value: 'Asia/Dubai', label: 'Dubai' },
      { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
      { value: 'Asia/Singapore', label: 'Singapore' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
      { value: 'Asia/Shanghai', label: 'China (Shanghai)' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Asia/Seoul', label: 'Seoul' },
      { value: 'Asia/Bangkok', label: 'Bangkok' },
      { value: 'Asia/Jakarta', label: 'Jakarta' },
      { value: 'Australia/Sydney', label: 'Sydney' },
      { value: 'Australia/Melbourne', label: 'Melbourne' },
      { value: 'Australia/Perth', label: 'Perth' },
      { value: 'Pacific/Auckland', label: 'Auckland' },
    ],
  },
];

// Get browser's detected timezone
function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

// Format current time in a timezone
function formatTimeInZone(timezone: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

// Get UTC offset for a timezone
function getUtcOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart?.value || '';
  } catch {
    return '';
  }
}

// Find display label for a timezone
function getTimezoneLabel(timezone: string): string {
  for (const group of TIMEZONE_GROUPS) {
    const zone = group.zones.find(z => z.value === timezone);
    if (zone) return zone.label;
  }
  // Return the timezone itself if not found in our list
  return timezone.replace(/_/g, ' ').split('/').pop() || timezone;
}

export default function TimezoneSelector({
  value,
  onChange,
  label = 'Timezone',
  showSavedIndicator = true,
}: TimezoneSelectorProps) {
  const [showSaved, setShowSaved] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const browserTimezone = getBrowserTimezone();
  const selectedTimezone = value || browserTimezone;

  // Update current time display
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatTimeInZone(selectedTimezone));
    };
    updateTime();
    timeIntervalRef.current = setInterval(updateTime, 60000); // Update every minute

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [selectedTimezone]);

  // Cleanup saved timeout on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (timezone: string) => {
    onChange(timezone);

    if (showSavedIndicator) {
      setShowSaved(true);
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setShowSaved(false);
      }, 3000);
    }
  };

  const handleAutoDetect = () => {
    handleChange(browserTimezone);
  };

  return (
    <div className="timezone-selector">
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '8px',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        <select
          value={selectedTimezone}
          onChange={e => handleChange(e.target.value)}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          {TIMEZONE_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.zones.map(zone => (
                <option key={zone.value} value={zone.value}>
                  {zone.label} ({getUtcOffset(zone.value)})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <button
          type="button"
          onClick={handleAutoDetect}
          style={{
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '13px',
            background: '#f8f9fa',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: '#555',
          }}
          title={`Detected: ${browserTimezone}`}
        >
          Auto-detect
        </button>
      </div>

      <div
        style={{
          fontSize: '12px',
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ color: '#666' }}>
          Current time in {getTimezoneLabel(selectedTimezone)}: <strong>{currentTime}</strong>
        </span>
        {showSaved && (
          <span
            style={{
              color: '#16a34a',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  );
}
