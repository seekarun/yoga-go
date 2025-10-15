import Link from 'next/link';
import type { Expert } from '@/types';

interface ExpertCardProps {
  expert: Expert;
  variant?: 'compact' | 'full';
}

export default function ExpertCard({ expert, variant = 'full' }: ExpertCardProps) {
  const isCompact = variant === 'compact';

  if (isCompact) {
    // Compact variant for homepage carousel
    return (
      <Link
        href={`/experts/${expert.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          minWidth: '380px',
          flex: '0 0 380px',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
            height: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
        >
          {/* Expert Image */}
          <div
            style={{
              height: '280px',
              backgroundImage: `url(${expert.avatar})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Info */}
          <div style={{ padding: '24px' }}>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              {expert.name}
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#764ba2',
                marginBottom: '12px',
                fontWeight: '500',
              }}
            >
              {expert.title}
            </p>
            <p
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '20px',
                lineHeight: '1.6',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {expert.bio}
            </p>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ color: '#FFB800' }}>★</span>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{expert.rating}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Rating</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>
                  {expert.totalStudents.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Students</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>
                  {expert.totalCourses}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Courses</div>
              </div>
            </div>

            {/* Specializations */}
            {expert.specializations && expert.specializations.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '16px',
                }}
              >
                {expert.specializations.slice(0, 3).map((spec, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 12px',
                      background: '#f7fafc',
                      borderRadius: '100px',
                      fontSize: '12px',
                      color: '#4a5568',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Full variant for experts page grid
  return (
    <Link href={`/experts/${expert.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
          height: '100%',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }}
      >
        {/* Expert Image */}
        <div
          style={{
            height: '300px',
            backgroundImage: `url(${expert.avatar})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Expert Info */}
        <div style={{ padding: '32px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            {expert.name}
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#764ba2',
              marginBottom: '16px',
              fontWeight: '500',
            }}
          >
            {expert.title}
          </p>
          <p
            style={{
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '24px',
            }}
          >
            {expert.bio}
          </p>

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              paddingBottom: '24px',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#FFB800' }}>★</span>
                <span style={{ fontWeight: '600' }}>{expert.rating}</span>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Rating</div>
            </div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {expert.totalStudents.toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Students</div>
            </div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{expert.totalCourses}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Courses</div>
            </div>
          </div>

          {/* Specializations */}
          {expert.specializations && expert.specializations.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              {expert.specializations.slice(0, 3).map((spec, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '6px 16px',
                    background: '#f7fafc',
                    borderRadius: '100px',
                    fontSize: '14px',
                    color: '#4a5568',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {spec}
                </span>
              ))}
              {expert.specializations.length > 3 && (
                <span
                  style={{
                    padding: '6px 16px',
                    background: '#f7fafc',
                    borderRadius: '100px',
                    fontSize: '14px',
                    color: '#4a5568',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  +{expert.specializations.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
