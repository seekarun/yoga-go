/**
 * Common types for section components
 */

import type { Section, TemplateId } from "@/types/landing-page";

/**
 * Common props for all section components
 */
export interface SectionComponentProps<T extends Section = Section> {
  /** The section data */
  section: T;
  /** Whether the section is in edit mode */
  isEditing?: boolean;
  /** Template ID for styling context */
  template?: TemplateId;
  /** Callback when section data changes */
  onUpdate?: (updates: Partial<T>) => void;
  /** Callback when an image is clicked for editing */
  onImageClick?: (imageKey: string) => void;
  /** Callback when a button is clicked for editing */
  onButtonClick?: () => void;
}

/**
 * Props for SectionWrapper component
 */
export interface SectionWrapperProps {
  /** Section data for display */
  section: Section;
  /** Whether the section is in edit mode */
  isEditing?: boolean;
  /** Section index in the array */
  index: number;
  /** Total number of sections */
  totalSections: number;
  /** Callback to move section up */
  onMoveUp?: () => void;
  /** Callback to move section down */
  onMoveDown?: () => void;
  /** Callback to delete section */
  onDelete?: () => void;
  /** Children to render inside wrapper */
  children: React.ReactNode;
}

/**
 * Props for SectionRenderer component
 */
export interface SectionRendererProps {
  /** The section to render */
  section: Section;
  /** Whether the section is in edit mode */
  isEditing?: boolean;
  /** Template ID for styling context */
  template?: TemplateId;
  /** Section index in the array */
  index: number;
  /** Total number of sections */
  totalSections: number;
  /** Callback when section data changes */
  onUpdate?: (sectionId: string, updates: Partial<Section>) => void;
  /** Callback when an image is clicked for editing */
  onImageClick?: (sectionId: string, imageKey: string) => void;
  /** Callback when a button is clicked for editing */
  onButtonClick?: (sectionId: string) => void;
  /** Callback to move section up */
  onMoveUp?: (sectionId: string) => void;
  /** Callback to move section down */
  onMoveDown?: (sectionId: string) => void;
  /** Callback to delete section */
  onDelete?: (sectionId: string) => void;
}
