'use client';

import { useState, useEffect } from 'react';
import type { Survey, Course } from '@/types';

export interface CTAConfig {
  ctaText: string;
  ctaLink: string;
}

interface CTALinkOption {
  value: string;
  label: string;
}

interface CTAButtonConfigProps {
  ctaText: string;
  ctaLink: string;
  onChange: (config: CTAConfig) => void;
  expertId: string;
  /** Show hint about fallback behavior (used in Act section) */
  showFallbackHint?: boolean;
  /** Fallback values to show in placeholder (from Hero section) */
  fallbackText?: string;
  fallbackLink?: string;
}

// Predefined section link options
const SECTION_OPTIONS: CTALinkOption[] = [
  { value: '#about', label: 'section: About' },
  { value: '#courses', label: 'section: Courses' },
  { value: '#webinars', label: 'section: Live Sessions' },
  { value: '#photoGallery', label: 'section: Photo Gallery' },
];

export default function CTAButtonConfig({
  ctaText,
  ctaLink,
  onChange,
  expertId,
  showFallbackHint = false,
  fallbackText,
  fallbackLink,
}: CTAButtonConfigProps) {
  const [courseOptions, setCourseOptions] = useState<CTALinkOption[]>([]);
  const [surveyOptions, setSurveyOptions] = useState<CTALinkOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch courses and surveys for CTA dropdown
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DBG][CTAButtonConfig] Fetching data for expert:', expertId);

        // Fetch courses and surveys in parallel
        const [coursesRes, surveysRes] = await Promise.all([
          fetch(`/data/experts/${expertId}`),
          fetch(`/api/srv/experts/${expertId}/survey`),
        ]);

        // Process courses
        const coursesResult = await coursesRes.json();
        if (coursesResult.success && coursesResult.data?.courses) {
          const courses: Course[] = coursesResult.data.courses;
          const courseOpts: CTALinkOption[] = courses.map(course => ({
            value: `/courses/${course.id}`,
            label: `course: ${course.title}`,
          }));
          setCourseOptions(courseOpts);
          console.log('[DBG][CTAButtonConfig] Loaded', courses.length, 'courses');
        }

        // Process surveys
        const surveysResult = await surveysRes.json();
        if (surveysResult.success && surveysResult.data) {
          const surveys: Survey[] = surveysResult.data;
          const activeSurveys = surveys.filter(s => s.status === 'active');
          const surveyOpts: CTALinkOption[] = activeSurveys.map(survey => ({
            value: `/survey/${survey.id}`,
            label: `survey: ${survey.title}`,
          }));
          setSurveyOptions(surveyOpts);
          console.log('[DBG][CTAButtonConfig] Loaded', activeSurveys.length, 'active surveys');
        }
      } catch (err) {
        console.error('[DBG][CTAButtonConfig] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchData();
    }
  }, [expertId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ctaText: e.target.value, ctaLink });
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ctaText, ctaLink: e.target.value });
  };

  // Get label for current link value (for display in fallback hint)
  const getLinkLabel = (value: string) => {
    const allOptions = [...courseOptions, ...surveyOptions, ...SECTION_OPTIONS];
    const option = allOptions.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Combine all options in order: courses, surveys, sections
  const allOptions = [...courseOptions, ...surveyOptions, ...SECTION_OPTIONS];

  return (
    <div className="space-y-4">
      {/* CTA Button Text */}
      <div>
        <label htmlFor="ctaText" className="block text-sm font-medium text-gray-700 mb-2">
          Button Text
        </label>
        <input
          type="text"
          id="ctaText"
          value={ctaText}
          onChange={handleTextChange}
          placeholder={showFallbackHint && fallbackText ? fallbackText : 'e.g., Start Your Journey'}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {showFallbackHint && fallbackText && !ctaText && (
          <p className="mt-1 text-xs text-gray-500">
            Using Hero section text: &quot;{fallbackText}&quot;
          </p>
        )}
      </div>

      {/* CTA Button Link */}
      <div>
        <label htmlFor="ctaLink" className="block text-sm font-medium text-gray-700 mb-2">
          Button Links To
        </label>
        <select
          id="ctaLink"
          value={ctaLink}
          onChange={handleLinkChange}
          disabled={loading}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        >
          {showFallbackHint && <option value="">Use Hero section link</option>}

          {allOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {showFallbackHint && fallbackLink && !ctaLink && (
          <p className="mt-1 text-xs text-gray-500">
            Using Hero section link: {getLinkLabel(fallbackLink)}
          </p>
        )}

        {loading && <p className="mt-1 text-xs text-gray-400">Loading options...</p>}
      </div>
    </div>
  );
}
