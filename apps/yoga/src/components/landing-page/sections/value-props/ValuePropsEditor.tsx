'use client';

import { useState, useEffect } from 'react';
import type { SectionEditorProps, ValuePropsFormData, ValuePropItemFormData } from '../types';
import PexelsImagePicker from '@/components/PexelsImagePicker';

const emptyItem: ValuePropItemFormData = { title: '', description: '', image: '' };

// Helper to normalize item data ensuring image is always a string
const normalizeItem = (item?: {
  title: string;
  description: string;
  image?: string;
}): ValuePropItemFormData => {
  if (!item) return { ...emptyItem };
  return {
    title: item.title || '',
    description: item.description || '',
    image: item.image || '',
  };
};

export default function ValuePropsEditor({ data, onChange, expertId }: SectionEditorProps) {
  const [formData, setFormData] = useState<ValuePropsFormData>({
    type: data.valuePropositions?.type || 'cards',
    content: data.valuePropositions?.content || '',
    items: [
      normalizeItem(data.valuePropositions?.items?.[0]),
      normalizeItem(data.valuePropositions?.items?.[1]),
      normalizeItem(data.valuePropositions?.items?.[2]),
    ],
  });
  const [activeImagePicker, setActiveImagePicker] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0])); // First item expanded by default

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Sync with parent data when it changes externally
  useEffect(() => {
    setFormData({
      type: data.valuePropositions?.type || 'cards',
      content: data.valuePropositions?.content || '',
      items: [
        normalizeItem(data.valuePropositions?.items?.[0]),
        normalizeItem(data.valuePropositions?.items?.[1]),
        normalizeItem(data.valuePropositions?.items?.[2]),
      ],
    });
  }, [data.valuePropositions]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'paragraph' | 'cards';
    const updated = { ...formData, type: newType };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = { ...formData, content: e.target.value };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleItemChange = (index: number, field: keyof ValuePropItemFormData, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    const updated = { ...formData, items: newItems };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleImageSelect = (index: number, imageUrl: string) => {
    handleItemChange(index, 'image', imageUrl);
    setActiveImagePicker(null);
  };

  const propagateChanges = (updated: ValuePropsFormData) => {
    // Filter out items that have no content
    const filteredItems = updated.items.filter(
      item => item.title.trim() !== '' || item.description.trim() !== ''
    );

    const valuePropositions =
      updated.type === 'paragraph'
        ? {
            type: 'paragraph' as const,
            content: updated.content || undefined,
          }
        : {
            type: 'cards' as const,
            items: filteredItems.length > 0 ? filteredItems : undefined,
          };

    onChange({
      valuePropositions:
        valuePropositions.content || (valuePropositions.items && valuePropositions.items.length > 0)
          ? valuePropositions
          : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Highlight 1-3 key benefits or value propositions for your students
      </p>

      {/* Type Selection */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Display Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleTypeChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="cards">Cards (2-3 items with icons)</option>
          <option value="paragraph">Paragraph</option>
        </select>
      </div>

      {/* Conditional Fields */}
      {formData.type === 'paragraph' ? (
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Paragraph Text
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            value={formData.content}
            onChange={handleContentChange}
            placeholder="e.g., Our courses combine ancient wisdom with modern science to help you achieve lasting transformation..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {[0, 1, 2].map(index => {
            const item = formData.items[index];
            const isExpanded = expandedItems.has(index);
            const hasContent = item?.title || item?.description || item?.image;

            return (
              <div
                key={index}
                className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden"
              >
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item?.image && (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {item?.title || `Value Proposition ${index + 1}`}
                      {index === 2 && !hasContent && ' (Optional)'}
                    </span>
                    {hasContent && (
                      <span className="w-2 h-2 rounded-full bg-green-500" title="Has content" />
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200">
                    {/* Title */}
                    <div className="mt-4 mb-4">
                      <label
                        htmlFor={`item-${index}-title`}
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Title
                      </label>
                      <input
                        type="text"
                        id={`item-${index}-title`}
                        value={item?.title || ''}
                        onChange={e => handleItemChange(index, 'title', e.target.value)}
                        placeholder={
                          index === 0
                            ? 'e.g., Personalized Guidance'
                            : index === 1
                              ? 'e.g., Proven Techniques'
                              : 'e.g., Ongoing Support'
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <label
                        htmlFor={`item-${index}-description`}
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Description
                      </label>
                      <textarea
                        id={`item-${index}-description`}
                        rows={2}
                        value={item?.description || ''}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        placeholder={
                          index === 0
                            ? 'e.g., Tailored practices that meet you exactly where you are'
                            : index === 1
                              ? 'e.g., Time-tested methods refined through years of practice'
                              : 'e.g., Join a community dedicated to your growth'
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon/Image (Optional)
                      </label>
                      {item?.image ? (
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image}
                              alt={item.title || 'Value prop image'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveImagePicker(index)}
                              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemChange(index, 'image', '')}
                              className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveImagePicker(index)}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                        >
                          + Add Icon Image
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image Picker Modal */}
      {activeImagePicker !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Choose Icon Image</h3>
            <PexelsImagePicker
              width={200}
              height={200}
              category="value_prop"
              tenantId={expertId}
              defaultSearchQuery="icon simple minimal"
              onImageSelect={imageUrl => handleImageSelect(activeImagePicker, imageUrl)}
              onError={error => console.error('Image picker error:', error)}
              currentImageUrl={formData.items[activeImagePicker]?.image}
            />
            <button
              type="button"
              onClick={() => setActiveImagePicker(null)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
