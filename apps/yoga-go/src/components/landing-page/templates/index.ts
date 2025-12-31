import type { LandingPageTemplate } from '@/types';

export interface TemplateConfig {
  id: LandingPageTemplate;
  name: string;
  description: string;
}

export const templates: TemplateConfig[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional layout with centered hero',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bold typography with refined spacing',
  },
  {
    id: 'classic-dark',
    name: 'Classic Dark',
    description: 'Classic layout with a sleek dark theme',
  },
];

export const DEFAULT_TEMPLATE: LandingPageTemplate = 'classic';
