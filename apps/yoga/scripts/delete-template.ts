#!/usr/bin/env npx tsx
/**
 * Template Delete Script
 *
 * Removes a landing page template and cleans up all references.
 *
 * Usage:
 *   npx tsx scripts/delete-template.ts [template-name]
 *
 * If no template name is provided, shows an interactive list to choose from.
 *
 * Examples:
 *   npx tsx scripts/delete-template.ts              # Interactive mode
 *   npx tsx scripts/delete-template.ts classic-dark # Direct mode
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const TEMPLATES_DIR = path.join(__dirname, '../src/templates');
const PROTECTED_TEMPLATES = ['classic', 'modern'];
const IGNORED_ENTRIES = ['shared', 'types.ts', 'registry.ts'];

function getAvailableTemplates(): string[] {
  const entries = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && !IGNORED_ENTRIES.includes(entry.name))
    .map(entry => entry.name)
    .filter(name => !PROTECTED_TEMPLATES.includes(name));
}

function promptForTemplate(templates: string[]): Promise<string | null> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\nAvailable templates to delete:\n');
    templates.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t}`);
    });
    console.log(`  0. Cancel\n`);

    rl.question('Enter number to delete: ', answer => {
      rl.close();
      const num = parseInt(answer, 10);
      if (num === 0 || isNaN(num) || num < 0 || num > templates.length) {
        resolve(null);
      } else {
        resolve(templates[num - 1]);
      }
    });
  });
}

function confirmDeletion(templateName: string): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`\nAre you sure you want to delete '${templateName}'? (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function deleteDirRecursive(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath, { withFileTypes: true }).forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        deleteDirRecursive(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

function updateTemplatesTypesFile(templateId: string): void {
  const typesPath = path.join(TEMPLATES_DIR, 'types.ts');
  let content = fs.readFileSync(typesPath, 'utf-8');

  // Remove from TemplateId type
  const patterns = [
    new RegExp(`\\s*\\|\\s*'${templateId}'`, 'g'),
    new RegExp(`'${templateId}'\\s*\\|\\s*`, 'g'),
  ];

  for (const pattern of patterns) {
    content = content.replace(pattern, '');
  }

  fs.writeFileSync(typesPath, content);
  console.log(`  Updated src/templates/types.ts`);
}

function updateRegistryFile(templateId: string): void {
  const registryPath = path.join(TEMPLATES_DIR, 'registry.ts');
  let content = fs.readFileSync(registryPath, 'utf-8');

  const pascalName = toPascalCase(templateId);

  // 1. Remove from Promise.all destructuring
  content = content.replace(
    new RegExp(`,\\s*\\{\\s*default:\\s*${pascalName}Template\\s*\\}`, 'g'),
    ''
  );

  // 2. Remove from Promise.all imports
  content = content.replace(new RegExp(`,\\s*import\\('\\.\\/${templateId}'\\)`, 'g'), '');

  // 3. Remove templateRegistry.set() block
  const setRegex = new RegExp(
    `\\n\\s*templateRegistry\\.set\\('${templateId}',\\s*\\{[^}]+\\}\\);`,
    'g'
  );
  content = content.replace(setRegex, '');

  // 4. Remove from getTemplateIds() array
  content = content.replace(new RegExp(`,\\s*'${templateId}'`, 'g'), '');
  content = content.replace(new RegExp(`'${templateId}',\\s*`, 'g'), '');

  fs.writeFileSync(registryPath, content);
  console.log(`  Updated src/templates/registry.ts`);
}

function updateMainTypesFile(templateId: string): void {
  const typesPath = path.join(__dirname, '../src/types/index.ts');
  let content = fs.readFileSync(typesPath, 'utf-8');

  // Remove from LandingPageTemplate type
  const patterns = [
    new RegExp(`\\s*\\|\\s*'${templateId}'`, 'g'),
    new RegExp(`'${templateId}'\\s*\\|\\s*`, 'g'),
  ];

  for (const pattern of patterns) {
    content = content.replace(pattern, '');
  }

  fs.writeFileSync(typesPath, content);
  console.log(`  Updated src/types/index.ts`);
}

function updateUITemplatesFile(templateId: string): void {
  const uiTemplatesPath = path.join(__dirname, '../src/components/landing-page/templates/index.ts');
  let content = fs.readFileSync(uiTemplatesPath, 'utf-8');

  // Remove template entry from array
  const entryRegex = new RegExp(`\\s*\\{\\s*id:\\s*'${templateId}',[^}]+\\},?`, 'g');
  content = content.replace(entryRegex, '');

  // Clean up any trailing commas before ]
  content = content.replace(/,(\s*)\]/g, '$1]');

  fs.writeFileSync(uiTemplatesPath, content);
  console.log(`  Updated src/components/landing-page/templates/index.ts`);
}

function updateExpertPage(templateId: string): void {
  const pagePath = path.join(__dirname, '../src/app/experts/[expertId]/page.tsx');
  let content = fs.readFileSync(pagePath, 'utf-8');

  const pascalName = toPascalCase(templateId);

  // 1. Remove dynamic import
  const importRegex = new RegExp(`const ${pascalName}Template = dynamic\\([^;]+;\\n?`, 'g');
  content = content.replace(importRegex, '');

  // 2. Remove case from switch statement
  const caseRegex = new RegExp(`\\s*case '${templateId}':\\s*return ${pascalName}Template;`, 'g');
  content = content.replace(caseRegex, '');

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

  // 1. Remove import block (all 9 section imports)
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

  for (const sectionType of sectionTypes) {
    const importRegex = new RegExp(
      `import ${pascalName}${sectionType} from '@/templates/${templateId}/sections/${sectionType}';\\n?`,
      'g'
    );
    content = content.replace(importRegex, '');
  }

  // Also remove the comment line
  content = content.replace(
    new RegExp(
      `// Import ${pascalName.replace(/([A-Z])/g, ' $1').trim()} template sections\\n`,
      'g'
    ),
    ''
  );

  // 2. Remove section map const
  const mapRegex = new RegExp(`const ${camelName}Sections = \\{[^}]+\\};\\n\\n?`, 'g');
  content = content.replace(mapRegex, '');

  // 3. Remove from templateSections registry
  content = content.replace(new RegExp(`\\s*'${templateId}':\\s*${camelName}Sections,?`, 'g'), '');

  // Clean up any trailing commas before }
  content = content.replace(/,(\s*)\};/g, '$1};');

  fs.writeFileSync(sectionsPath, content);
  console.log(`  Updated src/components/landing-page/editor/templateSections.tsx`);
}

function deleteTemplate(templateName: string): void {
  const templatePath = path.join(TEMPLATES_DIR, templateName);

  console.log(`\nDeleting template '${templateName}'...\n`);

  // 1. Delete template directory
  console.log(`1. Deleting template directory`);
  deleteDirRecursive(templatePath);
  console.log(`  Deleted src/templates/${templateName}/`);

  // 2. Update src/templates/types.ts
  console.log(`\n2. Updating src/templates/types.ts`);
  updateTemplatesTypesFile(templateName);

  // 3. Update src/templates/registry.ts
  console.log(`\n3. Updating src/templates/registry.ts`);
  updateRegistryFile(templateName);

  // 4. Update src/types/index.ts
  console.log(`\n4. Updating src/types/index.ts`);
  updateMainTypesFile(templateName);

  // 5. Update src/components/landing-page/templates/index.ts
  console.log(`\n5. Updating UI templates dropdown`);
  updateUITemplatesFile(templateName);

  // 6. Update src/app/experts/[expertId]/page.tsx
  console.log(`\n6. Updating expert page`);
  updateExpertPage(templateName);

  // 7. Update src/components/landing-page/editor/templateSections.tsx
  console.log(`\n7. Updating editor template sections`);
  updateTemplateSections(templateName);

  console.log(`
Done! Template '${templateName}' has been deleted.

Note: Any experts using this template will fall back to 'classic'.
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Show help
  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npx tsx scripts/delete-template.ts [template-name]

If no template name is provided, shows an interactive list to choose from.

Arguments:
  template-name   Name of the template to delete (e.g., 'classic-dark')

Examples:
  npx tsx scripts/delete-template.ts              # Interactive mode
  npx tsx scripts/delete-template.ts classic-dark # Direct mode

Warning: This will permanently delete the template directory and all references.
`);
    process.exit(0);
  }

  let templateName: string;

  if (args.length === 0) {
    // Interactive mode
    const templates = getAvailableTemplates();

    if (templates.length === 0) {
      console.log('\nNo deletable templates found.');
      console.log('(Core templates "classic" and "modern" are protected)\n');
      process.exit(0);
    }

    const selected = await promptForTemplate(templates);
    if (!selected) {
      console.log('\nCancelled.\n');
      process.exit(0);
    }

    const confirmed = await confirmDeletion(selected);
    if (!confirmed) {
      console.log('\nCancelled.\n');
      process.exit(0);
    }

    templateName = selected;
  } else {
    // Direct mode
    templateName = args[0];

    // Prevent deleting core templates
    if (PROTECTED_TEMPLATES.includes(templateName)) {
      console.error(`Error: Cannot delete core template '${templateName}'`);
      process.exit(1);
    }

    const templatePath = path.join(TEMPLATES_DIR, templateName);
    if (!fs.existsSync(templatePath)) {
      console.error(`Error: Template '${templateName}' not found at ${templatePath}`);
      process.exit(1);
    }
  }

  deleteTemplate(templateName);
}

main();
