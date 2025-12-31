import type { TemplateId, TemplateRegistration } from './types';

// Template registry - lazy loaded to avoid circular imports
const templateRegistry: Map<TemplateId, TemplateRegistration> = new Map();
let registryInitialized = false;

// Initialize the registry with all templates
async function initializeRegistry() {
  if (registryInitialized) return;

  const [
    { default: ClassicTemplate },
    { default: ModernTemplate },
    { default: ClassicDarkTemplate },
  ] = await Promise.all([import('./classic'), import('./modern'), import('./classic-dark')]);

  templateRegistry.set('classic', {
    id: 'classic',
    name: 'Classic',
    description: 'Clean, professional layout with centered content',
    Component: ClassicTemplate,
  });

  templateRegistry.set('modern', {
    id: 'modern',
    name: 'Modern',
    description: 'Bold, dark theme with split layouts and gradient accents',
    Component: ModernTemplate,
  });

  templateRegistry.set('classic-dark', {
    id: 'classic-dark',
    name: 'Classic Dark',
    description: 'Classic layout with a sleek dark theme',
    Component: ClassicDarkTemplate,
  });

  registryInitialized = true;
}

// Get a template by ID (async for lazy loading)
export async function getTemplate(id: TemplateId): Promise<TemplateRegistration> {
  await initializeRegistry();
  const template = templateRegistry.get(id);
  if (!template) {
    throw new Error(`Template "${id}" not found`);
  }
  return template;
}

// Get all available templates
export async function getAllTemplates(): Promise<TemplateRegistration[]> {
  await initializeRegistry();
  return Array.from(templateRegistry.values());
}

// Get template IDs
export function getTemplateIds(): TemplateId[] {
  return ['classic', 'modern', 'classic-dark'];
}
