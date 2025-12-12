'use client';

import { useState, useEffect } from 'react';
import type { SectionEditorProps, ValuePropsFormData } from '../types';

export default function ValuePropsEditor({ data, onChange }: SectionEditorProps) {
  const [formData, setFormData] = useState<ValuePropsFormData>({
    type: data.valuePropositions?.type || 'list',
    content: data.valuePropositions?.content || '',
    items: [
      data.valuePropositions?.items?.[0] || '',
      data.valuePropositions?.items?.[1] || '',
      data.valuePropositions?.items?.[2] || '',
    ],
  });

  // Sync with parent data when it changes externally
  useEffect(() => {
    setFormData({
      type: data.valuePropositions?.type || 'list',
      content: data.valuePropositions?.content || '',
      items: [
        data.valuePropositions?.items?.[0] || '',
        data.valuePropositions?.items?.[1] || '',
        data.valuePropositions?.items?.[2] || '',
      ],
    });
  }, [data.valuePropositions]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    let updated: ValuePropsFormData;

    if (name.startsWith('item')) {
      const index = parseInt(name.replace('item', '')) - 1;
      const newItems = [...formData.items];
      newItems[index] = value;
      updated = { ...formData, items: newItems };
    } else {
      updated = { ...formData, [name]: value };
    }

    setFormData(updated);
    propagateChanges(updated);
  };

  const propagateChanges = (updated: ValuePropsFormData) => {
    // Don't trim during typing - filter out completely empty items only
    const filteredItems = updated.items.filter(item => item !== '');

    const valuePropositions =
      updated.type === 'paragraph'
        ? {
            type: 'paragraph' as const,
            content: updated.content || undefined,
          }
        : {
            type: 'list' as const,
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
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Value Propositions</h3>
        <p className="text-sm text-gray-600 mb-4">
          Highlight 1-3 key benefits or value propositions for your students
        </p>
      </div>

      {/* Type Selection */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Display Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="list">List (2-3 items)</option>
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
            onChange={handleChange}
            placeholder="e.g., Our courses combine ancient wisdom with modern science to help you achieve lasting transformation..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="item1" className="block text-sm font-medium text-gray-700 mb-2">
              Value Proposition 1
            </label>
            <input
              type="text"
              id="item1"
              name="item1"
              value={formData.items[0]}
              onChange={handleChange}
              placeholder="e.g., Personalized guidance tailored to your needs"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="item2" className="block text-sm font-medium text-gray-700 mb-2">
              Value Proposition 2
            </label>
            <input
              type="text"
              id="item2"
              name="item2"
              value={formData.items[1]}
              onChange={handleChange}
              placeholder="e.g., Proven techniques for lasting results"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="item3" className="block text-sm font-medium text-gray-700 mb-2">
              Value Proposition 3 (Optional)
            </label>
            <input
              type="text"
              id="item3"
              name="item3"
              value={formData.items[2]}
              onChange={handleChange}
              placeholder="e.g., Ongoing support and community"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </>
      )}
    </div>
  );
}
