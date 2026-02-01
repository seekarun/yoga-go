'use client';

import Link from 'next/link';
import type { Survey } from '@/types';
import SurveyStatusBadge from './SurveyStatusBadge';

interface SurveyCardProps {
  survey: Survey;
  expertId: string;
  onPublish?: (surveyId: string) => void;
  onClose?: (surveyId: string) => void;
  onReopen?: (surveyId: string) => void;
  onDelete?: (surveyId: string) => void;
  isLoading?: boolean;
}

export default function SurveyCard({
  survey,
  expertId,
  onPublish,
  onClose,
  onReopen,
  onDelete,
  isLoading,
}: SurveyCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
            <SurveyStatusBadge status={survey.status} />
          </div>
          {survey.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{survey.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span>{survey.questions?.length || 0} questions</span>
            <span>{survey.responseCount || 0} responses</span>
            {survey.createdAt && <span>Created {formatDate(survey.createdAt)}</span>}
            {survey.closedAt && <span>Closed {formatDate(survey.closedAt)}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
        {/* Edit - available for draft and active */}
        {(survey.status === 'draft' || survey.status === 'active') && (
          <Link
            href={`/srv/${expertId}/survey/${survey.id}/edit`}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Edit
          </Link>
        )}

        {/* Publish - only for draft */}
        {survey.status === 'draft' && onPublish && (
          <button
            onClick={() => onPublish(survey.id)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            Publish
          </button>
        )}

        {/* View Responses - for active and closed */}
        {(survey.status === 'active' || survey.status === 'closed') && (
          <Link
            href={`/srv/${expertId}/survey/${survey.id}/responses`}
            className="px-3 py-1.5 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            Responses ({survey.responseCount || 0})
          </Link>
        )}

        {/* Close - only for active */}
        {survey.status === 'active' && onClose && (
          <button
            onClick={() => onClose(survey.id)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-amber-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Close
          </button>
        )}

        {/* Reopen - only for closed */}
        {survey.status === 'closed' && onReopen && (
          <button
            onClick={() => onReopen(survey.id)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            Reopen
          </button>
        )}

        {/* Preview - for active surveys */}
        {survey.status === 'active' && (
          <Link
            href={`/experts/${expertId}/survey/${survey.id}`}
            target="_blank"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Preview
          </Link>
        )}

        {/* Delete - available for all statuses */}
        {onDelete && (
          <button
            onClick={() => onDelete(survey.id)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors ml-auto"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
