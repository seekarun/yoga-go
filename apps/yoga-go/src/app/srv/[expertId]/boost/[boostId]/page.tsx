'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Boost } from '@/types';

const statusConfig: Record<Boost['status'], { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
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
  get_students: 'Get More Students',
  promote_course: 'Promote a Course',
  brand_awareness: 'Brand Awareness',
};

export default function BoostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const boostId = params.boostId as string;

  const [boost, setBoost] = useState<Boost | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoost = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/data/app/expert/me/boosts/${boostId}`);
      const data = await response.json();

      if (data.success) {
        setBoost(data.data);
      } else {
        setError(data.error || 'Failed to load boost');
      }
    } catch (err) {
      console.error('[DBG][BoostDetailPage] Error:', err);
      setError('Failed to load boost');
    } finally {
      setLoading(false);
    }
  }, [boostId]);

  useEffect(() => {
    fetchBoost();
  }, [fetchBoost]);

  const handleSubmit = async () => {
    if (!boost) return;
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/data/app/expert/me/boosts/${boostId}/submit`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setBoost(data.data);
      } else {
        setError(data.error || 'Failed to submit boost');
      }
    } catch (err) {
      console.error('[DBG][BoostDetailPage] Submit error:', err);
      setError('Failed to submit boost');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!boost) return;
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/data/app/expert/me/boosts/${boostId}/pause`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setBoost(data.data);
      } else {
        setError(data.error || 'Failed to pause boost');
      }
    } catch (err) {
      console.error('[DBG][BoostDetailPage] Pause error:', err);
      setError('Failed to pause boost');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!boost) return;
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/data/app/expert/me/boosts/${boostId}/resume`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setBoost(data.data);
      } else {
        setError(data.error || 'Failed to resume boost');
      }
    } catch (err) {
      console.error('[DBG][BoostDetailPage] Resume error:', err);
      setError('Failed to resume boost');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const val = amount / 100;
    if (currency === 'INR') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return `$${val.toLocaleString('en-US')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!boost) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Boost Not Found</h2>
          <p className="text-red-600 mb-6">{error || 'The boost campaign could not be found.'}</p>
          <Link
            href={`/srv/${expertId}/boost`}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
          >
            Back to Boost Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[boost.status];
  const progressPercent = boost.budget > 0 ? (boost.spentAmount / boost.budget) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/srv/${expertId}/boost`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Boost Dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{goalLabels[boost.goal]}</h1>
            <p className="text-gray-500 mt-1">Created {formatDate(boost.createdAt || '')}</p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Status Message */}
      {boost.statusMessage && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-700">{boost.statusMessage}</p>
        </div>
      )}

      {/* Budget Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget</h2>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Spent</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(boost.spentAmount, boost.currency)} /{' '}
              {formatCurrency(boost.budget, boost.currency)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                boost.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Remaining:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatCurrency(boost.budget - boost.spentAmount, boost.currency)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Progress:</span>
            <span className="ml-2 font-medium text-gray-900">{progressPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {boost.metrics && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {boost.metrics.impressions.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Impressions</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {boost.metrics.clicks.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Clicks</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{boost.metrics.ctr.toFixed(2)}%</p>
              <p className="text-sm text-gray-500">CTR</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{boost.metrics.conversions}</p>
              <p className="text-sm text-gray-500">Conversions</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Last updated: {formatDate(boost.metrics.lastSyncedAt)}
          </p>
        </div>
      )}

      {/* Creative Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ad Creative</h2>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{boost.creative.headline}</p>
          <p className="text-gray-700 mb-2">{boost.creative.primaryText}</p>
          {boost.creative.description && (
            <p className="text-sm text-gray-500 mb-3">{boost.creative.description}</p>
          )}
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium">
            {boost.creative.callToAction}
          </span>
        </div>
      </div>

      {/* Targeting */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Targeting</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Age Range:</span>
            <span className="ml-2 text-gray-900">
              {boost.targeting.ageMin || 18} - {boost.targeting.ageMax || 65}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Gender:</span>
            <span className="ml-2 text-gray-900 capitalize">
              {(boost.targeting.genders || ['all']).join(', ')}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Locations:</span>
            <span className="ml-2 text-gray-900">
              {(boost.targeting.locations || []).join(', ') || 'Global'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Interests:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(boost.targeting.interests || []).map(interest => (
                <span
                  key={interest}
                  className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        {boost.status === 'draft' && (
          <button
            onClick={handleSubmit}
            disabled={actionLoading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {actionLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Submit for Review
              </>
            )}
          </button>
        )}

        {boost.status === 'active' && (
          <button
            onClick={handlePause}
            disabled={actionLoading}
            className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {actionLoading ? (
              'Pausing...'
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pause Campaign
              </>
            )}
          </button>
        )}

        {boost.status === 'paused' && (
          <button
            onClick={handleResume}
            disabled={actionLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {actionLoading ? (
              'Resuming...'
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Resume Campaign
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
