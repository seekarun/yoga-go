'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Survey } from '@/types';

interface SurveyModalContextType {
  isOpen: boolean;
  survey: Survey | null;
  loading: boolean;
  error: string | null;
  openSurvey: (expertId: string, surveyId: string) => Promise<void>;
  closeSurvey: () => void;
  /** Check if a URL is a survey link and extract IDs */
  parseSurveyUrl: (url: string) => { expertId: string; surveyId: string } | null;
}

const SurveyModalContext = createContext<SurveyModalContextType | undefined>(undefined);

export function SurveyModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSurvey = useCallback(async (expertId: string, surveyId: string) => {
    console.log('[DBG][SurveyModalContext] Opening survey:', surveyId, 'for expert:', expertId);
    setLoading(true);
    setError(null);
    setIsOpen(true);

    try {
      const response = await fetch(`/data/experts/${expertId}/survey/${surveyId}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSurvey(result.data);
        console.log('[DBG][SurveyModalContext] Survey loaded:', result.data.title);
      } else {
        setError(result.error || 'Failed to load survey');
        console.error('[DBG][SurveyModalContext] Failed to load survey:', result.error);
      }
    } catch (err) {
      console.error('[DBG][SurveyModalContext] Error fetching survey:', err);
      setError('Failed to load survey');
    } finally {
      setLoading(false);
    }
  }, []);

  const closeSurvey = useCallback(() => {
    console.log('[DBG][SurveyModalContext] Closing survey modal');
    setIsOpen(false);
    setSurvey(null);
    setError(null);
  }, []);

  /**
   * Parse a URL to check if it's a survey link and extract the IDs
   * Supports patterns:
   * - /experts/{expertId}/survey/{surveyId}
   * - /survey/{surveyId} (subdomain pattern, needs expertId from context)
   */
  const parseSurveyUrl = useCallback(
    (url: string): { expertId: string; surveyId: string } | null => {
      if (!url) return null;

      // Match /experts/{expertId}/survey/{surveyId}
      const fullPathMatch = url.match(/\/experts\/([^/]+)\/survey\/([^/?#]+)/);
      if (fullPathMatch) {
        return { expertId: fullPathMatch[1], surveyId: fullPathMatch[2] };
      }

      // Match /survey/{surveyId} (subdomain pattern)
      const subdomainMatch = url.match(/^\/survey\/([^/?#]+)/);
      if (subdomainMatch) {
        // Return null for expertId - caller needs to provide it from context
        return { expertId: '', surveyId: subdomainMatch[1] };
      }

      return null;
    },
    []
  );

  return (
    <SurveyModalContext.Provider
      value={{
        isOpen,
        survey,
        loading,
        error,
        openSurvey,
        closeSurvey,
        parseSurveyUrl,
      }}
    >
      {children}
    </SurveyModalContext.Provider>
  );
}

export function useSurveyModal() {
  const context = useContext(SurveyModalContext);
  if (context === undefined) {
    throw new Error('useSurveyModal must be used within a SurveyModalProvider');
  }
  return context;
}
