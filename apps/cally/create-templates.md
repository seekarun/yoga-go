# Creating Landing Page Templates

Guide for creating new landing page templates for the Cally app.

## Architecture Overview

There are **two approaches** for building templates:

### Approach 1: SectionsRenderer (Standard)

The template is a **hero-only** React component. All other sections (about, features, products, testimonials, FAQ, location, gallery, footer) are rendered by the shared `SectionsRenderer` component. Templates only control:

1. The hero section visual design
2. The `variant` prop passed to `SectionsRenderer` (`"light"`, `"dark"`, or `"gray"`)

This is the simplest approach. Use it when sections should render in a standard full-width stacked layout.

**Templates using this approach**: Centered, Left Aligned, Split, Minimal, Bold

### Approach 2: Custom Layout (Recommended for structurally unique templates)

The template **bypasses SectionsRenderer** and renders section components directly, wrapping them in a custom layout (e.g., tile grid, masonry, cards). This gives full control over:

1. How sections are arranged (grid, columns, cards, etc.)
2. Per-section wrapping (tiles, cards, borders, shadows)
3. Which sections span full width vs. share columns
4. Page-level background and spacing
5. Footer placement

The template must destructure all props from `HeroTemplateProps` and pass them to the individual section components. It must also handle the `config.sections` array for ordering and `enabled` filtering.

**Templates using this approach**: Apple (tile grid layout), Bayside (split hero, editorial sections), Therapist (centered blurred hero, circle portrait, organic shapes), Parallax (fixed bg hero, parallax dividers, scroll-driven depth), Animated (scroll-triggered fade-in animations)

## Files to Modify When Adding a Template

1. **`src/types/landing-page.ts`**
   - Add new ID to the `TemplateId` union type
   - Add entry to the `TEMPLATES` array with `id`, `name`, `description`, `imageConfig`

2. **`src/templates/hero/<TemplateName>Template.tsx`** (new file)
   - The actual React component

3. **`src/templates/hero/index.tsx`**
   - Import the new component
   - Add to `TEMPLATE_COMPONENTS` record
   - Add to re-exports

That's it. The editor picks up templates dynamically from the `TEMPLATES` array and `TemplateId` type.

## Template Component Structure

### Standard Template (Approach 1: SectionsRenderer)

```tsx
"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";

export default function MyTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
  } = props;
  const { title, subtitle, backgroundImage, imagePosition, imageZoom, button } =
    config;

  // 1. Define styles (containerStyle, backgroundStyle, contentStyle, titleStyle, etc.)
  // 2. Render hero section (guarded by config.heroEnabled !== false)
  // 3. Render SectionsRenderer with variant prop

  return (
    <>
      {config.heroEnabled !== false && (
        <div style={containerStyle}>
          <div style={backgroundStyle} />
          {isEditing && (
            <style>{/* editable field focus/hover styles */}</style>
          )}
          <div style={contentStyle}>
            {isEditing
              ? {
                  /* contentEditable divs with onBlur handlers + edit button with pencil badge */
                }
              : {
                  /* <h1>, <p>, <button> */
                }}
          </div>
        </div>
      )}
      <SectionsRenderer {...props} variant="light" />
    </>
  );
}
```

### Custom Layout Template (Approach 2: Direct Section Rendering)

See `AppleTemplate.tsx` for a full reference implementation. Key differences:

```tsx
"use client";

import type { HeroTemplateProps } from "./types";
// Import section components directly (NO SectionsRenderer)
import AboutSection from "./AboutSection";
import FeaturesSection from "./FeaturesSection";
// ... other section imports
import FooterSection from "./FooterSection";

export default function MyCustomTemplate(props: HeroTemplateProps) {
  // Destructure ALL props (not just hero ones)
  const { config, isEditing, products, currency, address,
    onAboutParagraphChange, onFeaturesHeadingChange, /* ...all callbacks */ } = props;

  // Handle section ordering from config
  const sections = config.sections || [/* defaults */];

  // Build section elements with custom wrappers
  const sectionElements = sections.filter(s => s.enabled).map(section => {
    switch (section.id) {
      case "about":
        return config.about ? (
          <div key="about" className="my-tile" style={tileStyle}>
            <AboutSection about={config.about} isEditing={isEditing} variant="light"
              onParagraphChange={onAboutParagraphChange} />
          </div>
        ) : null;
      // ... other cases
    }
  }).filter(Boolean);

  return (
    <div style={pageStyle}>
      {/* Hero */}
      {config.heroEnabled !== false && (/* hero markup */)}

      {/* Custom layout for sections */}
      <div className="my-grid">{sectionElements}</div>

      {/* Footer outside custom layout */}
      {config.footerEnabled !== false && config.footer && (
        <FooterSection footer={config.footer} isEditing={isEditing} /* ...callbacks */ />
      )}
    </div>
  );
}
```

**Important for custom layouts:**

- Must iterate `config.sections` in order and filter by `enabled` (respects reordering/toggling)
- Must pass all relevant props to each section component
- Footer is always rendered outside the custom layout, controlled by `config.footerEnabled`
- Use `variant="light"` when sections sit on white card backgrounds

## Styling Rules

### Inline Styles Only

- All templates use `React.CSSProperties` (inline styles). No CSS files or modules.
- Use `clamp()` for responsive typography: `fontSize: "clamp(min, preferred, max)"`

### Brand Color CSS Variables

Available via `LandingPageThemeProvider`:

- `--brand-50` through `--brand-950` (11 shades of the primary colour)
- `--brand-500-contrast` (auto white/dark text for brand-500 background)
- `--brand-600-contrast` (auto white/dark text for brand-600 background)
- `--brand-secondary` (harmony-based secondary colour — soft, suited for section backgrounds)
- `--brand-highlight` (harmony-based accent colour — suited for headings and decorative elements)

**Use the full palette, not just brand-500.** Templates should leverage multiple palette colours to create a cohesive, branded look:

| Variable                      | Suggested Usage                              |
| ----------------------------- | -------------------------------------------- |
| `--brand-500`                 | Primary CTA buttons, main accent             |
| `--brand-600`                 | Hover states for primary CTA                 |
| `--brand-50` / `--brand-100`  | Subtle tinted backgrounds, badges            |
| `--brand-200` / `--brand-300` | Borders, dividers, hover highlights          |
| `--brand-secondary`           | Section backgrounds (alternating with white) |
| `--brand-highlight`           | Section headings, decorative text            |
| `--brand-800` / `--brand-900` | Dark text on brand-tinted backgrounds        |

Example: `backgroundColor: "var(--brand-secondary, #fafafa)"`, `color: "var(--brand-highlight, #1a1a1a)"`

### Background Image Handling

Templates MUST support:

- **With image**: Apply overlay gradient + `url(backgroundImage)`, respect `imagePosition` and `imageZoom`
- **Without image**: Use a solid color or CSS gradient fallback

Standard pattern:

```tsx
const backgroundStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundColor: hasImage ? "#000" : "#fallback",
  backgroundImage: hasImage
    ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${backgroundImage})`
    : `linear-gradient(...)`, // or undefined for solid color
  backgroundPosition: imagePosition || "50% 50%",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  transform: hasImage ? `scale(${(imageZoom || 100) / 100})` : undefined,
  zIndex: 0,
};
```

### Edit Mode Support

Every template MUST support `isEditing` mode:

- Title and subtitle become `contentEditable` divs with `suppressContentEditableWarning`
- Use `onBlur` to call `onTitleChange` / `onSubtitleChange`
- Add CSS classes for focus/hover states (`editable-field-light` for dark backgrounds, `editable-field-dark` for light backgrounds)
- Button gets a blue pencil badge (24px circle, absolute positioned top-right)

### Section Variant

Choose the variant that contrasts with your hero:

- `"light"` - For templates with light hero backgrounds (sections get alternating light/gray)
- `"dark"` - For templates with dark hero backgrounds
- `"gray"` - For templates with gradient/colored hero backgrounds

## Existing Templates Reference

| Template     | Hero Background                 | Text Color             | Variant | Key Feature                                                                                               |
| ------------ | ------------------------------- | ---------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| Centered     | Gradient/image overlay          | White                  | gray    | Classic centered, gradient fallback                                                                       |
| Left Aligned | Dark gradient (#1a1a2e)         | White                  | dark    | Left-aligned, accent line                                                                                 |
| Split        | Two halves (light+image)        | Dark left, white right | light   | Side-by-side layout                                                                                       |
| Minimal      | White with subtle image wash    | Dark (#1a1a1a)         | light   | Divider between title/subtitle                                                                            |
| Bold         | Black (#000) with heavy overlay | White                  | dark    | Huge uppercase text, 900 weight                                                                           |
| Apple        | Off-white (#fbfbfd) / image     | Dark (#1d1d1f) / white | light   | **Custom layout**: tile grid, compact 70vh hero, #f5f5f7 page bg                                          |
| Bayside      | Off-white (#FAF9F6) split       | Dark (#1a1a1a)         | light   | **Custom layout**: split hero, Playfair Display serif, boutique luxury                                    |
| Therapist    | Blurred image / soft gradient   | White / Dark           | light   | **Custom layout**: centered blurred hero, Lora serif, circle portrait, organic blob, soft shadows         |
| Parallax     | Fixed bg image / dark gradient  | White                  | light   | **Custom layout**: full-screen fixed bg hero, parallax dividers, Playfair Display serif, scroll indicator |
| Animated     | Gradient/image overlay          | White                  | light   | **Custom layout**: scroll-triggered fade-in animations, Inter sans-serif, staggered card reveals          |

## Section Components Reference

All section components live in `src/templates/hero/`. Each accepts `isEditing`, `variant` (`"light" | "dark" | "gray"`), and edit callbacks.

### AboutSection

**File**: `AboutSection.tsx`
**Config key**: `config.about` (`AboutConfig`)
**Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paragraph` | `string` | Yes | Main about text |
| `image` | `string` | No | Image URL |
| `imagePosition` | `string` | No | CSS background-position (e.g. `"50% 50%"`) |
| `imageZoom` | `number` | No | Zoom percentage (100 = no zoom) |

**Edit callbacks**: `onParagraphChange(paragraph)`, `onImageClick()`

---

### FeaturesSection

**File**: `FeaturesSection.tsx`
**Config key**: `config.features` (`FeaturesConfig`)
**Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `heading` | `string` | No | Section heading |
| `subheading` | `string` | No | Section subheading |
| `cards` | `FeatureCard[]` | Yes | Array of feature cards |

**FeatureCard**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique card ID |
| `title` | `string` | Yes | Card title |
| `description` | `string` | Yes | Card description |
| `image` | `string` | No | Card image URL |
| `imagePosition` | `string` | No | CSS background-position |
| `imageZoom` | `number` | No | Zoom percentage |

**Edit callbacks**: `onHeadingChange(heading)`, `onSubheadingChange(subheading)`, `onCardChange(cardId, field, value)`, `onCardImageClick(cardId)`, `onAddCard()`, `onRemoveCard(cardId)`

---

### ProductsSection

**File**: `ProductsSection.tsx`
**Data source**: `products` prop (`Product[]`) — passed directly, not from `config`
**Additional props**: `currency` (`string`, e.g. `"AUD"`)
**Data** (`Product`):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Product ID |
| `name` | `string` | Yes | Product name |
| `description` | `string` | No | Product description |
| `image` | `string` | No | Product image URL |
| `imagePosition` | `string` | No | CSS background-position |
| `imageZoom` | `number` | No | Zoom percentage |
| `price` | `number` | Yes | Price in cents |
| `durationMinutes` | `number` | Yes | Session duration |

**Edit callbacks**: `onBookProduct(productId)`

---

### TestimonialsSection

**File**: `TestimonialsSection.tsx`
**Config key**: `config.testimonials` (`TestimonialsConfig`)
**Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `heading` | `string` | No | Section heading |
| `subheading` | `string` | No | Section subheading |
| `testimonials` | `Testimonial[]` | Yes | Array of testimonials |

**Testimonial**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique testimonial ID |
| `quote` | `string` | Yes | Testimonial text |
| `authorName` | `string` | Yes | Author's name |
| `authorTitle` | `string` | No | Author's title/role |
| `rating` | `number` | No | Star rating (1-5) |

**Edit callbacks**: `onHeadingChange(heading)`, `onSubheadingChange(subheading)`, `onTestimonialChange(testimonialId, field, value)`, `onAddTestimonial()`, `onRemoveTestimonial(testimonialId)`

---

### FAQSection

**File**: `FAQSection.tsx`
**Config key**: `config.faq` (`FAQConfig`)
**Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `heading` | `string` | No | Section heading |
| `subheading` | `string` | No | Section subheading |
| `items` | `FAQItem[]` | Yes | Array of FAQ items |

**FAQItem**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique item ID |
| `question` | `string` | Yes | Question text |
| `answer` | `string` | Yes | Answer text |

**Edit callbacks**: `onHeadingChange(heading)`, `onSubheadingChange(subheading)`, `onItemChange(itemId, field, value)`, `onAddItem()`, `onRemoveItem(itemId)`

---

### LocationSection

**File**: `LocationSection.tsx`
**Config key**: `config.location` (`LocationConfig`)
**Additional props**: `address` (`string`) — passed directly, not from config
**Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `heading` | `string` | No | Section heading |
| `subheading` | `string` | No | Section subheading |

**Edit callbacks**: `onHeadingChange(heading)`, `onSubheadingChange(subheading)`

---

### GallerySection

**File**: `GallerySection.tsx`
**Config key**: `config.gallery` (`GalleryConfig`)
**Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `heading` | `string` | No | Section heading |
| `subheading` | `string` | No | Section subheading |
| `images` | `GalleryImage[]` | Yes | Array of gallery images |

**GalleryImage**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique image ID |
| `url` | `string` | Yes | Image URL |
| `caption` | `string` | No | Image caption |

**Edit callbacks**: `onHeadingChange(heading)`, `onSubheadingChange(subheading)`, `onAddImage()`, `onRemoveImage(imageId)`

---

### FooterSection

**File**: `FooterSection.tsx`
**Config key**: `config.footer` (`FooterConfig`)
**Controlled by**: `config.footerEnabled` (rendered outside `config.sections` ordering)
**Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | No | Footer text / copyright |
| `links` | `FooterLink[]` | No | Array of footer links |
| `showPoweredBy` | `boolean` | No | Show "Powered by" badge |

**FooterLink**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | `string` | Yes | Link display text |
| `url` | `string` | Yes | Link URL |

**Edit callbacks**: `onTextChange(text)`, `onLinkChange(index, field, value)`, `onAddLink()`, `onRemoveLink(index)`

---

### Section Ordering

Sections are ordered via `config.sections` array (`SectionConfig[]`):

```typescript
interface SectionConfig {
  id:
    | "about"
    | "features"
    | "products"
    | "testimonials"
    | "faq"
    | "location"
    | "gallery";
  enabled: boolean;
}
```

The footer is **not** part of this array — it's always rendered last, controlled by `config.footerEnabled`.

## Data Usage & Opt-Out

Templates do **not** need to use all data available for a section. A template can intentionally ignore certain fields to match its design philosophy. When a template ignores a field:

- The data is simply not rendered — it still exists in the config but has no visual effect
- The corresponding editor controls (e.g., image edit button) should be hidden in the preview since the tenant can't see the result
- This is a **valid design choice**, not a bug

**Example**: The Minimal template ignores the hero background image entirely — it renders a clean white background instead. The image edit button is hidden in the editor preview because changing the image would have no visible effect.

When building a template, decide which data fields serve your design and only render those. Document any intentionally ignored fields in the template's JSDoc comment.

## Dos

- Always guard hero render with `config.heroEnabled !== false`
- Always include both edit mode and display mode rendering
- Use `clamp()` for font sizes to ensure mobile responsiveness
- Include the blue pencil badge on the button in edit mode (copy from existing template)
- Include `<style>` tag for editable field focus/hover states (only when `isEditing`)
- Pass `{...props}` to `SectionsRenderer` so all section callbacks flow through
- Choose edit field class based on background contrast (`editable-field-light` vs `editable-field-dark`)
- Support both with-image and without-image states (text color, overlay, fallback bg)

## Don'ts

- Don't use external CSS files or CSS modules
- Don't import section components directly unless using Approach 2 (custom layout)
- Don't hardcode brand colors - use `var(--brand-*)` CSS variables for accents
- Don't forget `suppressContentEditableWarning` on contentEditable divs
- Don't use `class` components - all templates are functional
- Don't add new props to `HeroTemplateProps` - use only what's defined in `types.ts`
- Don't modify `SectionsRenderer` for template-specific styling

## Common Mistakes

1. **Forgetting to handle no-image state**: Every template must look good with AND without a background image. The text color and background must adapt.
2. **Missing edit mode**: All templates need full edit mode support with contentEditable fields and the pencil badge on the button.
3. **Wrong editable field class**: Use `editable-field-light` when background is dark (so focus outline is white), `editable-field-dark` when background is light.
4. **Not passing props to SectionsRenderer**: Must use `{...props}` spread, not just `config`.
5. **Forgetting the type registration**: Must update both the `TemplateId` type AND the `TEMPLATES` array AND the `TEMPLATE_COMPONENTS` record.
6. **Image zoom not applied**: Must include `transform: scale(${(imageZoom || 100) / 100})` when image is present.

## Testing Checklist

- [ ] Template shows in editor template picker
- [ ] Hero renders correctly without background image
- [ ] Hero renders correctly with background image
- [ ] Title and subtitle are editable in edit mode
- [ ] Button shows pencil badge in edit mode
- [ ] All sections render below hero (about, features, testimonials, etc.)
- [ ] Mobile responsive (test at 375px width)
- [ ] Brand color applies to button/accents
