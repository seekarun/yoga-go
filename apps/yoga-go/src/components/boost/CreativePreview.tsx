'use client';

import { useState } from 'react';
import type { BoostCreative, BoostTargeting, Asset } from '@/types';
import ImageUploadCrop from '@/components/ImageUploadCrop';

interface CreativePreviewProps {
  creative: BoostCreative;
  targeting: BoostTargeting;
  reasoning: string;
  expertName: string;
  expertAvatar?: string;
  expertDomain: string; // Custom domain or expertId.myyoga.guru
  expertId: string; // For image upload relatedTo
  onCreativeChange: (creative: BoostCreative) => void;
  onTargetingChange: (targeting: BoostTargeting) => void;
}

export default function CreativePreview({
  creative,
  targeting,
  reasoning,
  expertName,
  expertAvatar,
  expertDomain,
  expertId,
  onCreativeChange,
  onTargetingChange,
}: CreativePreviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleImageUploadComplete = (asset: Asset) => {
    onCreativeChange({ ...creative, imageUrl: asset.croppedUrl || asset.originalUrl });
    setShowImageUpload(false);
  };

  const handleCreativeFieldChange = (field: keyof BoostCreative, value: string) => {
    onCreativeChange({ ...creative, [field]: value });
  };

  const handleTargetingChange = (field: keyof BoostTargeting, value: unknown) => {
    onTargetingChange({ ...targeting, [field]: value });
  };

  const handleAddInterest = (interest: string) => {
    if (interest.trim() && !targeting.interests?.includes(interest.trim())) {
      handleTargetingChange('interests', [...(targeting.interests || []), interest.trim()]);
    }
  };

  const handleRemoveInterest = (interest: string) => {
    handleTargetingChange(
      'interests',
      (targeting.interests || []).filter(i => i !== interest)
    );
  };

  const handleAddLocation = (location: string) => {
    if (location.trim() && !targeting.locations?.includes(location.trim())) {
      handleTargetingChange('locations', [...(targeting.locations || []), location.trim()]);
    }
  };

  const handleRemoveLocation = (location: string) => {
    handleTargetingChange(
      'locations',
      (targeting.locations || []).filter(l => l !== location)
    );
  };

  const ctaOptions = ['Learn More', 'Sign Up', 'Book Now', 'Get Offer'];

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

      {/* Ad Preview (Facebook-style) - Editable */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Ad Creative</h4>
          <span className="text-xs text-gray-500">Click any field to edit</span>
        </div>

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

          {/* Ad Content - Editable Primary Text */}
          <div className="p-4">
            {editingField === 'primaryText' ? (
              <textarea
                value={creative.primaryText}
                onChange={e => handleCreativeFieldChange('primaryText', e.target.value)}
                onBlur={() => setEditingField(null)}
                autoFocus
                maxLength={125}
                className="w-full text-sm text-gray-900 mb-3 p-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                rows={3}
              />
            ) : (
              <p
                onClick={() => setEditingField('primaryText')}
                className="text-sm text-gray-900 mb-3 cursor-pointer hover:bg-indigo-50 p-2 -m-2 rounded-lg transition-colors"
                title="Click to edit"
              >
                {creative.primaryText}
              </p>
            )}

            {/* Ad Image - Clickable to upload */}
            <div
              onClick={() => setShowImageUpload(true)}
              className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mb-3 cursor-pointer hover:from-indigo-200 hover:to-purple-200 transition-colors overflow-hidden"
              title="Click to upload image"
            >
              {creative.imageUrl ? (
                <img
                  src={creative.imageUrl}
                  alt="Ad creative"
                  className="w-full h-full object-cover"
                />
              ) : (
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
                  <p className="text-xs text-indigo-400">Click to upload ad image</p>
                </div>
              )}
            </div>

            {/* Headline & Description - Editable */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">{expertDomain}</p>

              {editingField === 'headline' ? (
                <input
                  type="text"
                  value={creative.headline}
                  onChange={e => handleCreativeFieldChange('headline', e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  maxLength={40}
                  className="w-full font-semibold text-gray-900 p-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p
                  onClick={() => setEditingField('headline')}
                  className="font-semibold text-gray-900 cursor-pointer hover:bg-indigo-100 p-1 -m-1 rounded transition-colors"
                  title="Click to edit"
                >
                  {creative.headline}
                </p>
              )}

              {editingField === 'description' ? (
                <input
                  type="text"
                  value={creative.description}
                  onChange={e => handleCreativeFieldChange('description', e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  maxLength={30}
                  className="w-full text-sm text-gray-600 mt-1 p-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p
                  onClick={() => setEditingField('description')}
                  className="text-sm text-gray-600 mt-1 cursor-pointer hover:bg-indigo-100 p-1 -m-1 rounded transition-colors"
                  title="Click to edit"
                >
                  {creative.description}
                </p>
              )}
            </div>
          </div>

          {/* CTA Button - Editable */}
          <div className="p-3 border-t border-gray-200">
            {editingField === 'callToAction' ? (
              <select
                value={creative.callToAction}
                onChange={e => {
                  handleCreativeFieldChange('callToAction', e.target.value);
                  setEditingField(null);
                }}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="w-full py-2 px-3 bg-indigo-600 text-white rounded-lg font-medium text-sm cursor-pointer"
              >
                {ctaOptions.map(cta => (
                  <option key={cta} value={cta}>
                    {cta}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => setEditingField('callToAction')}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
                title="Click to change"
              >
                {creative.callToAction}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Targeting - Editable */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Target Audience</h4>
          <span className="text-xs text-gray-500">Adjust targeting parameters</span>
        </div>

        <div className="space-y-4">
          {/* Age Range */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-500 w-20">Age:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={targeting.ageMin || 18}
                onChange={e =>
                  handleTargetingChange(
                    'ageMin',
                    Math.max(18, Math.min(65, parseInt(e.target.value) || 18))
                  )
                }
                min={18}
                max={65}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={targeting.ageMax || 65}
                onChange={e =>
                  handleTargetingChange(
                    'ageMax',
                    Math.max(18, Math.min(65, parseInt(e.target.value) || 65))
                  )
                }
                min={18}
                max={65}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-500 w-20">Gender:</label>
            <div className="flex gap-2">
              {['all', 'male', 'female'].map(gender => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => handleTargetingChange('genders', [gender])}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    (targeting.genders || ['all'])[0] === gender
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <div className="flex items-center gap-4 mb-2">
              <label className="text-sm text-gray-500 w-20">Locations:</label>
              <input
                type="text"
                placeholder="Add location (e.g., US, UK, India)"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleAddLocation((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 ml-24">
              {(targeting.locations || []).map(location => (
                <span
                  key={location}
                  className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {location}
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(location)}
                    className="ml-1 text-blue-500 hover:text-blue-800"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {(targeting.locations || []).length === 0 && (
                <span className="text-xs text-gray-400">Global (no specific locations)</span>
              )}
            </div>
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-center gap-4 mb-2">
              <label className="text-sm text-gray-500 w-20">Interests:</label>
              <input
                type="text"
                placeholder="Add interest (e.g., Yoga, Meditation)"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleAddInterest((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 ml-24">
              {(targeting.interests || []).map(interest => (
                <span
                  key={interest}
                  className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="ml-1 text-indigo-500 hover:text-indigo-800"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Ad Image</h3>
              <button
                type="button"
                onClick={() => setShowImageUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload an image for your ad. Recommended size: 1200x628px (1.91:1 aspect ratio for
              Facebook/Instagram feed ads).
            </p>
            <ImageUploadCrop
              width={1200}
              height={628}
              category="other"
              label="Select Ad Image"
              currentImageUrl={creative.imageUrl}
              relatedTo={{ type: 'expert', id: expertId }}
              onUploadComplete={handleImageUploadComplete}
              onError={error => console.error('[DBG][CreativePreview] Image upload error:', error)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
