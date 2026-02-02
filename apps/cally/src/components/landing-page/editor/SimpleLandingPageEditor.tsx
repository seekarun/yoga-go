"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  SimpleLandingPageConfig,
  TemplateId,
  ButtonConfig,
  AboutConfig,
  FeaturesConfig,
  FeatureCard,
} from "@/types/landing-page";
import {
  TEMPLATES,
  DEFAULT_LANDING_PAGE_CONFIG,
  BUTTON_ACTIONS,
} from "@/types/landing-page";
import { ImageEditorOverlay, ButtonEditorOverlay } from "@core/components";
import HeroTemplateRenderer from "@/templates/hero";

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

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

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

        // Ensure we have a valid config structure
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
          about: landingPage.about || {
            image: undefined,
            imagePosition: "50% 50%",
            imageZoom: 100,
            paragraph:
              "I'm passionate about helping people achieve their goals. With years of experience in my field, I provide personalized guidance tailored to your unique needs. Let's work together to unlock your potential.",
          },
          features:
            landingPage.features || DEFAULT_LANDING_PAGE_CONFIG.features,
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
      >
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

            <HeroTemplateRenderer
              config={config}
              isEditing={true}
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
            />
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="flex-shrink-0 bg-gray-100 border-t border-[var(--color-border)] px-6 py-2 text-center text-sm text-[var(--text-muted)]">
        Click on the title or subtitle to edit inline. Use the image icon (top
        right) to change background.
      </div>

      {/* Image Editor Overlay - Hero Background (16:9 landscape) */}
      <ImageEditorOverlay
        isOpen={showImageEditor}
        onClose={() => setShowImageEditor(false)}
        onSave={handleImageChange}
        currentImage={config.backgroundImage}
        currentPosition={config.imagePosition}
        currentZoom={config.imageZoom}
        title="Edit Background Image"
        aspectRatio="16/9"
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

      {/* About Image Editor Overlay (3:4 portrait for profile images) */}
      <ImageEditorOverlay
        isOpen={showAboutImageEditor}
        onClose={() => setShowAboutImageEditor(false)}
        onSave={handleAboutImageChange}
        currentImage={config.about?.image}
        currentPosition={config.about?.imagePosition}
        currentZoom={config.about?.imageZoom}
        title="Edit About Image"
        aspectRatio="3/4"
        defaultSearchQuery="portrait professional"
      />

      {/* Feature Card Image Editor Overlay (16:9 for card images) */}
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
        aspectRatio="16/9"
        defaultSearchQuery="business service"
      />
    </div>
  );
}
