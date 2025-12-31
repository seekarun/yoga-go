'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Expert, ColorPalette } from '@/types';
import type { TemplateId } from '@/templates/types';

interface ExpertContextType {
  expert: Expert | null;
  expertId: string | null;
  template: TemplateId;
  palette: ColorPalette | undefined;
  fontFamily: string | undefined;
  loading: boolean;
  error: string | null;
}

const ExpertContext = createContext<ExpertContextType>({
  expert: null,
  expertId: null,
  template: 'classic',
  palette: undefined,
  fontFamily: undefined,
  loading: true,
  error: null,
});

interface ExpertProviderProps {
  children: ReactNode;
  expertId: string;
}

export function ExpertProvider({ children, expertId }: ExpertProviderProps) {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        console.log('[DBG][ExpertContext] Fetching expert:', expertId);
        const res = await fetch(`/data/experts/${expertId}`);
        const data = await res.json();

        if (data.success) {
          setExpert(data.data);
          console.log('[DBG][ExpertContext] Expert loaded:', data.data?.name);
        } else {
          setError(data.error || 'Failed to load expert');
          console.error('[DBG][ExpertContext] Failed to load expert:', data.error);
        }
      } catch (err) {
        setError('Failed to load expert');
        console.error('[DBG][ExpertContext] Error fetching expert:', err);
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchExpert();
    }
  }, [expertId]);

  // Extract template, palette, and fontFamily from expert data
  const template: TemplateId = expert?.customLandingPage?.template || 'classic';
  const palette = expert?.customLandingPage?.theme?.palette;
  const fontFamily = expert?.customLandingPage?.theme?.fontFamily;

  return (
    <ExpertContext.Provider
      value={{
        expert,
        expertId,
        template,
        palette,
        fontFamily,
        loading,
        error,
      }}
    >
      {children}
    </ExpertContext.Provider>
  );
}

export function useExpert() {
  const context = useContext(ExpertContext);
  if (context === undefined) {
    throw new Error('useExpert must be used within an ExpertProvider');
  }
  return context;
}

export default ExpertContext;
