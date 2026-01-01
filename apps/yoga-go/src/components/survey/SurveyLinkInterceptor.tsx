'use client';

import { useEffect } from 'react';
import { useSurveyModal } from '@/contexts/SurveyModalContext';
import { useExpert } from '@/contexts/ExpertContext';

/**
 * Component that intercepts clicks on survey links and opens the survey modal
 * instead of navigating to a new page.
 *
 * This allows surveys to be shown in a modal overlay, keeping users on the
 * landing page and creating a smoother experience.
 */
export default function SurveyLinkInterceptor() {
  const { parseSurveyUrl, openSurvey, isOpen } = useSurveyModal();
  const { expertId: contextExpertId } = useExpert();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Don't intercept if modal is already open
      if (isOpen) return;

      // Find the closest anchor element
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Check if this is a survey link
      const surveyInfo = parseSurveyUrl(href);
      if (!surveyInfo) return;

      // Prevent default navigation
      event.preventDefault();
      event.stopPropagation();

      console.log('[DBG][SurveyLinkInterceptor] Intercepted survey link:', href);

      // Use expertId from URL if available, otherwise from context
      const expertId = surveyInfo.expertId || contextExpertId;

      if (expertId && surveyInfo.surveyId) {
        openSurvey(expertId, surveyInfo.surveyId);
      } else {
        console.error('[DBG][SurveyLinkInterceptor] Missing expertId or surveyId');
      }
    };

    // Add click listener to document
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [parseSurveyUrl, openSurvey, contextExpertId, isOpen]);

  // This component doesn't render anything
  return null;
}
