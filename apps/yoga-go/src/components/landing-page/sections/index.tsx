import type { SectionConfig, SectionType } from './types';

// Import preview components
import HeroPreview from './hero/HeroPreview';
import ValuePropsPreview from './value-props/ValuePropsPreview';
import AboutPreview from './about/AboutPreview';
import ActPreview from './act/ActPreview';

// Import editor components
import HeroEditor from './hero/HeroEditor';
import ValuePropsEditor from './value-props/ValuePropsEditor';
import AboutEditor from './about/AboutEditor';
import ActEditor from './act/ActEditor';

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

// Section registry - defines all available sections
export const sectionRegistry: Record<SectionType, SectionConfig> = {
  hero: {
    id: 'hero',
    label: 'Hero Section',
    description: 'Main banner with headline, description, and call-to-action',
    icon: <HeroIcon />,
    PreviewComponent: HeroPreview,
    EditorComponent: HeroEditor,
  },
  valuePropositions: {
    id: 'valuePropositions',
    label: 'Value Propositions',
    description: 'Highlight key benefits or features',
    icon: <ValuePropsIcon />,
    PreviewComponent: ValuePropsPreview,
    EditorComponent: ValuePropsEditor,
  },
  about: {
    id: 'about',
    label: 'About Section',
    description: 'Share your story with video or image + text',
    icon: <AboutIcon />,
    PreviewComponent: AboutPreview,
    EditorComponent: AboutEditor,
  },
  act: {
    id: 'act',
    label: 'Call to Action',
    description: 'Final section to drive conversions',
    icon: <ActIcon />,
    PreviewComponent: ActPreview,
    EditorComponent: ActEditor,
  },
};

// Export all section types
export * from './types';

// Export individual components for direct use
export { HeroPreview, HeroEditor };
export { ValuePropsPreview, ValuePropsEditor };
export { AboutPreview, AboutEditor };
export { ActPreview, ActEditor };
