'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useExpert } from '@/contexts/ExpertContext';
import { SurveyPage as ModernSurveyPage } from '@/templates/modern/pages';
import { SurveyPage as ClassicSurveyPage } from '@/templates/classic/pages';
import type { Survey, SurveyAnswer } from '@/types';

export default function ExpertSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;
  const { expert, expertId, template, loading: expertLoading, error: expertError } = useExpert();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!expertId) return;

      try {
        console.log('[DBG][survey-page] Fetching survey:', surveyId);
        const response = await fetch(`/data/experts/${expertId}/survey/${surveyId}`);
        const data = await response.json();

        if (data.success) {
          setSurvey(data.data);
          console.log('[DBG][survey-page] Survey loaded:', data.data.title);
        }
      } catch (err) {
        console.error('[DBG][survey-page] Error fetching survey:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [expertId, surveyId]);

  const handleSubmit = async (
    contactInfo: Record<string, string>,
    answers: Record<string, string>
  ) => {
    if (!survey || !expertId) return;

    // Validate required contact info
    if (
      survey.contactInfo?.collectName &&
      survey.contactInfo.nameRequired &&
      !contactInfo.name?.trim()
    ) {
      setError('Name is required');
      return;
    }
    if (
      survey.contactInfo?.collectEmail &&
      survey.contactInfo.emailRequired &&
      !contactInfo.email?.trim()
    ) {
      setError('Email is required');
      return;
    }
    if (
      survey.contactInfo?.collectPhone &&
      survey.contactInfo.phoneRequired &&
      !contactInfo.phone?.trim()
    ) {
      setError('Phone is required');
      return;
    }

    // Validate required questions
    const unansweredRequired = survey.questions.filter(q => q.required && !answers[q.id]);
    if (unansweredRequired.length > 0) {
      setError('Please answer all required questions');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const surveyAnswers: SurveyAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      // Prepare contact info to submit
      const contactInfoToSubmit: { name?: string; email?: string; phone?: string } = {};
      if (survey.contactInfo?.collectName && contactInfo.name) {
        contactInfoToSubmit.name = contactInfo.name;
      }
      if (survey.contactInfo?.collectEmail && contactInfo.email) {
        contactInfoToSubmit.email = contactInfo.email;
      }
      if (survey.contactInfo?.collectPhone && contactInfo.phone) {
        contactInfoToSubmit.phone = contactInfo.phone;
      }

      const response = await fetch(`/data/experts/${expertId}/survey/${surveyId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactInfo:
            Object.keys(contactInfoToSubmit).length > 0 ? contactInfoToSubmit : undefined,
          answers: surveyAnswers,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[DBG][survey-page] Survey submitted successfully');
        setSubmitted(true);
        // Redirect to expert page after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit survey');
      }
    } catch (err) {
      console.error('[DBG][survey-page] Error submitting survey:', err);
      setError('Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  // Show loading while expert or survey is loading
  if (expertLoading || loading) {
    return null; // Layout shows loading state
  }

  // Expert or survey not found
  if (expertError || !expert || !survey) {
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
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            {!survey ? 'Survey not found' : 'Expert not found'}
          </h2>
          <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Select the appropriate template component
  const SurveyPageComponent = template === 'modern' ? ModernSurveyPage : ClassicSurveyPage;

  return (
    <SurveyPageComponent
      survey={survey}
      expert={expert}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitting={submitting}
      submitted={submitted}
      error={error}
    />
  );
}
