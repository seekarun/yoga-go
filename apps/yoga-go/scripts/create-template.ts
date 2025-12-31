#!/usr/bin/env npx tsx
/**
 * Template Scaffold Script
 *
 * Creates a new landing page template by copying an existing one
 * and updating the registry.
 *
 * Usage:
 *   npx tsx scripts/create-template.ts <new-name> [--base=classic]
 *
 * Examples:
 *   npx tsx scripts/create-template.ts classic-dark
 *   npx tsx scripts/create-template.ts elegant-serif --base=modern
 */

import * as fs from 'fs';
import * as path from 'path';

const TEMPLATES_DIR = path.join(__dirname, '../src/templates');

function toTitleCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function updateTypesFile(templateId: string): void {
  const typesPath = path.join(TEMPLATES_DIR, 'types.ts');
  let content = fs.readFileSync(typesPath, 'utf-8');

  // Find and update TemplateId type
  const templateIdRegex = /export type TemplateId = ([^;]+);/;
  const match = content.match(templateIdRegex);

  if (match) {
    const existingTypes = match[1];
    // Check if already exists
    if (existingTypes.includes(`'${templateId}'`)) {
      console.log(`  TemplateId '${templateId}' already exists in types.ts`);
      return;
    }
    const newTypes = existingTypes.replace(/;?\s*$/, '') + ` | '${templateId}'`;
    content = content.replace(templateIdRegex, `export type TemplateId = ${newTypes};`);
    fs.writeFileSync(typesPath, content);
    console.log(`  Updated types.ts with '${templateId}'`);
  } else {
    console.error('  Could not find TemplateId type in types.ts');
  }
}

function updateMainTypesFile(templateId: string): void {
  const typesPath = path.join(__dirname, '../src/types/index.ts');
  let content = fs.readFileSync(typesPath, 'utf-8');

  // Find and update LandingPageTemplate type
  const templateTypeRegex = /export type LandingPageTemplate = ([^;]+);/;
  const match = content.match(templateTypeRegex);

  if (match) {
    const existingTypes = match[1];
    // Check if already exists
    if (existingTypes.includes(`'${templateId}'`)) {
      console.log(`  LandingPageTemplate '${templateId}' already exists in src/types/index.ts`);
      return;
    }
    const newTypes = existingTypes.replace(/;?\s*$/, '') + ` | '${templateId}'`;
    content = content.replace(templateTypeRegex, `export type LandingPageTemplate = ${newTypes};`);
    fs.writeFileSync(typesPath, content);
    console.log(`  Updated src/types/index.ts with '${templateId}'`);
  } else {
    console.error('  Could not find LandingPageTemplate type in src/types/index.ts');
  }
}

function updateUITemplatesFile(templateId: string, displayName: string): void {
  const uiTemplatesPath = path.join(__dirname, '../src/components/landing-page/templates/index.ts');
  let content = fs.readFileSync(uiTemplatesPath, 'utf-8');

  // Check if already exists
  if (content.includes(`id: '${templateId}'`)) {
    console.log(`  Template '${templateId}' already exists in UI templates`);
    return;
  }

  // Find the closing bracket of the templates array
  const arrayEndRegex = /(\s*}\s*,\s*)\];(\s*\nexport const DEFAULT_TEMPLATE)/;
  const match = content.match(arrayEndRegex);

  if (match) {
    const newEntry = `$1{
    id: '${templateId}',
    name: '${displayName}',
    description: 'TODO: Add description',
  },
];$2`;
    content = content.replace(arrayEndRegex, newEntry);
    fs.writeFileSync(uiTemplatesPath, content);
    console.log(`  Updated UI templates with '${templateId}'`);
  } else {
    console.error('  Could not find templates array in UI templates file');
  }
}

function updateRegistryFile(templateId: string, displayName: string): void {
  const registryPath = path.join(TEMPLATES_DIR, 'registry.ts');
  let content = fs.readFileSync(registryPath, 'utf-8');

  const pascalName = toPascalCase(templateId);

  // Check if already registered
  if (content.includes(`'${templateId}'`)) {
    console.log(`  Template '${templateId}' already registered in registry.ts`);
    return;
  }

  // 1. Add import to Promise.all
  const importRegex = /const \[([^\]]+)\]\s*=\s*await Promise\.all\(\[([^\]]+)\]\);/s;
  const importMatch = content.match(importRegex);

  if (importMatch) {
    const existingDestructure = importMatch[1].trim();
    const existingImports = importMatch[2].trim();

    const newDestructure = existingDestructure + `, { default: ${pascalName}Template }`;
    const newImports = existingImports + `, import('./${templateId}')`;

    content = content.replace(
      importRegex,
      `const [${newDestructure}] =\n    await Promise.all([${newImports}]);`
    );
  }

  // 2. Add registry.set() call
  const lastSetRegex =
    /(templateRegistry\.set\('[^']+',\s*\{[^}]+\}\);)\s*(\n\s*registryInitialized)/s;
  const lastSetMatch = content.match(lastSetRegex);

  if (lastSetMatch) {
    const newRegistration = `

  templateRegistry.set('${templateId}', {
    id: '${templateId}',
    name: '${displayName}',
    description: 'TODO: Add description',
    Component: ${pascalName}Template,
  });`;

    content = content.replace(lastSetRegex, `$1${newRegistration}\n$2`);
  }

  // 3. Update getTemplateIds()
  const idsRegex = /return \[([^\]]+)\];(\s*}\s*$)/m;
  const idsMatch = content.match(idsRegex);

  if (idsMatch) {
    const existingIds = idsMatch[1];
    if (!existingIds.includes(`'${templateId}'`)) {
      const newIds = existingIds.trimEnd() + `, '${templateId}'`;
      content = content.replace(idsRegex, `return [${newIds}];$2`);
    }
  }

  fs.writeFileSync(registryPath, content);
  console.log(`  Updated registry.ts with '${templateId}'`);
}

function updateExpertPage(templateId: string): void {
  const pagePath = path.join(__dirname, '../src/app/experts/[expertId]/page.tsx');
  let content = fs.readFileSync(pagePath, 'utf-8');

  const pascalName = toPascalCase(templateId);

  // Check if already exists
  if (content.includes(`${pascalName}Template`)) {
    console.log(`  Template '${templateId}' already exists in expert page`);
    return;
  }

  // 1. Add dynamic import after the last template import
  const lastImportRegex =
    /(const \w+Template = dynamic\(\(\) => import\('@\/templates\/[^']+'\)[^;]+;\n)(\n(?:const \w+Template|export))/;
  const importMatch = content.match(lastImportRegex);

  if (importMatch) {
    const newImport = `const ${pascalName}Template = dynamic(() => import('@/templates/${templateId}'), { ssr: false });\n`;
    content = content.replace(lastImportRegex, `$1${newImport}$2`);
  }

  // 2. Add case to switch statement (before default)
  const defaultCaseRegex = /(\s*)(default:\s*\n?\s*return \w+Template;)/;
  const caseMatch = content.match(defaultCaseRegex);

  if (caseMatch) {
    const indent = caseMatch[1];
    const newCase = `${indent}case '${templateId}':\n${indent}  return ${pascalName}Template;\n`;
    content = content.replace(defaultCaseRegex, `${newCase}$1$2`);
  }

  fs.writeFileSync(pagePath, content);
  console.log(`  Updated src/app/experts/[expertId]/page.tsx`);
}

function updateTemplateSections(templateId: string): void {
  const sectionsPath = path.join(
    __dirname,
    '../src/components/landing-page/editor/templateSections.tsx'
  );
  let content = fs.readFileSync(sectionsPath, 'utf-8');

  const pascalName = toPascalCase(templateId);
  const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);

  // Check if already exists
  if (content.includes(`${pascalName}HeroSection`)) {
    console.log(`  Template '${templateId}' already exists in templateSections`);
    return;
  }

  // 1. Add import block after the last template imports
  const sectionTypes = [
    'HeroSection',
    'ValuePropsSection',
    'AboutSection',
    'CoursesSection',
    'WebinarsSection',
    'PhotoGallerySection',
    'BlogSection',
    'ActSection',
    'FooterSection',
  ];

  // Find the last import block and add after it
  const lastImportRegex =
    /(import \w+FooterSection from '@\/templates\/[^']+\/sections\/FooterSection';\n)(\n\/\/ Section component maps)/;
  const importMatch = content.match(lastImportRegex);

  if (importMatch) {
    let newImports = `\n// Import ${pascalName.replace(/([A-Z])/g, ' $1').trim()} template sections\n`;
    for (const sectionType of sectionTypes) {
      newImports += `import ${pascalName}${sectionType} from '@/templates/${templateId}/sections/${sectionType}';\n`;
    }
    content = content.replace(lastImportRegex, `$1${newImports}$2`);
  }

  // 2. Add section map const before templateSections registry
  const registryRegex = /(\/\/ Template section registry\nconst templateSections)/;
  const registryMatch = content.match(registryRegex);

  if (registryMatch) {
    let newMap = `const ${camelName}Sections = {\n`;
    const sectionKeys = [
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
    for (let i = 0; i < sectionKeys.length; i++) {
      newMap += `  ${sectionKeys[i]}: ${pascalName}${sectionTypes[i]},\n`;
    }
    newMap += '};\n\n';
    content = content.replace(registryRegex, `${newMap}$1`);
  }

  // 3. Add to templateSections registry
  const lastEntryRegex = /(\s*'[^']+': \w+Sections,?\n)(};)/;
  const entryMatch = content.match(lastEntryRegex);

  if (entryMatch) {
    const newEntry = `  '${templateId}': ${camelName}Sections,\n`;
    content = content.replace(lastEntryRegex, `$1${newEntry}$2`);
  }

  fs.writeFileSync(sectionsPath, content);
  console.log(`  Updated src/components/landing-page/editor/templateSections.tsx`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npx tsx scripts/create-template.ts <template-name> [--base=classic]

Arguments:
  template-name   Name for the new template (use kebab-case, e.g., 'elegant-serif')
  --base=NAME     Base template to copy from (default: 'classic')

Examples:
  npx tsx scripts/create-template.ts classic-dark
  npx tsx scripts/create-template.ts elegant-serif --base=modern
`);
    process.exit(0);
  }

  const templateName = args[0];
  let baseTemplate = 'classic';

  // Parse --base argument
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--base=')) {
      baseTemplate = arg.replace('--base=', '');
    }
  }

  // Validate template name
  if (!/^[a-z][a-z0-9-]*$/.test(templateName)) {
    console.error('Error: Template name must be kebab-case (e.g., "classic-dark")');
    process.exit(1);
  }

  const sourcePath = path.join(TEMPLATES_DIR, baseTemplate);
  const destPath = path.join(TEMPLATES_DIR, templateName);

  // Check source exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Base template '${baseTemplate}' not found at ${sourcePath}`);
    process.exit(1);
  }

  // Check dest doesn't exist
  if (fs.existsSync(destPath)) {
    console.error(`Error: Template '${templateName}' already exists at ${destPath}`);
    process.exit(1);
  }

  const displayName = toTitleCase(templateName);

  console.log(`\nCreating template '${templateName}' from '${baseTemplate}'...\n`);

  // 1. Copy template directory
  console.log(`1. Copying ${baseTemplate}/ to ${templateName}/`);
  copyDirRecursive(sourcePath, destPath);
  console.log(`   Copied ${fs.readdirSync(destPath, { recursive: true }).length} files`);

  // 2. Update src/templates/types.ts
  console.log(`\n2. Updating src/templates/types.ts`);
  updateTypesFile(templateName);

  // 3. Update src/templates/registry.ts
  console.log(`\n3. Updating src/templates/registry.ts`);
  updateRegistryFile(templateName, displayName);

  // 4. Update src/types/index.ts (LandingPageTemplate type)
  console.log(`\n4. Updating src/types/index.ts`);
  updateMainTypesFile(templateName);

  // 5. Update src/components/landing-page/templates/index.ts (UI dropdown)
  console.log(`\n5. Updating UI templates dropdown`);
  updateUITemplatesFile(templateName, displayName);

  // 6. Update src/app/experts/[expertId]/page.tsx (public page rendering)
  console.log(`\n6. Updating expert page`);
  updateExpertPage(templateName);

  // 7. Update src/components/landing-page/editor/templateSections.tsx (editor preview)
  console.log(`\n7. Updating editor template sections`);
  updateTemplateSections(templateName);

  console.log(`
Done! Template '${templateName}' created.

Next steps:
1. Edit src/templates/${templateName}/sections/*.tsx to customize the look
2. Update descriptions in registry.ts and src/components/landing-page/templates/index.ts
3. Test in the landing page editor (template dropdown)
`);
}

main();
