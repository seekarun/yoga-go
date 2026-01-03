'use client';

import Link from 'next/link';
import type { ForumContextType } from '@/types';

interface ForumContextBadgeProps {
  contextType: ForumContextType;
  sourceTitle?: string;
  sourceUrl?: string;
}

const contextLabels: Record<ForumContextType, string> = {
  blog: 'Blog Post',
  course: 'Course',
  webinar: 'Webinar',
  community: 'Community',
};

const contextColors: Record<ForumContextType, { bg: string; text: string }> = {
  blog: { bg: '#e3f2fd', text: '#1976d2' },
  course: { bg: '#e8f5e9', text: '#388e3c' },
  webinar: { bg: '#fff3e0', text: '#f57c00' },
  community: { bg: '#f3e5f5', text: '#7b1fa2' },
};

export default function ForumContextBadge({
  contextType,
  sourceTitle,
  sourceUrl,
}: ForumContextBadgeProps) {
  const label = contextLabels[contextType];
  const colors = contextColors[contextType];

  const badge = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: colors.bg,
        color: colors.text,
        fontSize: '12px',
        fontWeight: '500',
        borderRadius: '4px',
      }}
    >
      <span>{label}</span>
      {sourceTitle && (
        <>
          <span style={{ opacity: 0.5 }}>|</span>
          <span
            style={{
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sourceTitle}
          </span>
        </>
      )}
    </span>
  );

  if (sourceUrl) {
    return (
      <Link href={sourceUrl} style={{ textDecoration: 'none' }}>
        {badge}
      </Link>
    );
  }

  return badge;
}
