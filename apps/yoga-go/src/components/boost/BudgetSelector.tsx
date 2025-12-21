'use client';

import { useState, useEffect } from 'react';

interface BudgetOption {
  amount: number; // in cents
  label: string;
  description: string;
}

const getBudgetOptions = (currency: string): BudgetOption[] => {
  if (currency === 'INR') {
    return [
      { amount: 50000, label: '₹500', description: 'Starter' },
      { amount: 100000, label: '₹1,000', description: 'Recommended' },
      { amount: 250000, label: '₹2,500', description: 'Growth' },
      { amount: 500000, label: '₹5,000', description: 'Professional' },
    ];
  }
  return [
    { amount: 2500, label: '$25', description: 'Starter' },
    { amount: 5000, label: '$50', description: 'Recommended' },
    { amount: 10000, label: '$100', description: 'Growth' },
    { amount: 25000, label: '$250', description: 'Professional' },
  ];
};

interface BudgetSelectorProps {
  value: number;
  onChange: (amount: number) => void;
  currency: string;
  maxBudget: number; // Wallet balance in cents
}

export default function BudgetSelector({
  value,
  onChange,
  currency,
  maxBudget,
}: BudgetSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const budgetOptions = getBudgetOptions(currency);
  const minBudget = 1000; // $10 or Rs.10 minimum

  // Check if current value matches a preset
  useEffect(() => {
    const isPreset = budgetOptions.some(opt => opt.amount === value);
    if (!isPreset && value > 0) {
      setIsCustom(true);
      setCustomValue((value / 100).toString());
    }
  }, [value, budgetOptions]);

  const handlePresetClick = (amount: number) => {
    setIsCustom(false);
    setCustomValue('');
    onChange(Math.min(amount, maxBudget));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value.replace(/[^0-9.]/g, '');
    setCustomValue(inputVal);

    const numValue = parseFloat(inputVal);
    if (!isNaN(numValue) && numValue > 0) {
      const cents = Math.round(numValue * 100);
      onChange(Math.min(cents, maxBudget));
    } else {
      onChange(0);
    }
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
  };

  const formatBalance = (amount: number) => {
    const val = amount / 100;
    if (currency === 'INR') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return `$${val.toLocaleString('en-US')}`;
  };

  const isOptionDisabled = (amount: number) => amount > maxBudget;

  return (
    <div className="space-y-4">
      {/* Preset Options */}
      <div className="grid grid-cols-2 gap-3">
        {budgetOptions.map(option => {
          const disabled = isOptionDisabled(option.amount);
          const selected = value === option.amount && !isCustom;

          return (
            <button
              key={option.amount}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetClick(option.amount)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                selected
                  ? 'border-indigo-500 bg-indigo-50'
                  : disabled
                    ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`text-xl font-bold ${selected ? 'text-indigo-600' : 'text-gray-900'}`}
              >
                {option.label}
              </div>
              <div className="text-sm text-gray-500">{option.description}</div>
            </button>
          );
        })}
      </div>

      {/* Custom Amount */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or enter custom amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {currency === 'INR' ? '₹' : '$'}
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder={currency === 'INR' ? '1,000' : '100'}
            value={customValue}
            onChange={handleCustomChange}
            onFocus={handleCustomFocus}
            className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-0 ${
              isCustom && value > 0
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 focus:border-indigo-500'
            }`}
          />
        </div>
      </div>

      {/* Balance Info */}
      <div className="flex items-center justify-between text-sm pt-2">
        <span className="text-gray-500">
          Available balance:{' '}
          <span className="font-medium text-gray-900">{formatBalance(maxBudget)}</span>
        </span>
        {value < minBudget && value > 0 && (
          <span className="text-red-500">Minimum: {formatBalance(minBudget)}</span>
        )}
        {value > maxBudget && <span className="text-red-500">Exceeds balance</span>}
      </div>

      {/* Selected Amount Display */}
      {value >= minBudget && value <= maxBudget && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-green-700 font-medium">
            Campaign budget: {formatBalance(value)}
          </span>
        </div>
      )}
    </div>
  );
}
