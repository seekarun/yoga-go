import type { Course, Webinar, BlogPost, Expert, ColorPalette, Lesson } from '@/types';

// ===== Section Types =====
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

// ===== Unsplash Attribution =====
export interface UnsplashAttribution {
  photographerName: string;
  photographerUsername: string;
  photographerUrl: string;
  unsplashUrl: string;
}

// ===== Template Types =====
export type TemplateId = 'classic' | 'modern';

// ===== Section-Specific Props =====

// Hero Section
export interface HeroSectionProps {
  heroImage?: string;
  heroImageAttribution?: UnsplashAttribution;
  headline: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  alignment: 'center' | 'left' | 'right';
  stats: {
    totalStudents: number;
    totalCourses: number;
    rating: number;
    totalRatings?: number;
  };
  expertName: string;
}

// Value Propositions Section
export interface ValuePropsSectionProps {
  type: 'paragraph' | 'list';
  content?: string;
  items?: string[];
}

// About Section
export interface AboutSectionProps {
  layoutType?: 'video' | 'image-text';
  videoCloudflareId?: string;
  videoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  imageUrl?: string;
  text?: string;
  expertName: string;
}

// Courses Section
export interface CoursesSectionProps {
  title?: string;
  description?: string;
  courses: Course[];
  expertId: string;
}

// Webinars Section
export interface WebinarsSectionProps {
  title?: string;
  description?: string;
  webinars: Webinar[];
  expertId: string;
}

// Photo Gallery Section
export interface PhotoGalleryImage {
  id: string;
  url: string;
  thumbUrl?: string;
  caption?: string;
  attribution?: UnsplashAttribution;
}

export interface PhotoGallerySectionProps {
  title?: string;
  description?: string;
  images: PhotoGalleryImage[];
  onImageClick?: (index: number) => void;
}

// Blog Section
export interface BlogSectionProps {
  title?: string;
  description?: string;
  latestPost?: BlogPost;
}

// Act (CTA) Section
export interface ActSectionProps {
  imageUrl?: string;
  imageAttribution?: UnsplashAttribution;
  title?: string;
  text?: string;
  ctaText: string;
  ctaLink: string;
}

// Footer Section
export interface FooterSectionProps {
  copyrightText?: string;
  tagline?: string;
  showSocialLinks?: boolean;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
  };
  showLegalLinks?: boolean;
  legalLinks?: {
    privacyPolicy?: string;
    termsOfService?: string;
    refundPolicy?: string;
  };
  showContactInfo?: boolean;
  contactEmail?: string;
  expertName: string;
}

// ===== Template-Level Types =====

// Data passed to templates (content from database)
export interface LandingPageData {
  expert: Expert;
  courses: Course[];
  webinars: Webinar[];
  latestBlogPost?: BlogPost;
}

// Configuration passed to templates (display settings)
export interface LandingPageConfig {
  template: TemplateId;
  sectionOrder: SectionType[];
  disabledSections: SectionType[];
  theme: {
    primaryColor?: string;
    palette?: ColorPalette;
  };
}

// Context for resolving links and other runtime needs
export interface LandingPageContext {
  expertId: string;
  resolveCtaLink: (link: string | undefined) => string;
  isPreviewMode: boolean;
  onGalleryImageClick?: (index: number) => void;
}

// Top-level props passed to template components
export interface TemplateProps {
  data: LandingPageData;
  config: LandingPageConfig;
  context: LandingPageContext;
}

// ===== Template Registration =====
export interface TemplateRegistration {
  id: TemplateId;
  name: string;
  description: string;
  Component: React.ComponentType<TemplateProps>;
}

// ===== Page Section Types =====

// Course List Page Props
export interface CourseListPageProps {
  courses: Course[];
  expert: Expert;
}

// Course Detail Page Props
export interface CourseDetailPageProps {
  course: Course;
  lessons: Lesson[];
  expert: Expert;
  isEnrolled: boolean;
  isAuthenticated: boolean;
  onEnrollClick: () => void;
}

// Blog List Page Props
export interface BlogListPageProps {
  posts: BlogPost[];
  expert: Expert;
}

// Blog Post Page Props
export interface BlogPostPageProps {
  post: BlogPost;
  expert: Expert;
}
