/**
 * Shared constants for template sections
 */

/** Maximum width for section content to prevent overly wide layouts on large screens */
export const SECTION_MAX_WIDTH = '1200px';

/** Wrapper styles for sections - provides white background on sides for wide screens */
export const sectionWrapperStyle = {
  background: '#fff',
};

/** Inner section style with max-width constraint */
export const sectionInnerStyle = {
  maxWidth: SECTION_MAX_WIDTH,
  margin: '0 auto',
};
