'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Boost } from '@/types';

interface BoostCardProps {
  boost: Boost;
  expertId: string;
  onDelete?: (boostId: string) => void;
}

const DELETABLE_STATUSES: Boost['status'][] = ['draft', 'pending_payment', 'failed'];

const statusConfig: Record<Boost['status'], { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  pending_payment: {
    label: 'Pending Payment',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' },
  paused: { label: 'Paused', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  completed: { label: 'Completed', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const goalLabels: Record<Boost['goal'], string> = {
  get_students: 'Get Students',
  promote_course: 'Promote Course',
  brand_awareness: 'Brand Awareness',
};

export default function BoostCard({ boost, expertId, onDelete }: BoostCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const status = statusConfig[boost.status];
  const goalLabel = goalLabels[boost.goal];
  const canDelete = DELETABLE_STATUSES.includes(boost.status);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/data/app/expert/me/boosts/${boost.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        onDelete?.(boost.id);
      } else {
        console.error('[DBG][BoostCard] Delete failed:', data.error);
        alert(data.error || 'Failed to delete boost');
      }
    } catch (error) {
      console.error('[DBG][BoostCard] Delete error:', error);
      alert('Failed to delete boost');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const formatCurrency = (amount: number) => {
    const val = amount / 100;
    if (boost.currency === 'INR') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return `$${val.toLocaleString('en-US')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const progressPercent = boost.budget > 0 ? (boost.spentAmount / boost.budget) * 100 : 0;

  return (
    <Link
      href={`/srv/${expertId}/boost/${boost.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">{goalLabel}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Created {formatDate(boost.createdAt || '')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
          >
            {status.label}
          </span>
          {canDelete &&
            (showConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-1.5 text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
                  title="Confirm delete"
                >
                  {deleting ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="p-1.5 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete boost"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            ))}
        </div>
      </div>

      {/* Creative Preview */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <p className="font-medium text-gray-900 text-sm line-clamp-1">{boost.creative.headline}</p>
        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{boost.creative.primaryText}</p>
      </div>

      {/* Budget Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-500">Budget spent</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(boost.spentAmount)} / {formatCurrency(boost.budget)}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              boost.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics (if available) */}
      {boost.metrics && (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {boost.metrics.impressions.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Impressions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {boost.metrics.clicks.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{boost.metrics.conversions}</p>
            <p className="text-xs text-gray-500">Signups</p>
          </div>
        </div>
      )}
    </Link>
  );
}
