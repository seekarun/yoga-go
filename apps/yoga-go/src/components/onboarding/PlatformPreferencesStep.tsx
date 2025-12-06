'use client';

interface PlatformPreferencesStepProps {
  expertId: string;
  featuredOnPlatform: boolean;
  onFeaturedChange: (featured: boolean) => void;
}

export default function PlatformPreferencesStep({
  expertId,
  featuredOnPlatform,
  onFeaturedChange,
}: PlatformPreferencesStepProps) {
  const subdomain = expertId ? `${expertId}.myyoga.guru` : '<your-id>.myyoga.guru';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
        Platform Preferences
      </h2>

      {/* Subdomain Preview */}
      <div
        style={{
          marginBottom: '32px',
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          Your Expert Subdomain
        </h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Your courses and content will be available at:
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
        >
          <span style={{ color: '#3b82f6', fontWeight: '500' }}>https://</span>
          <span style={{ color: '#1e293b', fontWeight: '600' }}>{subdomain}</span>
        </div>
        <p style={{ fontSize: '12px', color: '#888', marginTop: '12px' }}>
          You can also add a custom domain (e.g., yourdomain.com) later in settings.
        </p>
      </div>

      {/* Platform Visibility Toggle */}
      <div
        style={{
          marginBottom: '24px',
          padding: '20px',
          background: featuredOnPlatform ? '#f0fdf4' : '#fef2f2',
          borderRadius: '8px',
          border: `1px solid ${featuredOnPlatform ? '#bbf7d0' : '#fecaca'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={featuredOnPlatform}
              onChange={e => onFeaturedChange(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                marginRight: '12px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              Show my courses on myyoga.guru platform
            </span>
          </label>
        </div>

        <div style={{ marginTop: '16px', marginLeft: '32px' }}>
          {featuredOnPlatform ? (
            <div>
              <p style={{ fontSize: '14px', color: '#166534', marginBottom: '8px' }}>
                <strong>Platform Visibility: ON</strong>
              </p>
              <ul style={{ fontSize: '13px', color: '#166534', paddingLeft: '20px', margin: 0 }}>
                <li>Your courses appear on myyoga.guru/courses</li>
                <li>Students can discover you through platform search</li>
                <li>You benefit from platform marketing and traffic</li>
              </ul>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '8px' }}>
                <strong>Platform Visibility: OFF</strong>
              </p>
              <ul style={{ fontSize: '13px', color: '#991b1b', paddingLeft: '20px', margin: 0 }}>
                <li>Your courses only appear on your subdomain ({subdomain})</li>
                <li>Students need your direct link to find you</li>
                <li>Ideal for private coaching or existing audience</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Email Preview */}
      <div
        style={{
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          Your Default Email Address
        </h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Email notifications to your students will be sent from:
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
        >
          <span style={{ color: '#1e293b', fontWeight: '600' }}>
            {expertId || '<your-id>'}@myyoga.guru
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#888', marginTop: '12px' }}>
          You can configure a custom email address (e.g., hello@yourdomain.com) later in settings.
        </p>
      </div>
    </div>
  );
}
