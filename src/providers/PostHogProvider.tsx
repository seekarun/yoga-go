'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useAuth } from '@/contexts/AuthContext';

// Initialize PostHog
if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (posthogKey && posthogKey !== 'phc_placeholder_key') {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      // Capture pageviews and clicks automatically
      capture_pageview: false, // We'll handle this manually for better control
      capture_pageleave: true,
      // Session replay
      session_recording: {
        maskAllInputs: false, // Set to true to mask all inputs (privacy)
        maskInputOptions: {
          password: true, // Always mask password fields
          color: false,
          date: false,
          'datetime-local': false,
          email: false,
          month: false,
          number: false,
          range: false,
          search: false,
          tel: false,
          text: false,
          time: false,
          url: false,
          week: false,
          textarea: false,
          select: false,
        },
      },
      // Autocapture settings
      autocapture: {
        dom_event_allowlist: ['click', 'change', 'submit'], // Only capture these events
        url_allowlist: ['/app/profile', '/app/courses'], // Only on these pages
        element_allowlist: ['button', 'a'], // Only these elements
      },
      // Privacy
      respect_dnt: true, // Respect Do Not Track
      disable_session_recording: false,
      // Performance
      loaded: posthog => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DBG][posthog] PostHog loaded');
        }
      },
    });
  } else if (process.env.NODE_ENV === 'development') {
    console.warn('[DBG][posthog] PostHog key not configured or using placeholder');
  }
}

// Component to track page views
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

// Component to identify users
function UserIdentifier() {
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.id) {
      // Identify the user in PostHog
      posthog.identify(user.id, {
        email: user.profile.email,
        name: user.profile.name,
        membershipType: user.membership.type,
        membershipStatus: user.membership.status,
        billingInterval: user.membership.billingInterval,
        paymentGateway: user.membership.paymentGateway,
      });

      // Set user properties for cohort analysis
      posthog.setPersonProperties({
        email: user.profile.email,
        name: user.profile.name,
        membershipType: user.membership.type,
        membershipStatus: user.membership.status,
        membershipStartDate: user.membership.startDate,
        totalEnrollments: user.enrolledCourses?.length || 0,
        totalAchievements: user.achievements?.length || 0,
      });

      console.log('[DBG][posthog] User identified:', user.id);
    }
  }, [user]);

  return null;
}

// Main PostHog Provider component
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <UserIdentifier />
      {children}
    </PHProvider>
  );
}

// Export posthog instance for use in components
export { posthog };
