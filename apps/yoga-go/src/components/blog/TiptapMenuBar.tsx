'use client';

import type { Editor } from '@tiptap/react';

interface TiptapMenuBarProps {
  editor: Editor | null;
  onImageUpload?: () => void;
  onSetLink?: () => void;
}

export default function TiptapMenuBar({ editor, onImageUpload, onSetLink }: TiptapMenuBarProps) {
  if (!editor) {
    return null;
  }

  const buttonClass = (isActive: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded transition-colors ${
      isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
      {/* Text formatting */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={buttonClass(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <s>S</s>
      </button>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Headings */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 3 }))}
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={buttonClass(editor.isActive('paragraph'))}
        title="Paragraph"
      >
        P
      </button>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive('orderedList'))}
        title="Numbered List"
      >
        1. List
      </button>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Block elements */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive('blockquote'))}
        title="Quote"
      >
        &ldquo; Quote
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={buttonClass(editor.isActive('codeBlock'))}
        title="Code Block"
      >
        {'</>'}
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={buttonClass(false)}
        title="Horizontal Rule"
      >
        ―
      </button>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Link */}
      {onSetLink && (
        <button
          type="button"
          onClick={onSetLink}
          className={buttonClass(editor.isActive('link'))}
          title="Add Link"
        >
          🔗 Link
        </button>
      )}

      {/* Image */}
      {onImageUpload && (
        <button
          type="button"
          onClick={onImageUpload}
          className={buttonClass(false)}
          title="Add Image"
        >
          🖼️ Image
        </button>
      )}

      <div className="w-px bg-gray-300 mx-1" />

      {/* Undo/Redo */}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className={`${buttonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Undo (Ctrl+Z)"
      >
        ↩️
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className={`${buttonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Redo (Ctrl+Y)"
      >
        ↪️
      </button>
    </div>
  );
}
