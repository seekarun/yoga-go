"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMemo } from "react";
import type {
  SimpleLandingPageConfig,
  TemplateId,
  ButtonConfig,
  AboutConfig,
  FeaturesConfig,
  FeatureCard,
  TemplateImageConfig,
  TestimonialsConfig,
  Testimonial,
  FAQConfig,
  FAQItem,
  FooterConfig,
  LocationConfig,
  GalleryConfig,
  GalleryImage,
  SectionOrderItem,
  SEOConfig,
} from "@/types/landing-page";
import {
  TEMPLATES,
  DEFAULT_LANDING_PAGE_CONFIG,
  BUTTON_ACTIONS,
} from "@/types/landing-page";
import type { Product } from "@/types";
import { ImageEditorOverlay, ButtonEditorOverlay } from "@core/components";
import HeroTemplateRenderer from "@/templates/hero";
import SectionToolbar from "./SectionToolbar";
import type { ColorHarmonyType } from "@/lib/colorPalette";
import {
  generatePalette,
  getHarmonyColors,
  hexToHsl,
  isValidHexColor,
  HARMONY_OPTIONS,
} from "@/lib/colorPalette";
import { LandingPageThemeProvider } from "@/templates/hero/ThemeProvider";

interface SimpleLandingPageEditorProps {
  tenantId: string;
}

const AUTO_SAVE_DELAY = 1500;

export default function SimpleLandingPageEditor({
  tenantId,
}: SimpleLandingPageEditorProps) {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Publish state
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  // Editor state
  const [config, setConfig] = useState<SimpleLandingPageConfig>(
    DEFAULT_LANDING_PAGE_CONFIG,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showButtonEditor, setShowButtonEditor] = useState(false);
  const [showAboutImageEditor, setShowAboutImageEditor] = useState(false);
  const [showFeatureImageEditor, setShowFeatureImageEditor] = useState(false);
  const [editingFeatureCardId, setEditingFeatureCardId] = useState<
    string | null
  >(null);

  // Gallery image editor state
  const [showGalleryImageEditor, setShowGalleryImageEditor] = useState(false);

  // SEO panel state
  const [showSEOPanel, setShowSEOPanel] = useState(false);
  const [showSEOOgImageEditor, setShowSEOOgImageEditor] = useState(false);
  const [showSEOFaviconEditor, setShowSEOFaviconEditor] = useState(false);
  const seoPickerRef = useRef<HTMLDivElement>(null);

  // Products state (for preview in editor)
  const [products, setProducts] = useState<Product[]>([]);
  const [editorCurrency, setEditorCurrency] = useState("AUD");
  const [editorAddress, setEditorAddress] = useState("");

  // Brand colour picker state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hexInput, setHexInput] = useState("#667eea");
  const [hexError, setHexError] = useState(false);
  const [colorHarmony, setColorHarmony] =
    useState<ColorHarmonyType>("analogous");
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const currentBrandColor = config.theme?.primaryColor || "#667eea";

  // Get current template's image configuration
  const currentTemplateImageConfig: TemplateImageConfig = useMemo(() => {
    const template = TEMPLATES.find((t) => t.id === config.template);
    return template?.imageConfig || TEMPLATES[0].imageConfig;
  }, [config.template]);

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Close colour picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close SEO panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        seoPickerRef.current &&
        !seoPickerRef.current.contains(e.target as Node)
      ) {
        setShowSEOPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync hex input when brand color changes externally
  useEffect(() => {
    setHexInput(currentBrandColor);
  }, [currentBrandColor]);

  // Update palette when harmony changes
  useEffect(() => {
    if (config.theme?.primaryColor && config.theme?.palette) {
      const harmonyColors = getHarmonyColors(
        config.theme.primaryColor,
        colorHarmony,
      );
      if (
        config.theme.palette.secondary !== harmonyColors.secondary ||
        config.theme.palette.highlight !== harmonyColors.highlight
      ) {
        setConfig((prev) => ({
          ...prev,
          theme: {
            ...prev.theme,
            primaryColor: prev.theme?.primaryColor,
            palette: prev.theme?.palette
              ? {
                  ...prev.theme.palette,
                  secondary: harmonyColors.secondary,
                  highlight: harmonyColors.highlight,
                  harmonyType: colorHarmony,
                }
              : undefined,
          },
        }));
        setIsDirty(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when harmony changes
  }, [colorHarmony]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("[DBG][SimpleLandingPageEditor] Fetching tenant data");

        const response = await fetch("/api/data/app/tenant/landing-page");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load landing page data");
        }

        const tenantData = result.data;
        console.log(
          "[DBG][SimpleLandingPageEditor] Tenant data loaded:",
          tenantData.id,
        );

        setIsPublished(tenantData.isLandingPagePublished ?? false);

        // Check for unpublished changes
        const hasDraft = !!tenantData.draftLandingPage;
        const hasPublished = !!tenantData.customLandingPage;
        if (hasDraft && hasPublished) {
          const draftStr = JSON.stringify(tenantData.draftLandingPage);
          const publishedStr = JSON.stringify(tenantData.customLandingPage);
          setHasUnpublishedChanges(draftStr !== publishedStr);
        } else if (hasDraft && !hasPublished) {
          setHasUnpublishedChanges(true);
        } else {
          setHasUnpublishedChanges(false);
        }

        // Load config - prefer draft over published
        const landingPage =
          tenantData.draftLandingPage ||
          tenantData.customLandingPage ||
          DEFAULT_LANDING_PAGE_CONFIG;

        // Ensure we have a valid config structure (backward compat for new fields)
        const knownSectionIds = new Set([
          "about",
          "features",
          "products",
          "testimonials",
          "faq",
          "location",
          "gallery",
        ]);
        const loadedSections = landingPage.sections || [];
        // Validate sections — if they contain unrecognized IDs (old format), use defaults
        const hasValidSections =
          loadedSections.length > 0 &&
          loadedSections.every((s: SectionOrderItem) =>
            knownSectionIds.has(s.id),
          );
        let finalSections: SectionOrderItem[];
        if (hasValidSections) {
          // Ensure "about" and "products" are in sections array
          const hasAbout = loadedSections.some(
            (s: SectionOrderItem) => s.id === "about",
          );
          const hasProducts = loadedSections.some(
            (s: SectionOrderItem) => s.id === "products",
          );
          let patched = hasAbout
            ? loadedSections
            : [
                { id: "about" as const, enabled: !!landingPage.about },
                ...loadedSections,
              ];
          if (!hasProducts) {
            // Insert "products" after "features" (or at end of middle sections)
            const featIdx = patched.findIndex(
              (s: SectionOrderItem) => s.id === "features",
            );
            const insertAt = featIdx >= 0 ? featIdx + 1 : patched.length;
            patched = [
              ...patched.slice(0, insertAt),
              { id: "products" as const, enabled: false },
              ...patched.slice(insertAt),
            ];
          }
          // Ensure location and gallery exist
          const hasLocation = patched.some(
            (s: SectionOrderItem) => s.id === "location",
          );
          const hasGallery = patched.some(
            (s: SectionOrderItem) => s.id === "gallery",
          );
          if (!hasLocation) {
            patched = [...patched, { id: "location" as const, enabled: false }];
          }
          if (!hasGallery) {
            patched = [...patched, { id: "gallery" as const, enabled: false }];
          }
          finalSections = patched;
        } else {
          // Old format or missing — use defaults
          finalSections = DEFAULT_LANDING_PAGE_CONFIG.sections || [];
        }

        setConfig({
          template: landingPage.template || "centered",
          title: landingPage.title || "Welcome",
          subtitle: landingPage.subtitle || "Book a session with me",
          backgroundImage: landingPage.backgroundImage,
          imagePosition: landingPage.imagePosition || "50% 50%",
          imageZoom: landingPage.imageZoom || 100,
          button: landingPage.button || {
            label: "Book Now",
            action: "booking",
          },
          about: landingPage.about || DEFAULT_LANDING_PAGE_CONFIG.about,
          features:
            landingPage.features || DEFAULT_LANDING_PAGE_CONFIG.features,
          testimonials:
            landingPage.testimonials ||
            DEFAULT_LANDING_PAGE_CONFIG.testimonials,
          faq: landingPage.faq || DEFAULT_LANDING_PAGE_CONFIG.faq,
          location:
            landingPage.location || DEFAULT_LANDING_PAGE_CONFIG.location,
          gallery: landingPage.gallery || DEFAULT_LANDING_PAGE_CONFIG.gallery,
          footer: landingPage.footer || DEFAULT_LANDING_PAGE_CONFIG.footer,
          heroEnabled: landingPage.heroEnabled ?? true,
          footerEnabled: landingPage.footerEnabled ?? true,
          sections: finalSections,
          theme: landingPage.theme || undefined,
          seo: landingPage.seo || DEFAULT_LANDING_PAGE_CONFIG.seo,
        });

        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 100);
      } catch (err) {
        console.error(
          "[DBG][SimpleLandingPageEditor] Error loading tenant:",
          err,
        );
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Fetch products for preview
    const fetchProducts = async () => {
      try {
        const [productsRes, prefsRes] = await Promise.all([
          fetch("/api/data/app/products"),
          fetch("/api/data/app/preferences"),
        ]);
        const productsJson = await productsRes.json();
        const prefsJson = await prefsRes.json();
        if (productsJson.success && productsJson.data) {
          setProducts(productsJson.data.filter((p: Product) => p.isActive));
        }
        if (prefsJson.success && prefsJson.data?.currency) {
          setEditorCurrency(prefsJson.data.currency);
        }
        if (prefsJson.success && prefsJson.data?.address) {
          setEditorAddress(prefsJson.data.address);
        }
      } catch (err) {
        console.error(
          "[DBG][SimpleLandingPageEditor] Failed to fetch products:",
          err,
        );
      }
    };
    fetchProducts();
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (isInitialLoadRef.current || !isDirty || saving) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, isDirty]);

  // Saved indicator effect
  useEffect(() => {
    if (lastSaved) {
      setShowSavedIndicator(true);
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
      savedIndicatorTimeoutRef.current = setTimeout(() => {
        setShowSavedIndicator(false);
      }, 10000);
    }

    return () => {
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    };
  }, [lastSaved]);

  // Handle title change (from inline editing)
  const handleTitleChange = useCallback((title: string) => {
    setConfig((prev) => ({ ...prev, title }));
    setIsDirty(true);
  }, []);

  // Handle subtitle change (from inline editing)
  const handleSubtitleChange = useCallback((subtitle: string) => {
    setConfig((prev) => ({ ...prev, subtitle }));
    setIsDirty(true);
  }, []);

  // Handle template change
  const handleTemplateChange = useCallback((template: TemplateId) => {
    setConfig((prev) => ({ ...prev, template }));
    setIsDirty(true);
    setShowTemplatePicker(false);
  }, []);

  // Handle image change from ImageEditorOverlay
  const handleImageChange = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      setConfig((prev) => ({
        ...prev,
        backgroundImage: data.imageUrl || undefined,
        imagePosition: data.imagePosition,
        imageZoom: data.imageZoom,
      }));
      setIsDirty(true);
    },
    [],
  );

  // Handle button change from ButtonEditorOverlay
  const handleButtonChange = useCallback((buttonConfig: ButtonConfig) => {
    setConfig((prev) => ({
      ...prev,
      button: buttonConfig,
    }));
    setIsDirty(true);
  }, []);

  // Handle about paragraph change
  const handleAboutParagraphChange = useCallback((paragraph: string) => {
    setConfig((prev) => ({
      ...prev,
      about: {
        ...prev.about,
        paragraph,
      } as AboutConfig,
    }));
    setIsDirty(true);
  }, []);

  // Handle about image change from ImageEditorOverlay
  const handleAboutImageChange = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      setConfig((prev) => ({
        ...prev,
        about: {
          ...prev.about,
          image: data.imageUrl || undefined,
          imagePosition: data.imagePosition,
          imageZoom: data.imageZoom,
        } as AboutConfig,
      }));
      setIsDirty(true);
    },
    [],
  );

  // Handle features heading change
  const handleFeaturesHeadingChange = useCallback((heading: string) => {
    setConfig((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        heading,
        cards: prev.features?.cards || [],
      } as FeaturesConfig,
    }));
    setIsDirty(true);
  }, []);

  // Handle features subheading change
  const handleFeaturesSubheadingChange = useCallback((subheading: string) => {
    setConfig((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        subheading,
        cards: prev.features?.cards || [],
      } as FeaturesConfig,
    }));
    setIsDirty(true);
  }, []);

  // Handle feature card change (title or description)
  const handleFeatureCardChange = useCallback(
    (cardId: string, field: "title" | "description", value: string) => {
      setConfig((prev) => ({
        ...prev,
        features: {
          ...prev.features,
          cards: (prev.features?.cards || []).map((card) =>
            card.id === cardId ? { ...card, [field]: value } : card,
          ),
        } as FeaturesConfig,
      }));
      setIsDirty(true);
    },
    [],
  );

  // Handle feature card image click
  const handleFeatureCardImageClick = useCallback((cardId: string) => {
    setEditingFeatureCardId(cardId);
    setShowFeatureImageEditor(true);
  }, []);

  // Handle feature card image change from ImageEditorOverlay
  const handleFeatureImageChange = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      if (!editingFeatureCardId) return;
      setConfig((prev) => ({
        ...prev,
        features: {
          ...prev.features,
          cards: (prev.features?.cards || []).map((card) =>
            card.id === editingFeatureCardId
              ? {
                  ...card,
                  image: data.imageUrl || undefined,
                  imagePosition: data.imagePosition,
                  imageZoom: data.imageZoom,
                }
              : card,
          ),
        } as FeaturesConfig,
      }));
      setIsDirty(true);
      setEditingFeatureCardId(null);
    },
    [editingFeatureCardId],
  );

  // Handle add feature card
  const handleAddFeatureCard = useCallback(() => {
    const newCard: FeatureCard = {
      id: `feature-${Date.now()}`,
      title: "New Feature",
      description: "Describe this feature or offering here.",
    };
    setConfig((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        cards: [...(prev.features?.cards || []), newCard],
      } as FeaturesConfig,
    }));
    setIsDirty(true);
  }, []);

  // Handle remove feature card
  const handleRemoveFeatureCard = useCallback((cardId: string) => {
    setConfig((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        cards: (prev.features?.cards || []).filter(
          (card) => card.id !== cardId,
        ),
      } as FeaturesConfig,
    }));
    setIsDirty(true);
  }, []);

  // --- Testimonials handlers ---
  const handleTestimonialsHeadingChange = useCallback((heading: string) => {
    setConfig((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        heading,
        testimonials: prev.testimonials?.testimonials || [],
      } as TestimonialsConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleTestimonialsSubheadingChange = useCallback(
    (subheading: string) => {
      setConfig((prev) => ({
        ...prev,
        testimonials: {
          ...prev.testimonials,
          subheading,
          testimonials: prev.testimonials?.testimonials || [],
        } as TestimonialsConfig,
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleTestimonialChange = useCallback(
    (
      testimonialId: string,
      field: "quote" | "authorName" | "authorTitle",
      value: string,
    ) => {
      setConfig((prev) => ({
        ...prev,
        testimonials: {
          ...prev.testimonials,
          testimonials: (prev.testimonials?.testimonials || []).map((t) =>
            t.id === testimonialId ? { ...t, [field]: value } : t,
          ),
        } as TestimonialsConfig,
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleAddTestimonial = useCallback(() => {
    const newTestimonial: Testimonial = {
      id: `testimonial-${Date.now()}`,
      quote: "Share your experience here.",
      authorName: "Name",
      authorTitle: "Client",
      rating: 5,
    };
    setConfig((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        testimonials: [
          ...(prev.testimonials?.testimonials || []),
          newTestimonial,
        ],
      } as TestimonialsConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleRemoveTestimonial = useCallback((testimonialId: string) => {
    setConfig((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        testimonials: (prev.testimonials?.testimonials || []).filter(
          (t) => t.id !== testimonialId,
        ),
      } as TestimonialsConfig,
    }));
    setIsDirty(true);
  }, []);

  // --- FAQ handlers ---
  const handleFAQHeadingChange = useCallback((heading: string) => {
    setConfig((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        heading,
        items: prev.faq?.items || [],
      } as FAQConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleFAQSubheadingChange = useCallback((subheading: string) => {
    setConfig((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        subheading,
        items: prev.faq?.items || [],
      } as FAQConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleFAQItemChange = useCallback(
    (itemId: string, field: "question" | "answer", value: string) => {
      setConfig((prev) => ({
        ...prev,
        faq: {
          ...prev.faq,
          items: (prev.faq?.items || []).map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item,
          ),
        } as FAQConfig,
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleAddFAQItem = useCallback(() => {
    const newItem: FAQItem = {
      id: `faq-${Date.now()}`,
      question: "Your question here?",
      answer: "Your answer here.",
    };
    setConfig((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: [...(prev.faq?.items || []), newItem],
      } as FAQConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleRemoveFAQItem = useCallback((itemId: string) => {
    setConfig((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: (prev.faq?.items || []).filter((item) => item.id !== itemId),
      } as FAQConfig,
    }));
    setIsDirty(true);
  }, []);

  // --- Location handlers ---
  const handleLocationHeadingChange = useCallback((heading: string) => {
    setConfig((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        heading,
      } as LocationConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleLocationSubheadingChange = useCallback((subheading: string) => {
    setConfig((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        subheading,
      } as LocationConfig,
    }));
    setIsDirty(true);
  }, []);

  // --- Gallery handlers ---
  const handleGalleryHeadingChange = useCallback((heading: string) => {
    setConfig((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        heading,
        images: prev.gallery?.images || [],
      } as GalleryConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleGallerySubheadingChange = useCallback((subheading: string) => {
    setConfig((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        subheading,
        images: prev.gallery?.images || [],
      } as GalleryConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleGalleryAddImage = useCallback(() => {
    setShowGalleryImageEditor(true);
  }, []);

  const handleGalleryImageChange = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      if (!data.imageUrl) return;
      const newImage: GalleryImage = {
        id: `gallery-${Date.now()}`,
        url: data.imageUrl,
      };
      setConfig((prev) => ({
        ...prev,
        gallery: {
          ...prev.gallery,
          images: [...(prev.gallery?.images || []), newImage],
        } as GalleryConfig,
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleGalleryRemoveImage = useCallback((imageId: string) => {
    setConfig((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        images: (prev.gallery?.images || []).filter(
          (img) => img.id !== imageId,
        ),
      } as GalleryConfig,
    }));
    setIsDirty(true);
  }, []);

  // --- Footer handlers ---
  const handleFooterTextChange = useCallback((text: string) => {
    setConfig((prev) => ({
      ...prev,
      footer: { ...prev.footer, text } as FooterConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleFooterLinkChange = useCallback(
    (index: number, field: "label" | "url", value: string) => {
      setConfig((prev) => ({
        ...prev,
        footer: {
          ...prev.footer,
          links: (prev.footer?.links || []).map((link, i) =>
            i === index ? { ...link, [field]: value } : link,
          ),
        } as FooterConfig,
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleAddFooterLink = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: [...(prev.footer?.links || []), { label: "Link", url: "#" }],
      } as FooterConfig,
    }));
    setIsDirty(true);
  }, []);

  const handleRemoveFooterLink = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: (prev.footer?.links || []).filter((_, i) => i !== index),
      } as FooterConfig,
    }));
    setIsDirty(true);
  }, []);

  // --- Section management handlers ---
  const handleHeroToggle = useCallback((enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      heroEnabled: enabled,
    }));
    setIsDirty(true);
  }, []);

  const handleFooterToggle = useCallback((enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      footerEnabled: enabled,
    }));
    setIsDirty(true);
  }, []);

  const handleSectionToggle = useCallback(
    (sectionId: string, enabled: boolean) => {
      setConfig((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s.id === sectionId ? { ...s, enabled } : s,
        ),
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleSectionMoveUp = useCallback((sectionId: string) => {
    setConfig((prev) => {
      const sections = [...(prev.sections || [])];
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx <= 0) return prev;
      [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
      return { ...prev, sections };
    });
    setIsDirty(true);
  }, []);

  const handleSectionMoveDown = useCallback((sectionId: string) => {
    setConfig((prev) => {
      const sections = [...(prev.sections || [])];
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx < 0 || idx >= sections.length - 1) return prev;
      [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
      return { ...prev, sections };
    });
    setIsDirty(true);
  }, []);

  // Brand colour handlers
  const handleBrandColorChange = useCallback(
    (color: string) => {
      const palette = generatePalette(color);
      const harmonyColors = getHarmonyColors(color, colorHarmony);
      setConfig((prev) => ({
        ...prev,
        theme: {
          primaryColor: color,
          palette: {
            ...palette,
            secondary: harmonyColors.secondary,
            highlight: harmonyColors.highlight,
            harmonyType: colorHarmony,
          },
        },
      }));
      setIsDirty(true);
    },
    [colorHarmony],
  );

  const handleHexInputChange = useCallback(
    (value: string) => {
      let hex = value;
      if (!hex.startsWith("#")) hex = "#" + hex;
      setHexInput(hex);

      if (isValidHexColor(hex)) {
        setHexError(false);
        handleBrandColorChange(hex);
      } else {
        setHexError(hex.length >= 7);
      }
    },
    [handleBrandColorChange],
  );

  const handleHexInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && isValidHexColor(hexInput)) {
        handleBrandColorChange(hexInput);
        setShowColorPicker(false);
      }
    },
    [hexInput, handleBrandColorChange],
  );

  const cycleHarmony = useCallback(() => {
    const currentIndex = HARMONY_OPTIONS.findIndex(
      (h) => h.type === colorHarmony,
    );
    const nextIndex = (currentIndex + 1) % HARMONY_OPTIONS.length;
    setColorHarmony(HARMONY_OPTIONS[nextIndex].type);
  }, [colorHarmony]);

  // --- SEO handlers ---
  const handleSEOFieldChange = useCallback(
    (field: keyof SEOConfig, value: string) => {
      setConfig((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          [field]: value || undefined,
        },
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleSEOOgImageChange = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      setConfig((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          ogImage: data.imageUrl || undefined,
        },
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleSEOFaviconChange = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      setConfig((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          favicon: data.imageUrl || undefined,
        },
      }));
      setIsDirty(true);
    },
    [],
  );

  // Save data function
  const saveData = async (): Promise<boolean> => {
    try {
      console.log("[DBG][SimpleLandingPageEditor] Saving landing page data");

      const response = await fetch("/api/data/app/tenant/landing-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save");
      }

      console.log("[DBG][SimpleLandingPageEditor] Saved successfully");
      setIsDirty(false);
      setLastSaved(new Date());
      setHasUnpublishedChanges(true);
      return true;
    } catch (err) {
      console.error("[DBG][SimpleLandingPageEditor] Error saving:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
      return false;
    }
  };

  const performAutoSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    await saveData();
    setSaving(false);
  };

  // Publish handler
  const handlePublish = async () => {
    setIsPublishing(true);
    setError("");

    try {
      if (isDirty) {
        const saved = await saveData();
        if (!saved) {
          setError("Failed to save changes before publishing");
          setIsPublishing(false);
          return;
        }
      }

      console.log("[DBG][SimpleLandingPageEditor] Publishing landing page");

      const response = await fetch("/api/data/app/tenant/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to publish");
      }

      setIsPublished(true);
      setHasUnpublishedChanges(false);
      console.log("[DBG][SimpleLandingPageEditor] Published successfully");
    } catch (err) {
      console.error("[DBG][SimpleLandingPageEditor] Publish error:", err);
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--text-muted)]">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-white border-b border-[var(--color-border)] px-6 py-3 flex items-center gap-4">
        {/* Template Picker Toggle */}
        <button
          onClick={() => setShowTemplatePicker(!showTemplatePicker)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Template:{" "}
          {TEMPLATES.find((t) => t.id === config.template)?.name || "Centered"}
        </button>

        {/* Brand Colour Picker */}
        <div className="relative" ref={colorPickerRef}>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="Brand Color"
          >
            <span
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: currentBrandColor }}
            />
            Brand
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg p-4 z-50 w-[240px]">
              <div className="text-xs font-medium text-gray-700 mb-3">
                Your Brand Colour (click to change)
              </div>

              {/* Colour Picker */}
              <div className="mb-4">
                <div
                  className="relative w-full h-32 rounded-lg overflow-hidden cursor-pointer border border-gray-200"
                  onClick={() => colorInputRef.current?.click()}
                >
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={currentBrandColor}
                    onChange={(e) => handleBrandColorChange(e.target.value)}
                    className="absolute inset-0 w-[200%] h-[200%] cursor-pointer border-0 -top-1/2 -left-1/2"
                  />
                </div>
              </div>

              {/* Hex Input */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">
                  Hex Code
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-md border border-gray-200 flex-shrink-0"
                    style={{
                      backgroundColor: isValidHexColor(hexInput)
                        ? hexInput
                        : currentBrandColor,
                    }}
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    onKeyDown={handleHexInputKeyDown}
                    placeholder="#000000"
                    maxLength={7}
                    className={`flex-1 px-2 py-1.5 text-sm border rounded-md font-mono uppercase ${
                      hexError
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    } focus:outline-none focus:ring-1`}
                  />
                </div>
                {hexError && (
                  <p className="text-xs text-red-500 mt-1">
                    Enter valid hex (e.g. #FF5733)
                  </p>
                )}
              </div>

              {/* Colour Palette Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Color Palette</label>
                  <button
                    onClick={cycleHarmony}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    title="Cycle color harmony"
                  >
                    <span className="text-[10px]">
                      {
                        HARMONY_OPTIONS.find((h) => h.type === colorHarmony)
                          ?.label
                      }
                    </span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
                {(() => {
                  const harmonyColors = getHarmonyColors(
                    currentBrandColor,
                    colorHarmony,
                  );
                  return (
                    <div className="flex flex-col gap-2">
                      <div
                        className="h-10 rounded-lg border border-gray-200 flex items-center justify-center"
                        style={{ backgroundColor: currentBrandColor }}
                      >
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              hexToHsl(currentBrandColor).l > 50
                                ? "#374151"
                                : "#fff",
                          }}
                        >
                          Primary
                        </span>
                      </div>
                      <div
                        className="h-8 rounded-lg border border-gray-200 flex items-center justify-center"
                        style={{
                          backgroundColor: harmonyColors.secondary,
                        }}
                      >
                        <span className="text-xs font-medium text-gray-700">
                          Secondary
                        </span>
                      </div>
                      <div
                        className="h-8 rounded-lg border border-gray-200 flex items-center justify-center"
                        style={{
                          backgroundColor: harmonyColors.highlight,
                        }}
                      >
                        <span className="text-xs font-medium text-gray-700">
                          Highlight
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  {
                    HARMONY_OPTIONS.find((h) => h.type === colorHarmony)
                      ?.description
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SEO Panel */}
        <div className="relative" ref={seoPickerRef}>
          <button
            onClick={() => setShowSEOPanel(!showSEOPanel)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="SEO Settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            SEO
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showSEOPanel && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg p-4 z-50 w-[340px]">
              <div className="text-xs font-medium text-gray-700 mb-3">
                Search Engine Optimisation
              </div>

              {/* SEO Title */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={config.seo?.title || ""}
                  onChange={(e) =>
                    handleSEOFieldChange("title", e.target.value)
                  }
                  placeholder="Custom page title for search engines"
                  maxLength={70}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-gray-400">
                    Overrides hero title in search results
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {(config.seo?.title || "").length}/70
                  </span>
                </div>
              </div>

              {/* Meta Description */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Meta Description
                </label>
                <textarea
                  value={config.seo?.description || ""}
                  onChange={(e) =>
                    handleSEOFieldChange("description", e.target.value)
                  }
                  placeholder="Custom description for search results"
                  maxLength={160}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-gray-400">
                    Shown below the title in search results
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {(config.seo?.description || "").length}/160
                  </span>
                </div>
              </div>

              {/* Keywords */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  value={config.seo?.keywords || ""}
                  onChange={(e) =>
                    handleSEOFieldChange("keywords", e.target.value)
                  }
                  placeholder="e.g. yoga, meditation, wellness"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-[10px] text-gray-400">
                  Comma-separated keywords for search engines
                </span>
              </div>

              {/* OG Image */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Social Share Image
                </label>
                <div className="flex items-center gap-2">
                  {config.seo?.ogImage ? (
                    <div
                      className="w-20 h-[42px] rounded border border-gray-200 bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: `url(${config.seo.ogImage})`,
                      }}
                    />
                  ) : (
                    <div className="w-20 h-[42px] rounded border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-gray-400">
                        1200x630
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowSEOOgImageEditor(true)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    {config.seo?.ogImage ? "Change" : "Add"}
                  </button>
                </div>
                <span className="text-[10px] text-gray-400">
                  Shown when shared on social media (Facebook, Twitter, etc.)
                </span>
              </div>

              {/* Favicon */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Favicon
                </label>
                <div className="flex items-center gap-2">
                  {config.seo?.favicon ? (
                    <div
                      className="w-6 h-6 rounded border border-gray-200 bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: `url(${config.seo.favicon})`,
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] text-gray-400">ico</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowSEOFaviconEditor(true)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    {config.seo?.favicon ? "Change" : "Add"}
                  </button>
                </div>
                <span className="text-[10px] text-gray-400">
                  Small icon shown in browser tabs
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex-1 min-w-0 text-sm text-[var(--text-muted)] flex items-center gap-2">
          {saving ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </span>
          ) : isDirty ? (
            <span className="text-amber-600">Unsaved changes</span>
          ) : (
            <span
              className="text-green-600 transition-opacity duration-500"
              style={{ opacity: showSavedIndicator ? 1 : 0 }}
            >
              Saved
            </span>
          )}
        </div>

        {/* View Live Button */}
        {isPublished && (
          <a
            href={`/${tenantId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            View Live
          </a>
        )}

        {/* Publish Button */}
        {(hasUnpublishedChanges || !isPublished) && (
          <button
            onClick={handlePublish}
            disabled={saving || isPublishing}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPublishing ? "Publishing..." : "Publish"}
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 my-3 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center justify-between">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Template Picker Dropdown */}
      {showTemplatePicker && (
        <div className="mx-6 my-3 bg-white border border-[var(--color-border)] rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-[var(--text-primary)]">
              Choose a Template
            </h3>
            <button
              onClick={() => setShowTemplatePicker(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateChange(template.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  config.template === template.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-[var(--color-border)] hover:border-gray-400"
                }`}
              >
                <div className="font-medium text-sm mb-1">{template.name}</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {template.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Preview (with inline editing) */}
      <div className="flex-1 relative" style={{ backgroundColor: "#e5e7eb" }}>
        {/* Section Toolbar — outside scroll area so it stays visible */}
        <SectionToolbar
          heroEnabled={config.heroEnabled !== false}
          footerEnabled={config.footerEnabled !== false}
          sections={config.sections || DEFAULT_LANDING_PAGE_CONFIG.sections!}
          onHeroToggle={handleHeroToggle}
          onFooterToggle={handleFooterToggle}
          onSectionToggle={handleSectionToggle}
          onSectionMoveUp={handleSectionMoveUp}
          onSectionMoveDown={handleSectionMoveDown}
        />

        <div className="absolute inset-0 overflow-auto">
          <div className="mx-auto" style={{ maxWidth: "1200px" }}>
            <div className="m-4 bg-white shadow-lg overflow-hidden relative">
              {/* Image Edit Button - Top Right */}
              <button
                onClick={() => setShowImageEditor(true)}
                className="absolute top-4 right-4 z-10 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-105"
                title="Edit background image"
              >
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
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>

              <LandingPageThemeProvider palette={config.theme?.palette}>
                <HeroTemplateRenderer
                  config={config}
                  isEditing={true}
                  products={products}
                  currency={editorCurrency}
                  onTitleChange={handleTitleChange}
                  onSubtitleChange={handleSubtitleChange}
                  onButtonClick={() => setShowButtonEditor(true)}
                  onAboutParagraphChange={handleAboutParagraphChange}
                  onAboutImageClick={() => setShowAboutImageEditor(true)}
                  onFeaturesHeadingChange={handleFeaturesHeadingChange}
                  onFeaturesSubheadingChange={handleFeaturesSubheadingChange}
                  onFeatureCardChange={handleFeatureCardChange}
                  onFeatureCardImageClick={handleFeatureCardImageClick}
                  onAddFeatureCard={handleAddFeatureCard}
                  onRemoveFeatureCard={handleRemoveFeatureCard}
                  onTestimonialsHeadingChange={handleTestimonialsHeadingChange}
                  onTestimonialsSubheadingChange={
                    handleTestimonialsSubheadingChange
                  }
                  onTestimonialChange={handleTestimonialChange}
                  onAddTestimonial={handleAddTestimonial}
                  onRemoveTestimonial={handleRemoveTestimonial}
                  onFAQHeadingChange={handleFAQHeadingChange}
                  onFAQSubheadingChange={handleFAQSubheadingChange}
                  onFAQItemChange={handleFAQItemChange}
                  onAddFAQItem={handleAddFAQItem}
                  onRemoveFAQItem={handleRemoveFAQItem}
                  address={editorAddress}
                  onLocationHeadingChange={handleLocationHeadingChange}
                  onLocationSubheadingChange={handleLocationSubheadingChange}
                  onGalleryHeadingChange={handleGalleryHeadingChange}
                  onGallerySubheadingChange={handleGallerySubheadingChange}
                  onGalleryAddImage={handleGalleryAddImage}
                  onGalleryRemoveImage={handleGalleryRemoveImage}
                  onFooterTextChange={handleFooterTextChange}
                  onFooterLinkChange={handleFooterLinkChange}
                  onAddFooterLink={handleAddFooterLink}
                  onRemoveFooterLink={handleRemoveFooterLink}
                />
              </LandingPageThemeProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="flex-shrink-0 bg-gray-100 border-t border-[var(--color-border)] px-6 py-2 text-center text-sm text-[var(--text-muted)]">
        Click on any text to edit inline. Use the Sections panel (left) to
        toggle and reorder sections.
      </div>

      {/* Image Editor Overlay - Hero Background */}
      <ImageEditorOverlay
        isOpen={showImageEditor}
        onClose={() => setShowImageEditor(false)}
        onSave={handleImageChange}
        currentImage={config.backgroundImage}
        currentPosition={config.imagePosition}
        currentZoom={config.imageZoom}
        title="Edit Background Image"
        aspectRatio={currentTemplateImageConfig.heroBackground}
        defaultSearchQuery="professional business"
      />

      {/* Button Editor Overlay */}
      <ButtonEditorOverlay
        isOpen={showButtonEditor}
        onClose={() => setShowButtonEditor(false)}
        onSave={handleButtonChange}
        currentConfig={config.button}
        title="Edit Action Button"
        actions={BUTTON_ACTIONS}
      />

      {/* About Image Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showAboutImageEditor}
        onClose={() => setShowAboutImageEditor(false)}
        onSave={handleAboutImageChange}
        currentImage={config.about?.image}
        currentPosition={config.about?.imagePosition}
        currentZoom={config.about?.imageZoom}
        title="Edit About Image"
        aspectRatio={currentTemplateImageConfig.aboutImage}
        defaultSearchQuery="portrait professional"
      />

      {/* Feature Card Image Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showFeatureImageEditor}
        onClose={() => {
          setShowFeatureImageEditor(false);
          setEditingFeatureCardId(null);
        }}
        onSave={handleFeatureImageChange}
        currentImage={
          editingFeatureCardId
            ? config.features?.cards.find((c) => c.id === editingFeatureCardId)
                ?.image
            : undefined
        }
        currentPosition={
          editingFeatureCardId
            ? config.features?.cards.find((c) => c.id === editingFeatureCardId)
                ?.imagePosition
            : undefined
        }
        currentZoom={
          editingFeatureCardId
            ? config.features?.cards.find((c) => c.id === editingFeatureCardId)
                ?.imageZoom
            : undefined
        }
        title="Edit Feature Image"
        aspectRatio={currentTemplateImageConfig.featureCardImage}
        defaultSearchQuery="business service"
      />

      {/* Gallery Image Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showGalleryImageEditor}
        onClose={() => setShowGalleryImageEditor(false)}
        onSave={handleGalleryImageChange}
        currentImage={undefined}
        currentPosition={undefined}
        currentZoom={undefined}
        title="Add Gallery Image"
        aspectRatio="4/3"
        defaultSearchQuery="professional gallery"
      />

      {/* SEO OG Image Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showSEOOgImageEditor}
        onClose={() => setShowSEOOgImageEditor(false)}
        onSave={handleSEOOgImageChange}
        currentImage={config.seo?.ogImage}
        currentPosition={undefined}
        currentZoom={undefined}
        title="Edit Social Share Image"
        aspectRatio="1200/630"
        defaultSearchQuery="social media banner"
      />

      {/* SEO Favicon Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showSEOFaviconEditor}
        onClose={() => setShowSEOFaviconEditor(false)}
        onSave={handleSEOFaviconChange}
        currentImage={config.seo?.favicon}
        currentPosition={undefined}
        currentZoom={undefined}
        title="Edit Favicon"
        aspectRatio="1/1"
        defaultSearchQuery="logo icon"
      />
    </div>
  );
}
