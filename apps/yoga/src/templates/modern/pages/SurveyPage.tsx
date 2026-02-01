'use client';

import type { SurveyPageProps } from '../../types';
import SurveyResponseWizard from '@/components/survey/SurveyResponseWizard';

export default function SurveyPage({
  survey,
  onSubmit,
  onCancel,
  submitting,
  submitted,
  error,
}: SurveyPageProps) {
  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
      }}
    >
      <SurveyResponseWizard
        survey={survey}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitting={submitting}
        submitted={submitted}
        error={error}
      />
    </div>
  );
}
