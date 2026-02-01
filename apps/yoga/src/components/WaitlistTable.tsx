'use client';

import type { WaitlistSignup } from '@/lib/repositories/waitlistRepository';

interface WaitlistTableProps {
  signups: WaitlistSignup[];
}

export default function WaitlistTable({ signups }: WaitlistTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (signups.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <p style={{ color: '#718096', fontSize: '16px' }}>No waitlist signups yet.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Email
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Interests / Thoughts
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {signups.map((signup, index) => (
              <tr
                key={signup.id}
                style={{
                  borderBottom: index < signups.length - 1 ? '1px solid #e2e8f0' : 'none',
                }}
              >
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                        fontSize: '16px',
                      }}
                    >
                      {signup.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: '500', color: '#2d3748' }}>{signup.name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <a
                    href={`mailto:${signup.email}`}
                    style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    {signup.email}
                  </a>
                </td>
                <td style={{ padding: '16px', maxWidth: '400px' }}>
                  <p
                    style={{
                      color: '#4a5568',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {signup.thoughts || '-'}
                  </p>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ color: '#718096', fontSize: '14px' }}>
                    {formatDate(signup.createdAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
