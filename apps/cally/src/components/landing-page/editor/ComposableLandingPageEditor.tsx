"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMemo } from "react";
import type {
  LandingPageConfig,
  SimpleLandingPageConfig,
  Section,
  SectionType,
  TemplateId,
  ButtonConfig,
  TemplateImageConfig,
} from "@/types/landing-page";
import {
  TEMPLATES,
  DEFAULT_LANDING_PAGE_CONFIG_V2,
  BUTTON_ACTIONS,
  SECTION_TYPES,
  isLandingPageConfigV2,
  migrateToV2,
  createDefaultSection,
} from "@/types/landing-page";
import { ImageEditorOverlay, ButtonEditorOverlay } from "@core/components";
import SectionRenderer from "../sections/SectionRenderer";
import AIEditPanel from "./AIEditPanel";

interface ComposableLandingPageEditorProps {
  tenantId: string;
}

const AUTO_SAVE_DELAY = 1500;

/**
 * ComposableLandingPageEditor Component
 *
 * AI-powered, fully flexible landing page builder.
 * Supports dynamic sections that can be reordered, added, or removed.
 */
export default function ComposableLandingPageEditor({
  tenantId,
}: ComposableLandingPageEditorProps) {
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
  const [config, setConfig] = useState<LandingPageConfig>(
    DEFAULT_LANDING_PAGE_CONFIG_V2,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);

  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageSectionId, setEditingImageSectionId] = useState<
    string | null
  >(null);
  const [editingImageKey, setEditingImageKey] = useState<string | null>(null);

  // Button editor state
  const [showButtonEditor, setShowButtonEditor] = useState(false);
  const [editingButtonSectionId, setEditingButtonSectionId] = useState<
    string | null
  >(null);

  // AI edit panel state
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Get current template's image configuration
  const currentTemplateImageConfig: TemplateImageConfig = useMemo(() => {
    const template = TEMPLATES.find((t) => t.id === config.template);
    return template?.imageConfig || TEMPLATES[0].imageConfig;
  }, [config.template]);

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("[DBG][ComposableLandingPageEditor] Fetching tenant data");

        const response = await fetch("/api/data/app/tenant/landing-page");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load landing page data");
        }

        const tenantData = result.data;
        console.log(
          "[DBG][ComposableLandingPageEditor] Tenant data loaded:",
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
          tenantData.draftLandingPage || tenantData.customLandingPage || null;

        if (landingPage) {
          // Check if already V2 format
          if (isLandingPageConfigV2(landingPage)) {
            console.log("[DBG][ComposableLandingPageEditor] Using V2 format");
            setConfig(landingPage);
          } else {
            // Migrate from V1 (SimpleLandingPageConfig) to V2
            console.log(
              "[DBG][ComposableLandingPageEditor] Migrating from V1 to V2",
            );
            const migratedConfig = migrateToV2(
              landingPage as SimpleLandingPageConfig,
            );
            setConfig(migratedConfig);
          }
        } else {
          // Use default V2 config
          setConfig(DEFAULT_LANDING_PAGE_CONFIG_V2);
        }

        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 100);
      } catch (err) {
        console.error(
          "[DBG][ComposableLandingPageEditor] Error loading tenant:",
          err,
        );
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // Handle template change
  const handleTemplateChange = useCallback((template: TemplateId) => {
    setConfig((prev) => ({ ...prev, template }));
    setIsDirty(true);
    setShowTemplatePicker(false);
  }, []);

  // Handle section update
  const handleSectionUpdate = useCallback(
    (sectionId: string, updates: Partial<Section>) => {
      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId
            ? ({ ...section, ...updates } as Section)
            : section,
        ),
      }));
      setIsDirty(true);
    },
    [],
  );

  // Handle section image click
  const handleSectionImageClick = useCallback(
    (sectionId: string, imageKey: string) => {
      setEditingImageSectionId(sectionId);
      setEditingImageKey(imageKey);
      setShowImageEditor(true);
    },
    [],
  );

  // Handle section button click
  const handleSectionButtonClick = useCallback((sectionId: string) => {
    setEditingButtonSectionId(sectionId);
    setShowButtonEditor(true);
  }, []);

  // Handle image change from ImageEditorOverlay
  const handleImageChange = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      if (!editingImageSectionId || !editingImageKey) return;

      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== editingImageSectionId) return section;

          // Handle different image keys based on section type
          if (
            editingImageKey === "backgroundImage" &&
            section.type === "hero"
          ) {
            return {
              ...section,
              backgroundImage: data.imageUrl || undefined,
              imagePosition: data.imagePosition,
              imageZoom: data.imageZoom,
            };
          }
          if (editingImageKey === "image" && section.type === "about") {
            return {
              ...section,
              image: data.imageUrl || undefined,
              imagePosition: data.imagePosition,
              imageZoom: data.imageZoom,
            };
          }
          // Handle feature card images (key format: "card-{cardId}")
          if (
            editingImageKey.startsWith("card-") &&
            section.type === "features"
          ) {
            const cardId = editingImageKey.replace("card-", "");
            return {
              ...section,
              cards: section.cards.map((card) =>
                card.id === cardId
                  ? {
                      ...card,
                      image: data.imageUrl || undefined,
                      imagePosition: data.imagePosition,
                      imageZoom: data.imageZoom,
                    }
                  : card,
              ),
            };
          }
          // Handle gallery images (key format: "gallery-{imageId}")
          if (
            editingImageKey.startsWith("gallery-") &&
            section.type === "gallery"
          ) {
            const imageId = editingImageKey.replace("gallery-", "");
            return {
              ...section,
              images: section.images.map((img) =>
                img.id === imageId ? { ...img, src: data.imageUrl || "" } : img,
              ),
            };
          }
          // Handle team member images (key format: "team-{memberId}")
          if (editingImageKey.startsWith("team-") && section.type === "team") {
            const memberId = editingImageKey.replace("team-", "");
            return {
              ...section,
              members: section.members.map((member) =>
                member.id === memberId
                  ? { ...member, image: data.imageUrl || undefined }
                  : member,
              ),
            };
          }
          // Handle testimonial author images (key format: "testimonial-{testimonialId}")
          if (
            editingImageKey.startsWith("testimonial-") &&
            section.type === "testimonials"
          ) {
            const testimonialId = editingImageKey.replace("testimonial-", "");
            return {
              ...section,
              testimonials: section.testimonials.map((t) =>
                t.id === testimonialId
                  ? { ...t, authorImage: data.imageUrl || undefined }
                  : t,
              ),
            };
          }
          return section;
        }),
      }));
      setIsDirty(true);
      setEditingImageSectionId(null);
      setEditingImageKey(null);
    },
    [editingImageSectionId, editingImageKey],
  );

  // Handle button change from ButtonEditorOverlay
  const handleButtonChange = useCallback(
    (buttonConfig: ButtonConfig) => {
      if (!editingButtonSectionId) return;

      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== editingButtonSectionId) return section;
          if (section.type === "hero" || section.type === "cta") {
            return { ...section, button: buttonConfig };
          }
          return section;
        }),
      }));
      setIsDirty(true);
      setEditingButtonSectionId(null);
    },
    [editingButtonSectionId],
  );

  // Handle section move up
  const handleSectionMoveUp = useCallback((sectionId: string) => {
    setConfig((prev) => {
      const sections = [...prev.sections];
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index <= 0) return prev;

      // Swap with previous section
      [sections[index - 1], sections[index]] = [
        sections[index],
        sections[index - 1],
      ];

      // Update order values
      sections.forEach((s, i) => {
        s.order = i;
      });

      return { ...prev, sections };
    });
    setIsDirty(true);
  }, []);

  // Handle section move down
  const handleSectionMoveDown = useCallback((sectionId: string) => {
    setConfig((prev) => {
      const sections = [...prev.sections];
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index < 0 || index >= sections.length - 1) return prev;

      // Swap with next section
      [sections[index], sections[index + 1]] = [
        sections[index + 1],
        sections[index],
      ];

      // Update order values
      sections.forEach((s, i) => {
        s.order = i;
      });

      return { ...prev, sections };
    });
    setIsDirty(true);
  }, []);

  // Handle section delete
  const handleSectionDelete = useCallback((sectionId: string) => {
    setConfig((prev) => {
      // Don't delete if it's the only section or if it's the hero
      const section = prev.sections.find((s) => s.id === sectionId);
      if (!section || section.type === "hero") return prev;
      if (prev.sections.length <= 1) return prev;

      const sections = prev.sections.filter((s) => s.id !== sectionId);

      // Update order values
      sections.forEach((s, i) => {
        s.order = i;
      });

      return { ...prev, sections };
    });
    setIsDirty(true);
  }, []);

  // Handle add section
  const handleAddSection = useCallback((type: SectionType) => {
    setConfig((prev) => {
      const newSection = createDefaultSection(type, prev.sections.length);
      return {
        ...prev,
        sections: [...prev.sections, newSection],
      };
    });
    setIsDirty(true);
    setShowAddSectionMenu(false);
  }, []);

  // Handle AI-generated sections
  const handleAIApplyChanges = useCallback((newSections: Section[]) => {
    setConfig((prev) => ({
      ...prev,
      sections: newSections,
    }));
    setIsDirty(true);
    setShowAIPanel(false);
    console.log("[DBG][ComposableLandingPageEditor] Applied AI changes");
  }, []);

  // Get current editing section's image data
  const getEditingImageData = () => {
    if (!editingImageSectionId || !editingImageKey) {
      return { image: undefined, position: undefined, zoom: undefined };
    }

    const section = config.sections.find((s) => s.id === editingImageSectionId);
    if (!section) {
      return { image: undefined, position: undefined, zoom: undefined };
    }

    if (editingImageKey === "backgroundImage" && section.type === "hero") {
      return {
        image: section.backgroundImage,
        position: section.imagePosition,
        zoom: section.imageZoom,
      };
    }
    if (editingImageKey === "image" && section.type === "about") {
      return {
        image: section.image,
        position: section.imagePosition,
        zoom: section.imageZoom,
      };
    }
    if (editingImageKey.startsWith("card-") && section.type === "features") {
      const cardId = editingImageKey.replace("card-", "");
      const card = section.cards.find((c) => c.id === cardId);
      return {
        image: card?.image,
        position: card?.imagePosition,
        zoom: card?.imageZoom,
      };
    }
    if (editingImageKey.startsWith("gallery-") && section.type === "gallery") {
      const imageId = editingImageKey.replace("gallery-", "");
      const img = section.images.find((i) => i.id === imageId);
      return { image: img?.src, position: undefined, zoom: undefined };
    }
    if (editingImageKey.startsWith("team-") && section.type === "team") {
      const memberId = editingImageKey.replace("team-", "");
      const member = section.members.find((m) => m.id === memberId);
      return { image: member?.image, position: undefined, zoom: undefined };
    }
    if (
      editingImageKey.startsWith("testimonial-") &&
      section.type === "testimonials"
    ) {
      const testimonialId = editingImageKey.replace("testimonial-", "");
      const testimonial = section.testimonials.find(
        (t) => t.id === testimonialId,
      );
      return {
        image: testimonial?.authorImage,
        position: undefined,
        zoom: undefined,
      };
    }

    return { image: undefined, position: undefined, zoom: undefined };
  };

  // Get current editing button section's button config
  const getEditingButtonConfig = (): ButtonConfig | undefined => {
    if (!editingButtonSectionId) return undefined;

    const section = config.sections.find(
      (s) => s.id === editingButtonSectionId,
    );
    if (!section) return undefined;

    if (section.type === "hero" || section.type === "cta") {
      return section.button;
    }
    return undefined;
  };

  // Save data function
  const saveData = async (): Promise<boolean> => {
    try {
      console.log(
        "[DBG][ComposableLandingPageEditor] Saving landing page data",
      );

      const response = await fetch("/api/data/app/tenant/landing-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save");
      }

      console.log("[DBG][ComposableLandingPageEditor] Saved successfully");
      setIsDirty(false);
      setLastSaved(new Date());
      setHasUnpublishedChanges(true);
      return true;
    } catch (err) {
      console.error("[DBG][ComposableLandingPageEditor] Error saving:", err);
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

      console.log("[DBG][ComposableLandingPageEditor] Publishing landing page");

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
      console.log("[DBG][ComposableLandingPageEditor] Published successfully");
    } catch (err) {
      console.error("[DBG][ComposableLandingPageEditor] Publish error:", err);
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  // Sort sections by order
  const sortedSections = useMemo(
    () => [...config.sections].sort((a, b) => a.order - b.order),
    [config.sections],
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--text-muted)]">Loading editor...</div>
      </div>
    );
  }

  const editingImageData = getEditingImageData();

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

        {/* AI Edit Button */}
        <button
          onClick={() => setShowAIPanel(!showAIPanel)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          AI Edit
        </button>

        {/* Add Section Button */}
        <div className="relative">
          <button
            onClick={() => setShowAddSectionMenu(!showAddSectionMenu)}
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
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            Add Section
          </button>

          {/* Add Section Dropdown */}
          {showAddSectionMenu && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-2 max-h-80 overflow-auto">
              {SECTION_TYPES.filter((st) => st.type !== "hero").map(
                (sectionType) => (
                  <button
                    key={sectionType.type}
                    onClick={() => handleAddSection(sectionType.type)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-sm">
                      {sectionType.name}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {sectionType.description}
                    </div>
                  </button>
                ),
              )}
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
      <div
        className="flex-1 overflow-auto relative"
        style={{ backgroundColor: "#e5e7eb" }}
        onClick={() => {
          // Close dropdowns when clicking outside
          setShowAddSectionMenu(false);
        }}
      >
        <div className="mx-auto" style={{ maxWidth: "1200px" }}>
          <div className="m-4 bg-white shadow-lg overflow-hidden relative">
            {/* Render all sections */}
            {sortedSections.map((section, index) => (
              <SectionRenderer
                key={section.id}
                section={section}
                isEditing={true}
                template={config.template}
                index={index}
                totalSections={sortedSections.length}
                onUpdate={handleSectionUpdate}
                onImageClick={handleSectionImageClick}
                onButtonClick={handleSectionButtonClick}
                onMoveUp={handleSectionMoveUp}
                onMoveDown={handleSectionMoveDown}
                onDelete={handleSectionDelete}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="flex-shrink-0 bg-gray-100 border-t border-[var(--color-border)] px-6 py-2 text-center text-sm text-[var(--text-muted)]">
        Click on text to edit inline. Hover over sections to see reorder and
        delete controls.
      </div>

      {/* Image Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showImageEditor}
        onClose={() => {
          setShowImageEditor(false);
          setEditingImageSectionId(null);
          setEditingImageKey(null);
        }}
        onSave={handleImageChange}
        currentImage={editingImageData.image}
        currentPosition={editingImageData.position}
        currentZoom={editingImageData.zoom}
        title="Edit Image"
        aspectRatio={
          editingImageKey === "backgroundImage"
            ? currentTemplateImageConfig.heroBackground
            : editingImageKey === "image"
              ? currentTemplateImageConfig.aboutImage
              : editingImageKey?.startsWith("card-")
                ? currentTemplateImageConfig.featureCardImage
                : "1/1"
        }
        defaultSearchQuery="professional business"
      />

      {/* Button Editor Overlay */}
      <ButtonEditorOverlay
        isOpen={showButtonEditor}
        onClose={() => {
          setShowButtonEditor(false);
          setEditingButtonSectionId(null);
        }}
        onSave={handleButtonChange}
        currentConfig={getEditingButtonConfig()}
        title="Edit Action Button"
        actions={BUTTON_ACTIONS}
      />

      {/* AI Edit Panel */}
      <AIEditPanel
        config={config}
        onApplyChanges={handleAIApplyChanges}
        isExpanded={showAIPanel}
        onToggleExpand={() => setShowAIPanel(!showAIPanel)}
      />
    </div>
  );
}
