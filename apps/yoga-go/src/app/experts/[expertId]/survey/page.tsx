'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useExpert } from '@/contexts/ExpertContext';
import { SurveyListPage as ModernSurveyListPage } from '@/templates/modern/pages';
import { SurveyListPage as ClassicSurveyListPage } from '@/templates/classic/pages';
import type { Survey } from '@/types';

export default function SurveysListPage() {
  const router = useRouter();
  const { expert, expertId, template, loading: expertLoading, error: expertError } = useExpert();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!expertId) return;

      try {
        console.log('[DBG][surveys-list-page] Fetching surveys for expert:', expertId);
        const response = await fetch(`/data/experts/${expertId}/survey`);
        const data = await response.json();

        if (data.success) {
          setSurveys(data.data || []);
          console.log('[DBG][surveys-list-page] Surveys loaded:', data.data?.length || 0);

          // If only one survey, redirect directly to it
          if (data.data?.length === 1) {
            router.replace(`/survey/${data.data[0].id}`);
          }
        }
      } catch (error) {
        console.error('[DBG][surveys-list-page] Error fetching surveys:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [expertId, router]);

  const handleSurveyClick = (surveyId: string) => {
    if (surveyId) {
      router.push(`/survey/${surveyId}`);
    } else {
      router.push('/');
    }
  };

  // Show loading while expert or surveys are loading
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
  const SurveyListPage = template === 'modern' ? ModernSurveyListPage : ClassicSurveyListPage;

  return <SurveyListPage surveys={surveys} expert={expert} onSurveyClick={handleSurveyClick} />;
}
