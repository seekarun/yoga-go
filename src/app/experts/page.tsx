'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Expert } from '@/types';

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        console.log('[DBG][experts-page] Fetching all experts...');
        const response = await fetch('/data/experts');
        const data = await response.json();

        if (data.success) {
          setExperts(data.data || []);
          console.log('[DBG][experts-page] Experts loaded:', data.data);
        }
      } catch (error) {
        console.error('[DBG][experts-page] Error fetching experts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header Section */}
      <section
        style={{
          padding: '80px 20px',
          background: '#fff',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            fontWeight: '600',
            marginBottom: '16px',
          }}
        >
          Our Expert Instructors
        </h1>
        <p
          style={{
            fontSize: '20px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          Learn from world-class yoga instructors with years of experience and thousands of
          satisfied students.
        </p>
      </section>

      {/* Experts Grid */}
      <section style={{ padding: '80px 20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
              }}
            >
              <div style={{ fontSize: '16px', color: '#666' }}>Loading experts...</div>
            </div>
          ) : experts.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                gap: '32px',
              }}
            >
              {experts.map(expert => (
                <Link
                  key={expert.id}
                  href={`/experts/${expert.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
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
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            {expert.totalCourses}
                          </div>
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
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
                background: '#fff',
                borderRadius: '16px',
              }}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No experts available</h2>
              <p style={{ color: '#666' }}>Please check back later.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
