'use client';

import { useState } from 'react';
import type { BoostCreative, BoostTargeting } from '@/types';

interface CreativePreviewProps {
  creative: BoostCreative;
  alternativeCreatives: BoostCreative[];
  targeting: BoostTargeting;
  reasoning: string;
  expertName: string;
  expertAvatar?: string;
  onSelectCreative: (creative: BoostCreative) => void;
}

export default function CreativePreview({
  creative,
  alternativeCreatives,
  targeting,
  reasoning,
  expertName,
  expertAvatar,
  onSelectCreative,
}: CreativePreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const allCreatives = [creative, ...alternativeCreatives];
  const selectedCreative = allCreatives[selectedIndex];

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelectCreative(allCreatives[index]);
  };

  return (
    <div className="space-y-6">
      {/* AI Reasoning */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-purple-900">AI Strategy</h4>
            <p className="text-sm text-purple-700 mt-1">{reasoning}</p>
          </div>
        </div>
      </div>

      {/* Creative Selection */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Select a creative variation</h4>
        <div className="flex gap-2">
          {allCreatives.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedIndex === index
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {index === 0 ? 'Primary' : `Alternative ${index}`}
            </button>
          ))}
        </div>
      </div>

      {/* Ad Preview (Facebook-style) */}
      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm max-w-md mx-auto">
        {/* Ad Header */}
        <div className="flex items-center gap-3 p-3 border-b border-gray-200">
          {expertAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expertAvatar}
              alt={expertName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-lg">{expertName.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-gray-900">{expertName}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>

        {/* Ad Content */}
        <div className="p-4">
          <p className="text-sm text-gray-900 mb-3">{selectedCreative.primaryText}</p>

          {/* Placeholder Image */}
          <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mb-3">
            <div className="text-center p-4">
              <svg
                className="w-12 h-12 text-indigo-300 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-xs text-indigo-400">Your course image will appear here</p>
            </div>
          </div>

          {/* Headline & Description */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">myyoga.guru</p>
            <p className="font-semibold text-gray-900">{selectedCreative.headline}</p>
            <p className="text-sm text-gray-600 mt-1">{selectedCreative.description}</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="p-3 border-t border-gray-200">
          <button
            type="button"
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm"
            disabled
          >
            {selectedCreative.callToAction}
          </button>
        </div>
      </div>

      {/* Targeting Summary */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-3">Target Audience</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Age:</span>
            <span className="ml-2 text-gray-900">
              {targeting.ageMin || 18} - {targeting.ageMax || 65}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Gender:</span>
            <span className="ml-2 text-gray-900 capitalize">
              {(targeting.genders || ['all']).join(', ')}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Locations:</span>
            <span className="ml-2 text-gray-900">
              {(targeting.locations || []).slice(0, 4).join(', ') || 'Global'}
              {(targeting.locations || []).length > 4 &&
                ` +${targeting.locations!.length - 4} more`}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Interests:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(targeting.interests || []).map(interest => (
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
    </div>
  );
}
