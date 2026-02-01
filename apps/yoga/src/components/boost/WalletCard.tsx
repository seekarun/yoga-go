'use client';

import type { ExpertWallet } from '@/types';

interface WalletCardProps {
  wallet: ExpertWallet | null;
  onAddFunds: () => void;
  loading?: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
  // Amount is in cents, convert to dollars/rupees
  return formatter.format(amount / 100);
}

export default function WalletCard({ wallet, onAddFunds, loading = false }: WalletCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? 'USD';
  const totalDeposited = wallet?.totalDeposited ?? 0;
  const totalSpent = wallet?.totalSpent ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 font-medium">Available Balance</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(balance, currency)}
          </p>
        </div>
        <button
          onClick={onAddFunds}
          className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors"
          style={{ backgroundColor: 'var(--color-primary, #6366f1)' }}
        >
          + Add Funds
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Deposited</p>
          <p className="text-lg font-semibold text-green-600 mt-1">
            {formatCurrency(totalDeposited, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            {formatCurrency(totalSpent, currency)}
          </p>
        </div>
      </div>

      {balance < 1000 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Low balance:</span> Add funds to start a boost campaign.
          </p>
        </div>
      )}
    </div>
  );
}
