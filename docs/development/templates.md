# Landing Page Templates

This guide covers how to create, customize, and delete landing page templates for expert pages.

---

## Overview

Templates control the visual appearance of expert landing pages. Each template consists of:
- 9 section components (Hero, ValueProps, About, Courses, Webinars, PhotoGallery, Blog, Act, Footer)
- Consistent styling across all sections
- Support for the theme system (brand colors, fonts)

**Available Templates:**
- `classic` - Clean, professional layout with centered content (protected)
- `modern` - Bold, dark theme with split layouts and gradient accents (protected)
- `classic-dark` - Classic layout with a sleek dark theme

---

## Creating a New Template

### Using the Script (Recommended)

```bash
# Create from classic template (default)
npx tsx scripts/create-template.ts my-new-template

# Create from a specific base template
npx tsx scripts/create-template.ts my-new-template --base=modern
```

The script automatically:
1. Copies the base template directory to `src/templates/<name>/`
2. Updates `src/templates/types.ts` (TemplateId type)
3. Updates `src/templates/registry.ts` (lazy loading)
4. Updates `src/types/index.ts` (LandingPageTemplate type)
5. Updates `src/components/landing-page/templates/index.ts` (UI dropdown)
6. Updates `src/app/experts/[expertId]/page.tsx` (public page rendering)
7. Updates `src/components/landing-page/editor/templateSections.tsx` (editor preview)

### After Creating

1. **Customize sections** - Edit files in `src/templates/<name>/sections/*.tsx`
2. **Update description** - Edit `src/templates/registry.ts` and `src/components/landing-page/templates/index.ts`
3. **Test in editor** - Switch templates in the landing page editor dropdown

---

## Deleting a Template

### Interactive Mode (Recommended)

```bash
npx tsx scripts/delete-template.ts
```

Shows a numbered list of deletable templates:
```
Available templates to delete:

  1. classic-dark
  2. elegant-serif
  0. Cancel

Enter number to delete: 1
Are you sure you want to delete 'classic-dark'? (y/N): y
```

### Direct Mode

```bash
npx tsx scripts/delete-template.ts classic-dark
```

**Note:** Core templates (`classic` and `modern`) are protected and cannot be deleted.

---

## Customizing a Template

### Color Scheme

Each section uses CSS variables for theming:
- `var(--brand-500)` - Primary brand color
- `var(--brand-400)` - Lighter accent
- `var(--brand-600)` - Darker accent
- `var(--brand-500-contrast)` - Text color on brand background

For dark themes, use direct colors:
- Background: `#0f0f0f` (main), `#1a1a1a` (alternate), `#1f1f1f` (cards)
- Text: `#ffffff` (headings), `#a0a0a0` (body), `#666666` (muted)
- Borders: `#333333`

### Section Files

Each template has 9 section files in `src/templates/<name>/sections/`:

| File | Purpose |
|------|---------|
| `HeroSection.tsx` | Main banner with headline, CTA, stats |
| `ValuePropsSection.tsx` | Benefits/features grid or paragraph |
| `AboutSection.tsx` | Expert bio with video or image |
| `CoursesSection.tsx` | Course cards grid |
| `WebinarsSection.tsx` | Webinar listings |
| `PhotoGallerySection.tsx` | Image gallery with lightbox |
| `BlogSection.tsx` | Latest blog post preview |
| `ActSection.tsx` | Call-to-action section |
| `FooterSection.tsx` | Footer with social/legal links |

### Example: Creating a Dark Theme

1. Change outer wrapper backgrounds from `#fff` to `#0f0f0f`
2. Change section backgrounds to alternate between `#0f0f0f` and `#1a1a1a`
3. Change card backgrounds to `#1f1f1f`
4. Change text colors: headings to `#ffffff`, body to `#a0a0a0`
5. Change borders to `#333`
6. Increase shadow opacity (e.g., `rgba(0,0,0,0.4)`)

---

## Template Architecture

### File Structure

```
src/templates/
├── registry.ts              # Template registration & lazy loading
├── types.ts                 # Shared type definitions
├── shared/                  # Reusable components
│   ├── constants.ts         # SECTION_MAX_WIDTH, container styles
│   ├── ResponsiveStyles.tsx # Mobile/desktop breakpoint CSS
│   ├── UnsplashAttribution.tsx
│   └── SocialIcons.tsx
├── classic/
│   ├── index.tsx            # Main template component
│   ├── sections/            # 9 section components
│   └── pages/               # Detail/list page components
└── modern/
    ├── index.tsx
    ├── sections/
    └── pages/
```

### Registration Locations

When adding/removing templates, these files must be updated:

1. `src/templates/<name>/` - Template directory
2. `src/templates/types.ts` - `TemplateId` type union
3. `src/templates/registry.ts` - Lazy loading registry
4. `src/types/index.ts` - `LandingPageTemplate` type union
5. `src/components/landing-page/templates/index.ts` - UI dropdown array
6. `src/app/experts/[expertId]/page.tsx` - Dynamic imports + switch case
7. `src/components/landing-page/editor/templateSections.tsx` - Section imports + registry

The create/delete scripts handle all of these automatically.

---

## AI-Assisted Template Creation

When working with Claude to create templates:

1. **Describe the visual style** clearly:
   > "Make elegant-serif feel premium and editorial - serif fonts for headings, muted earth tones, generous whitespace"

2. **Reference specific sections** if needed:
   > "Update the HeroSection to have a gradient background from dark blue to purple"

3. **Specify color palettes**:
   > "Use a warm palette: backgrounds #faf7f2, text #2d2d2d, accents in terracotta #c4704a"

---

## Troubleshooting

### Template not appearing in dropdown
- Check all 7 registration locations are updated
- Restart dev server after changes
- Hard refresh browser (Cmd+Shift+R)

### Template shows but looks like another template
- Verify the section imports in `templateSections.tsx` point to correct template
- Check the `page.tsx` switch statement returns the correct component

### Styles not applying
- Check CSS variable references match theme system
- Verify inline styles are not overridden by global CSS
- For dark themes, ensure wrapper divs have dark backgrounds

---

**Last Updated:** December 2024
