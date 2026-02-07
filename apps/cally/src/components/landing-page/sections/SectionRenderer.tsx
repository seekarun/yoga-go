"use client";

import type { Section } from "@/types/landing-page";
import type { SectionRendererProps } from "./types";
import SectionWrapper from "./SectionWrapper";
import HeroSectionComponent from "./HeroSectionComponent";
import AboutSectionComponent from "./AboutSectionComponent";
import FeaturesSectionComponent from "./FeaturesSectionComponent";
import TestimonialsSectionComponent from "./TestimonialsSectionComponent";
import FAQSectionComponent from "./FAQSectionComponent";
import PricingSectionComponent from "./PricingSectionComponent";
import GallerySectionComponent from "./GallerySectionComponent";
import TeamSectionComponent from "./TeamSectionComponent";
import ContactSectionComponent from "./ContactSectionComponent";
import CTASectionComponent from "./CTASectionComponent";
import CustomSectionComponent from "./CustomSectionComponent";

/**
 * SectionRenderer Component
 *
 * Routes section types to the correct component and wraps with SectionWrapper
 * for edit controls (reorder, delete).
 */
export default function SectionRenderer({
  section,
  isEditing = false,
  template,
  index,
  totalSections,
  onUpdate,
  onImageClick,
  onButtonClick,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SectionRendererProps) {
  const handleUpdate = (updates: Partial<Section>) => {
    onUpdate?.(section.id, updates);
  };

  const handleImageClick = (imageKey: string) => {
    onImageClick?.(section.id, imageKey);
  };

  const handleButtonClick = () => {
    onButtonClick?.(section.id);
  };

  const handleMoveUp = () => {
    onMoveUp?.(section.id);
  };

  const handleMoveDown = () => {
    onMoveDown?.(section.id);
  };

  const handleDelete = () => {
    onDelete?.(section.id);
  };

  const renderSection = () => {
    switch (section.type) {
      case "hero":
        return (
          <HeroSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
            onImageClick={handleImageClick}
            onButtonClick={handleButtonClick}
          />
        );

      case "about":
        return (
          <AboutSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
            onImageClick={handleImageClick}
          />
        );

      case "features":
        return (
          <FeaturesSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
            onImageClick={handleImageClick}
          />
        );

      case "testimonials":
        return (
          <TestimonialsSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
            onImageClick={handleImageClick}
          />
        );

      case "faq":
        return (
          <FAQSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
          />
        );

      case "pricing":
        return (
          <PricingSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
          />
        );

      case "gallery":
        return (
          <GallerySectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
            onImageClick={handleImageClick}
          />
        );

      case "team":
        return (
          <TeamSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
            onImageClick={handleImageClick}
          />
        );

      case "contact":
        return (
          <ContactSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
          />
        );

      case "cta":
        return (
          <CTASectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
            onButtonClick={handleButtonClick}
          />
        );

      case "custom":
        return (
          <CustomSectionComponent
            section={section}
            isEditing={isEditing}
            template={template}
            onUpdate={handleUpdate}
          />
        );

      default:
        // Unknown section type - render placeholder
        return (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              backgroundColor: "#f9fafb",
              color: "#6b7280",
            }}
          >
            <p>Unknown section type: {(section as Section).type}</p>
          </div>
        );
    }
  };

  return (
    <SectionWrapper
      section={section}
      isEditing={isEditing}
      index={index}
      totalSections={totalSections}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      onDelete={handleDelete}
    >
      {renderSection()}
    </SectionWrapper>
  );
}
