'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import TiptapMenuBar from './TiptapMenuBar';

export interface TiptapEditorRef {
  getHTML: () => string;
  setHTML: (html: string) => void;
}

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onImageUpload?: () => Promise<string | null>;
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(function TiptapEditor(
  { content, onChange, placeholder = 'Start writing your blog post...', onImageUpload },
  ref
) {
  const [isMounted, setIsMounted] = useState(false);

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content ? JSON.parse(content) : undefined,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(JSON.stringify(json));
    },
  });

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      getHTML: () => editor?.getHTML() || '',
      setHTML: (html: string) => {
        if (editor) {
          editor.commands.setContent(html);
          // Also update the parent state with the new JSON
          onChange(JSON.stringify(editor.getJSON()));
        }
      },
    }),
    [editor, onChange]
  );

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content) {
      try {
        const currentContent = JSON.stringify(editor.getJSON());
        if (currentContent !== content) {
          editor.commands.setContent(JSON.parse(content));
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [editor, content]);

  const handleImageUpload = useCallback(async () => {
    if (!editor || !onImageUpload) return;

    const imageUrl = await onImageUpload();
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
  }, [editor, onImageUpload]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) return;

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!isMounted) {
    return (
      <div className="border border-gray-200 rounded-lg">
        <div className="h-12 border-b border-gray-200 bg-gray-50" />
        <div className="min-h-[300px] px-4 py-3 text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <TiptapMenuBar
        editor={editor}
        onImageUpload={onImageUpload ? handleImageUpload : undefined}
        onSetLink={setLink}
      />
      <EditorContent editor={editor} />
    </div>
  );
});

export default TiptapEditor;
