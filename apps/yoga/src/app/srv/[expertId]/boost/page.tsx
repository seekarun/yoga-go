'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BoostCard from '@/components/boost/BoostCard';
import type { Boost } from '@/types';

export default function BoostPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const boostsRes = await fetch(`/data/app/expert/me/boosts?limit=20&t=${timestamp}`, {
        cache: 'no-store',
      });
      const boostsData = await boostsRes.json();

      if (boostsData.success) {
        setBoosts(boostsData.data.boosts || []);
      }
    } catch (error) {
      console.error('[DBG][BoostPage] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBoostDeleted = useCallback((boostId: string) => {
    setBoosts(prev => prev.filter(b => b.id !== boostId));
  }, []);

  const activeBoosts = boosts.filter(b => b.status === 'active');
  const otherBoosts = boosts.filter(b => b.status !== 'active');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Boost Your Reach</h1>
        <p className="text-gray-600 mt-1">
          Promote your courses and reach more students with automated ad campaigns.
        </p>
      </div>

      {/* Create Boost CTA */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
        <h3 className="text-lg font-semibold mb-2">Ready to boost?</h3>
        <p className="text-indigo-100 text-sm mb-4">
          Create an AI-powered ad campaign in minutes. Set your goal and budget, and we&apos;ll
          handle the rest.
        </p>
        <Link
          href={`/srv/${expertId}/boost/create`}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Boost
        </Link>
      </div>

      {/* Active Campaigns Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns</h2>
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-100 rounded-xl" />
          </div>
        ) : activeBoosts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeBoosts.map(boost => (
              <BoostCard
                key={boost.id}
                boost={boost}
                expertId={expertId}
                onDelete={handleBoostDeleted}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">No active campaigns</p>
            <p className="text-sm text-gray-400">
              Create your first boost to start promoting your courses
            </p>
          </div>
        )}
      </div>

      {/* Past Campaigns Section */}
      {otherBoosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Campaigns</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {otherBoosts.map(boost => (
              <BoostCard
                key={boost.id}
                boost={boost}
                expertId={expertId}
                onDelete={handleBoostDeleted}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
