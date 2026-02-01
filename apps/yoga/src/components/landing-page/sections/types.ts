import type { ReactNode } from 'react';
import type { CustomLandingPageConfig, Asset } from '@/types';

// Section type union
export type SectionType =
  | 'hero'
  | 'valuePropositions'
  | 'about'
  | 'courses'
  | 'webinars'
  | 'photoGallery'
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
  'photoGallery',
  'blog',
  'act',
  'footer',
];

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

// Value prop item form data
export interface ValuePropItemFormData {
  title: string;
  description: string;
  image: string;
}

// Value props form data
export interface ValuePropsFormData {
  type: 'paragraph' | 'cards';
  content: string;
  items: ValuePropItemFormData[];
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
  imageAttribution?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
  title: string;
  text: string;
  ctaText: string;
  ctaLink: string;
}
