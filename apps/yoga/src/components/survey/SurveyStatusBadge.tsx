'use client';

import type { SurveyStatus } from '@/types';

interface SurveyStatusBadgeProps {
  status: SurveyStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<SurveyStatus, { label: string; bgColor: string; textColor: string }> = {
  draft: {
    label: 'Draft',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  active: {
    label: 'Active',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  closed: {
    label: 'Closed',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  archived: {
    label: 'Archived',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
};

export default function SurveyStatusBadge({ status, size = 'md' }: SurveyStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}
