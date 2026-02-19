"use client";

import { useState } from "react";
import type { EmailLabel } from "@/types";

interface AdvancedSearchFields {
  from: string;
  to: string;
  hasAttachment: boolean;
  after: string;
  before: string;
  labelName: string;
}

interface AdvancedSearchPanelProps {
  from: string;
  to: string;
  hasAttachment: boolean;
  after: string;
  before: string;
  labelName: string;
  labels: EmailLabel[];
  onApply: (fields: AdvancedSearchFields) => void;
  onClose: () => void;
}

export default function AdvancedSearchPanel({
  from: initFrom,
  to: initTo,
  hasAttachment: initHasAttachment,
  after: initAfter,
  before: initBefore,
  labelName: initLabel,
  labels,
  onApply,
  onClose,
}: AdvancedSearchPanelProps) {
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [hasAttachment, setHasAttachment] = useState(initHasAttachment);
  const [after, setAfter] = useState(initAfter);
  const [before, setBefore] = useState(initBefore);
  const [labelName, setLabelName] = useState(initLabel);

  const handleApply = () => {
    onApply({ from, to, hasAttachment, after, before, labelName });
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
    setHasAttachment(false);
    setAfter("");
    setBefore("");
    setLabelName("");
    onApply({
      from: "",
      to: "",
      hasAttachment: false,
      after: "",
      before: "",
      labelName: "",
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mt-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">Advanced Search</p>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* From */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Sender name or email"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
          />
        </div>

        {/* To */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Recipient name or email"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
          />
        </div>

        {/* After */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">After</label>
          <input
            type="date"
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
          />
        </div>

        {/* Before */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Before</label>
          <input
            type="date"
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
          />
        </div>

        {/* Label */}
        {labels.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label</label>
            <select
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none bg-white"
            >
              <option value="">Any label</option>
              {labels.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Has Attachment */}
        <div className="flex items-end">
          <label className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAttachment}
              onChange={(e) => setHasAttachment(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-sm text-gray-700">Has attachment</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:opacity-90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
