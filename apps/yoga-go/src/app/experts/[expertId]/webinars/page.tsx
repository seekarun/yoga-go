'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useExpert } from '@/contexts/ExpertContext';
import { useAuth } from '@/contexts/AuthContext';
import { WebinarListPage as ModernWebinarListPage } from '@/templates/modern/pages';
import { WebinarListPage as ClassicWebinarListPage } from '@/templates/classic/pages';
import type { Webinar } from '@/types';

export default function ExpertWebinarsPage() {
  const { expert, expertId, template, loading: expertLoading, error: expertError } = useExpert();
  const { isAuthenticated } = useAuth();

  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [registeredWebinarIds, setRegisteredWebinarIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');
  const [loading, setLoading] = useState(true);

  const fetchWebinars = useCallback(async () => {
    if (!expertId) return;

    try {
      console.log('[DBG][webinars-page] Fetching webinars for expert:', expertId);
      const res = await fetch(`/data/webinars?expertId=${expertId}`);
      const data = await res.json();

      if (data.success) {
        let webinarList = data.data || [];

        // Filter by upcoming if needed
        if (filter === 'upcoming') {
          const now = new Date();
          webinarList = webinarList.filter((w: Webinar) => {
            // Check if webinar has any sessions starting in the future
            if (!w.sessions || w.sessions.length === 0) return false;
            const earliestSession = w.sessions.reduce((earliest, session) =>
              new Date(session.startTime) < new Date(earliest.startTime) ? session : earliest
            );
            return new Date(earliestSession.startTime) > now;
          });
        }

        setWebinars(webinarList);
        console.log('[DBG][webinars-page] Webinars loaded:', webinarList.length);
      }
    } catch (error) {
      console.error('[DBG][webinars-page] Error fetching webinars:', error);
    } finally {
      setLoading(false);
    }
  }, [expertId, filter]);

  const fetchRegisteredWebinars = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      console.log('[DBG][webinars-page] Fetching registered webinars');
      const res = await fetch('/data/app/webinars');
      const data = await res.json();

      if (data.success && data.data) {
        const registeredIds = data.data.map((w: Webinar) => w.id);
        setRegisteredWebinarIds(registeredIds);
        console.log('[DBG][webinars-page] Registered webinars:', registeredIds.length);
      }
    } catch (error) {
      console.error('[DBG][webinars-page] Error fetching registered webinars:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWebinars();
  }, [fetchWebinars]);

  useEffect(() => {
    fetchRegisteredWebinars();
  }, [fetchRegisteredWebinars]);

  const handleFilterChange = (newFilter: 'upcoming' | 'all') => {
    setFilter(newFilter);
  };

  // Show loading while expert or webinars are loading
  if (expertLoading || loading) {
    return null; // Layout shows loading state
  }

  // Expert not found
  if (expertError || !expert) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Expert not found</h2>
          <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Select the appropriate template component
  const WebinarListPage = template === 'modern' ? ModernWebinarListPage : ClassicWebinarListPage;

  return (
    <WebinarListPage
      webinars={webinars}
      expert={expert}
      registeredWebinarIds={registeredWebinarIds}
      isAuthenticated={isAuthenticated}
      filter={filter}
      onFilterChange={handleFilterChange}
    />
  );
}
