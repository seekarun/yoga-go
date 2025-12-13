'use client';

import type { SectionEditorProps } from '../types';

export default function FooterEditor({ data, onChange }: SectionEditorProps) {
  const footer = data.footer || {};

  const handleChange = (field: string, value: string | boolean | Record<string, string>) => {
    onChange({
      footer: {
        ...footer,
        [field]: value,
      },
    });
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    onChange({
      footer: {
        ...footer,
        socialLinks: {
          ...footer.socialLinks,
          [platform]: value,
        },
      },
    });
  };

  const handleLegalLinkChange = (linkType: string, value: string) => {
    onChange({
      footer: {
        ...footer,
        legalLinks: {
          ...footer.legalLinks,
          [linkType]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-blue-800">
              Add a professional footer with your copyright, social links, and legal pages.
            </p>
          </div>
        </div>
      </div>

      {/* Copyright & Tagline */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Branding</h4>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Copyright Text</label>
          <input
            type="text"
            value={footer.copyrightText || ''}
            onChange={e => handleChange('copyrightText', e.target.value)}
            placeholder="2024 Your Name. All rights reserved."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to use default: "[Year] [Your Name]. All rights reserved."
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Tagline</label>
          <input
            type="text"
            value={footer.tagline || ''}
            onChange={e => handleChange('tagline', e.target.value)}
            placeholder="Transform your practice, transform your life."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Social Links</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={footer.showSocialLinks !== false}
              onChange={e => handleChange('showSocialLinks', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show</span>
          </label>
        </div>

        {footer.showSocialLinks !== false && (
          <div className="space-y-3 pl-2 border-l-2 border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Instagram</label>
              <input
                type="url"
                value={footer.socialLinks?.instagram || ''}
                onChange={e => handleSocialLinkChange('instagram', e.target.value)}
                placeholder="https://instagram.com/yourusername"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">YouTube</label>
              <input
                type="url"
                value={footer.socialLinks?.youtube || ''}
                onChange={e => handleSocialLinkChange('youtube', e.target.value)}
                placeholder="https://youtube.com/@yourchannel"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Facebook</label>
              <input
                type="url"
                value={footer.socialLinks?.facebook || ''}
                onChange={e => handleSocialLinkChange('facebook', e.target.value)}
                placeholder="https://facebook.com/yourpage"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">X (Twitter)</label>
              <input
                type="url"
                value={footer.socialLinks?.twitter || ''}
                onChange={e => handleSocialLinkChange('twitter', e.target.value)}
                placeholder="https://x.com/yourusername"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">TikTok</label>
              <input
                type="url"
                value={footer.socialLinks?.tiktok || ''}
                onChange={e => handleSocialLinkChange('tiktok', e.target.value)}
                placeholder="https://tiktok.com/@yourusername"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Legal Links */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Legal Links</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={footer.showLegalLinks !== false}
              onChange={e => handleChange('showLegalLinks', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show</span>
          </label>
        </div>

        {footer.showLegalLinks !== false && (
          <div className="space-y-3 pl-2 border-l-2 border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Privacy Policy URL
              </label>
              <input
                type="url"
                value={footer.legalLinks?.privacyPolicy || ''}
                onChange={e => handleLegalLinkChange('privacyPolicy', e.target.value)}
                placeholder="https://yoursite.com/privacy"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Terms of Service URL
              </label>
              <input
                type="url"
                value={footer.legalLinks?.termsOfService || ''}
                onChange={e => handleLegalLinkChange('termsOfService', e.target.value)}
                placeholder="https://yoursite.com/terms"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Refund Policy URL
              </label>
              <input
                type="url"
                value={footer.legalLinks?.refundPolicy || ''}
                onChange={e => handleLegalLinkChange('refundPolicy', e.target.value)}
                placeholder="https://yoursite.com/refunds"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Contact Info</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={footer.showContactInfo !== false}
              onChange={e => handleChange('showContactInfo', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show</span>
          </label>
        </div>

        {footer.showContactInfo !== false && (
          <div className="pl-2 border-l-2 border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Contact Email</label>
              <input
                type="email"
                value={footer.contactEmail || ''}
                onChange={e => handleChange('contactEmail', e.target.value)}
                placeholder="hello@yoursite.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
