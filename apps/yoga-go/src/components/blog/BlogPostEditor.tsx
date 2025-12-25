'use client';

import { useState, useCallback } from 'react';
import TiptapEditor from './TiptapEditor';
import ImageUploadCrop from '../ImageUploadCrop';
import NotificationOverlay from '@/components/NotificationOverlay';
import type { BlogPost, BlogPostAttachment, BlogPostStatus, Asset } from '@/types';

interface BlogPostEditorProps {
  initialPost?: Partial<BlogPost>;
  onSave: (post: {
    title: string;
    content: string;
    coverImage?: string;
    status: BlogPostStatus;
    tags: string[];
    attachments: BlogPostAttachment[];
    excerpt?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function BlogPostEditor({
  initialPost,
  onSave,
  onCancel,
  isSaving = false,
}: BlogPostEditorProps) {
  const [title, setTitle] = useState(initialPost?.title || '');
  const [content, setContent] = useState(initialPost?.content || '');
  const [coverImage, setCoverImage] = useState(initialPost?.coverImage || '');
  const [status] = useState<BlogPostStatus>(initialPost?.status || 'draft');
  const [tags, setTags] = useState<string[]>(initialPost?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [attachments] = useState<BlogPostAttachment[]>(initialPost?.attachments || []);
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '');
  const [showCoverUpload, setShowCoverUpload] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUploadResolve, setImageUploadResolve] = useState<
    ((url: string | null) => void) | null
  >(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'warning' | 'error';
  } | null>(null);

  const handleSubmit = async (saveStatus: BlogPostStatus) => {
    if (!title.trim()) {
      setNotification({ message: 'Please enter a title', type: 'warning' });
      return;
    }
    if (!content.trim()) {
      setNotification({ message: 'Please add some content', type: 'warning' });
      return;
    }

    await onSave({
      title: title.trim(),
      content,
      coverImage: coverImage || undefined,
      status: saveStatus,
      tags,
      attachments,
      excerpt: excerpt.trim() || undefined,
    });
  };

  const handleCoverImageUpload = (asset: Asset) => {
    setCoverImage(asset.croppedUrl || asset.originalUrl);
    setShowCoverUpload(false);
  };

  const handleInlineImageUpload = useCallback((): Promise<string | null> => {
    return new Promise(resolve => {
      setImageUploadResolve(() => resolve);
      setShowImageUpload(true);
    });
  }, []);

  const handleInlineImageComplete = (asset: Asset) => {
    if (imageUploadResolve) {
      imageUploadResolve(asset.croppedUrl || asset.originalUrl);
      setImageUploadResolve(null);
    }
    setShowImageUpload(false);
  };

  const handleInlineImageCancel = () => {
    if (imageUploadResolve) {
      imageUploadResolve(null);
      setImageUploadResolve(null);
    }
    setShowImageUpload(false);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Title */}
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Post title"
          className="w-full text-3xl font-bold border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-2 placeholder-gray-400"
        />
      </div>

      {/* Cover Image */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image (optional)
        </label>
        {coverImage ? (
          <div className="relative">
            <img src={coverImage} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => setCoverImage('')}
              className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => setShowCoverUpload(true)}
              className="absolute top-2 right-20 bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-800"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCoverUpload(true)}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            + Add cover image
          </button>
        )}
      </div>

      {/* Excerpt */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt (optional - auto-generated if empty)
        </label>
        <textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          placeholder="Brief summary of your post..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
          maxLength={300}
        />
        <p className="text-xs text-gray-500 mt-1">{excerpt.length}/300 characters</p>
      </div>

      {/* Content Editor */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
        <TiptapEditor
          content={content}
          onChange={setContent}
          onImageUpload={handleInlineImageUpload}
          placeholder="Write your blog post content here..."
        />
      </div>

      {/* Tags */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          disabled={isSaving}
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('published')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Publishing...' : status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Cover Image Upload Modal */}
      {showCoverUpload && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload Cover Image</h3>
            <ImageUploadCrop
              width={1200}
              height={630}
              category="blog_cover"
              onUploadComplete={handleCoverImageUpload}
              onError={error => {
                console.error('Cover upload error:', error);
                setNotification({ message: 'Failed to upload cover image', type: 'error' });
              }}
              label="Cover Image"
            />
            <button
              type="button"
              onClick={() => setShowCoverUpload(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
            <ImageUploadCrop
              width={800}
              height={600}
              category="blog_inline"
              onUploadComplete={handleInlineImageComplete}
              onError={error => {
                console.error('Image upload error:', error);
                setNotification({ message: 'Failed to upload image', type: 'error' });
                handleInlineImageCancel();
              }}
              label="Blog Image"
            />
            <button
              type="button"
              onClick={handleInlineImageCancel}
              className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={notification !== null}
        onClose={() => setNotification(null)}
        message={notification?.message || ''}
        type={notification?.type || 'warning'}
        duration={4000}
      />
    </div>
  );
}
