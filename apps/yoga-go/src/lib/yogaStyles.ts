/**
 * Yoga Styles - Comprehensive list of yoga types
 * Used for expert profiles, course categorization, and filtering
 */

export interface YogaStyle {
  value: string;
  label: string;
}

export const YOGA_STYLES: YogaStyle[] = [
  { value: 'Acro', label: 'Acro' },
  { value: 'Aerial', label: 'Aerial' },
  { value: 'Alexander', label: 'Alexander' },
  { value: 'Ananda', label: 'Ananda' },
  { value: 'Anusara', label: 'Anusara' },
  { value: 'Aqua', label: 'Aqua' },
  { value: 'Ashtanga', label: 'Ashtanga' },
  { value: 'BMC', label: 'BMC' },
  { value: 'Backmitra', label: 'Backmitra' },
  { value: 'Ball', label: 'Ball' },
  { value: 'Baptiste', label: 'Baptiste' },
  { value: 'Bhakti', label: 'Bhakti' },
  { value: 'Bikram', label: 'Bikram' },
  { value: 'Bo', label: 'Bo' },
  { value: 'Body-Positive', label: 'Body Positive' },
  { value: 'Bouddha', label: 'Bouddha' },
  { value: 'Chair', label: 'Chair' },
  { value: 'Continuum', label: 'Continuum' },
  { value: 'Dhyana', label: 'Dhyana' },
  { value: 'DoIn', label: 'Do In' },
  { value: 'Dru', label: 'Dru' },
  { value: 'Energy-Medicine', label: 'Energy Medicine (EM)' },
  { value: 'Forrest', label: 'Forrest' },
  { value: 'Gentle', label: 'Gentle' },
  { value: 'Hatha', label: 'Hatha' },
  { value: 'Hot', label: 'Hot' },
  { value: 'Hypopressive', label: 'Hypopressive' },
  { value: 'Iyengar', label: 'Iyengar' },
  { value: 'Integrative', label: 'Integrative' },
  { value: 'Jain', label: 'Jain' },
  { value: 'Jivamukti', label: 'Jivamukti' },
  { value: 'Jnana', label: 'Jnana' },
  { value: 'Kaiut', label: 'Kaiut' },
  { value: 'Karma', label: 'Karma' },
  { value: 'Kemetic', label: 'Kemetic' },
  { value: 'Kids', label: 'Kids' },
  { value: 'Kripalu', label: 'Kripalu' },
  { value: 'Kundalini', label: 'Kundalini' },
  { value: 'Kurunta', label: 'Kurunta' },
  { value: 'Laya', label: 'Laya' },
  { value: 'Mandala', label: 'Mandala' },
  { value: 'Mantra', label: 'Mantra' },
  { value: 'Meridian', label: 'Meridian' },
  { value: 'MommyAndMe', label: 'Mommy & Me' },
  { value: 'Ortho-Bionomy', label: 'Ortho-Bionomy' },
  { value: 'Other', label: 'Other' },
  { value: 'Paddle', label: 'Paddle' },
  { value: 'Partner', label: 'Partner' },
  { value: 'Patanjala', label: 'Patanjala' },
  { value: 'Pilates', label: 'Pilates' },
  { value: 'Postnatal', label: 'Postnatal' },
  { value: 'Power', label: 'Power' },
  { value: 'Prenatal', label: 'Prenatal' },
  { value: 'Purna', label: 'Purna' },
  { value: 'Qigong', label: 'Qigong' },
  { value: 'Restorative', label: 'Restorative' },
  { value: 'Rocket', label: 'Rocket' },
  { value: 'Sattva', label: 'Sattva' },
  { value: 'Satyananda', label: 'Satyananda' },
  { value: 'Scaravelli', label: 'Scaravelli' },
  { value: 'Sculpt', label: 'Sculpt' },
  { value: 'Seniors', label: 'Seniors' },
  { value: 'Shadow', label: 'Shadow' },
  { value: 'Sivananda', label: 'Sivananda' },
  { value: 'Somatic', label: 'Somatic' },
  { value: 'Tantra', label: 'Tantra' },
  { value: 'Teens', label: 'Teens Yoga' },
  { value: 'Therapy', label: 'Therapy' },
  { value: 'Viniyoga', label: 'Viniyoga' },
  { value: 'Vinyasa', label: 'Vinyasa' },
  { value: 'Wheel', label: 'Wheel' },
  { value: 'Yang', label: 'Yang' },
  { value: 'Yin', label: 'Yin' },
  { value: 'Yin-Yang', label: 'Yin-Yang' },
  { value: 'Yinyasa', label: 'Yinyasa' },
  { value: 'Yoni', label: 'Yoni' },
] as const;

// Type for yoga style values
export type YogaStyleValue = (typeof YOGA_STYLES)[number]['value'];

// Helper to get label by value
export const getYogaStyleLabel = (value: string): string => {
  const style = YOGA_STYLES.find(s => s.value === value);
  return style?.label || value;
};

// Helper to get style by value
export const getYogaStyle = (value: string): YogaStyle | undefined => {
  return YOGA_STYLES.find(s => s.value === value);
};

// Values array for validation
export const YOGA_STYLE_VALUES = YOGA_STYLES.map(s => s.value);
