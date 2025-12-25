import type { SectionConfig, SectionType } from './types';

// Import editor components
import HeroEditor from './hero/HeroEditor';
import ValuePropsEditor from './value-props/ValuePropsEditor';
import AboutEditor from './about/AboutEditor';
import CoursesEditor from './courses/CoursesEditor';
import WebinarsEditor from './webinars/WebinarsEditor';
import PhotoGalleryEditor from './photo-gallery/PhotoGalleryEditor';
import BlogEditor from './blog/BlogEditor';
import ActEditor from './act/ActEditor';
import FooterEditor from './footer/FooterEditor';

// Section icons as SVG strings for use in the section list
const HeroIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
  </svg>
);

const ValuePropsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </svg>
);

const AboutIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const ActIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const BlogIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const CoursesIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const WebinarsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const PhotoGalleryIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const FooterIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);

// Section registry - defines all available sections
export const sectionRegistry: Record<SectionType, SectionConfig> = {
  hero: {
    id: 'hero',
    label: 'Hero Section',
    description: 'Main banner with headline, description, and call-to-action',
    icon: <HeroIcon />,
    EditorComponent: HeroEditor,
  },
  valuePropositions: {
    id: 'valuePropositions',
    label: 'Value Propositions',
    description: 'Highlight key benefits or features',
    icon: <ValuePropsIcon />,
    EditorComponent: ValuePropsEditor,
  },
  about: {
    id: 'about',
    label: 'About Section',
    description: 'Share your story with video or image + text',
    icon: <AboutIcon />,
    EditorComponent: AboutEditor,
  },
  courses: {
    id: 'courses',
    label: 'Courses Section',
    description: 'Display your courses in a carousel',
    icon: <CoursesIcon />,
    EditorComponent: CoursesEditor,
  },
  webinars: {
    id: 'webinars',
    label: 'Live Sessions',
    description: 'Showcase your upcoming webinars and live sessions',
    icon: <WebinarsIcon />,
    EditorComponent: WebinarsEditor,
  },
  photoGallery: {
    id: 'photoGallery',
    label: 'Photo Gallery',
    description: 'Display photos in a horizontal carousel',
    icon: <PhotoGalleryIcon />,
    EditorComponent: PhotoGalleryEditor,
  },
  blog: {
    id: 'blog',
    label: 'Blog Section',
    description: 'Showcase your latest blog post',
    icon: <BlogIcon />,
    EditorComponent: BlogEditor,
  },
  act: {
    id: 'act',
    label: 'Call to Action',
    description: 'Final section to drive conversions',
    icon: <ActIcon />,
    EditorComponent: ActEditor,
  },
  footer: {
    id: 'footer',
    label: 'Footer',
    description: 'Copyright, social links, and legal pages',
    icon: <FooterIcon />,
    EditorComponent: FooterEditor,
  },
};

// Export all section types
export * from './types';

// Export individual editor components for direct use
export { HeroEditor };
export { ValuePropsEditor };
export { AboutEditor };
export { CoursesEditor };
export { WebinarsEditor };
export { PhotoGalleryEditor };
export { BlogEditor };
export { ActEditor };
export { FooterEditor };
