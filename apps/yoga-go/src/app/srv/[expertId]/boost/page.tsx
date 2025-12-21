'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import WalletCard from '@/components/boost/WalletCard';
import AddFundsModal from '@/components/boost/AddFundsModal';
import TransactionList from '@/components/boost/TransactionList';
import BoostCard from '@/components/boost/BoostCard';
import type { ExpertWallet, WalletTransaction, Boost } from '@/types';

export default function BoostPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [wallet, setWallet] = useState<ExpertWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch wallet, transactions, and boosts in parallel (with cache-busting for fresh data)
      const timestamp = Date.now();
      const [walletRes, txnRes, boostsRes] = await Promise.all([
        fetch(`/data/app/expert/me/wallet?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/data/app/expert/me/wallet/transactions?limit=10&t=${timestamp}`, {
          cache: 'no-store',
        }),
        fetch(`/data/app/expert/me/boosts?limit=20&t=${timestamp}`, { cache: 'no-store' }),
      ]);

      const walletData = await walletRes.json();
      const txnData = await txnRes.json();
      const boostsData = await boostsRes.json();

      if (walletData.success) {
        setWallet(walletData.data);
      }

      if (txnData.success) {
        setTransactions(txnData.data.transactions);
      }

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

  const handleAddFundsSuccess = () => {
    // Refresh data after successful deposit
    fetchData();
    setShowAddFunds(false);
  };

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

      {/* Wallet Section */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <WalletCard wallet={wallet} onAddFunds={() => setShowAddFunds(true)} loading={loading} />

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Ready to boost?</h3>
          <p className="text-indigo-100 text-sm mb-4">
            Create an AI-powered ad campaign in minutes. Set your budget and goal, and we'll handle
            the rest.
          </p>
          {wallet && wallet.balance >= 1000 ? (
            <Link
              href={`/srv/${expertId}/boost/create`}
              className="block w-full py-2.5 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors text-center"
            >
              Create New Boost
            </Link>
          ) : (
            <button
              disabled
              className="w-full py-2.5 bg-white text-indigo-600 rounded-lg font-medium opacity-50 cursor-not-allowed"
            >
              Create New Boost
            </button>
          )}
          {wallet && wallet.balance < 1000 && (
            <p className="text-xs text-indigo-200 mt-2 text-center">
              Minimum {wallet.currency === 'INR' ? 'Rs.10' : '$10'} required to create a boost
            </p>
          )}
        </div>
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
              <BoostCard key={boost.id} boost={boost} expertId={expertId} />
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
              <BoostCard key={boost.id} boost={boost} expertId={expertId} />
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <TransactionList
        transactions={transactions}
        currency={wallet?.currency || 'USD'}
        loading={loading}
      />

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        onSuccess={handleAddFundsSuccess}
        currency={wallet?.currency || 'USD'}
      />
    </div>
  );
}
