'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Expert } from '@/types';
import ExpertCard from '@/components/ExpertCard';

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
                <ExpertCard key={expert.id} expert={expert} variant="full" />
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

      {/* TODO: Uncomment when ready to enable expert applications */}
      {/* CTA Section - Become an Expert */}
      {/* <section
        style={{
          padding: '80px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#fff',
            }}
          >
            Want to Teach With Us?
          </h2>
          <p
            style={{
              fontSize: '18px',
              marginBottom: '32px',
              color: '#fff',
              opacity: 0.95,
              lineHeight: '1.6',
            }}
          >
            Join our community of expert instructors and share your passion for yoga with students
            around the world.
          </p>
          <Link
            href="/teach/apply"
            style={{
              padding: '16px 32px',
              background: '#fff',
              color: '#764ba2',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Apply to Become an Expert
          </Link>
        </div>
      </section> */}
    </div>
  );
}
