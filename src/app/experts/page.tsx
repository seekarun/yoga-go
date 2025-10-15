'use client';

import { useState, useEffect } from 'react';
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
    </div>
  );
}
