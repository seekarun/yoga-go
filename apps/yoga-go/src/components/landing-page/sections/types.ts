import type { ReactNode } from 'react';
import type { CustomLandingPageConfig, Asset } from '@/types';

// Section type union
export type SectionType =
  | 'hero'
  | 'valuePropositions'
  | 'about'
  | 'courses'
  | 'webinars'
  | 'blog'
  | 'act'
  | 'footer';

// Default section order
export const DEFAULT_SECTION_ORDER: SectionType[] = [
  'hero',
  'valuePropositions',
  'about',
  'courses',
  'webinars',
  'blog',
  'act',
  'footer',
];

// Props for preview components
export interface SectionPreviewProps {
  data: CustomLandingPageConfig;
  expertName?: string;
  expertBio?: string;
  expertId?: string;
}

// Props for editor components
export interface SectionEditorProps {
  data: CustomLandingPageConfig;
  onChange: (updates: Partial<CustomLandingPageConfig>) => void;
  expertId: string;
  onError?: (error: string) => void;
}

// Section configuration
export interface SectionConfig {
  id: SectionType;
  label: string;
  icon: ReactNode;
  description: string;
  PreviewComponent: React.FC<SectionPreviewProps>;
  EditorComponent: React.FC<SectionEditorProps>;
}

// Editor state for landing page
export interface LandingPageEditorState {
  data: CustomLandingPageConfig;
  sectionOrder: SectionType[];
  disabledSections: SectionType[];
  selectedSection: SectionType | null;
  isDirty: boolean;
}

// Handler types for image/video uploads
export interface ImageUploadHandler {
  (asset: Asset): void;
}

export interface VideoUploadHandler {
  (result: { videoId: string; status: string }): void;
}

// Hero section form data (flattened for easier form handling)
export interface HeroFormData {
  heroImage: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  alignment: 'center' | 'left' | 'right';
}

// Value props form data
export interface ValuePropsFormData {
  type: 'paragraph' | 'list';
  content: string;
  items: string[];
}

// About section form data
export interface AboutFormData {
  layoutType: '' | 'video' | 'image-text';
  videoCloudflareId: string;
  videoStatus: '' | 'uploading' | 'processing' | 'ready' | 'error';
  imageUrl: string;
  text: string;
}

// Act section form data
export interface ActFormData {
  imageUrl: string;
  title: string;
  text: string;
}
