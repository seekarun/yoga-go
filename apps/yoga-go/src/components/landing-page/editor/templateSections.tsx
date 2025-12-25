'use client';

/**
 * This module provides the actual template section components for use in the editor preview.
 * Instead of separate "Preview" components, we use the same components that render on the domain.
 * This ensures 100% visual consistency between editor preview and actual domain.
 */

import type { CustomLandingPageConfig, Course, Webinar, BlogPost, Expert } from '@/types';
import type { TemplateId, SectionType } from '@/templates/types';

// Import Classic template sections
import ClassicHeroSection from '@/templates/classic/sections/HeroSection';
import ClassicValuePropsSection from '@/templates/classic/sections/ValuePropsSection';
import ClassicAboutSection from '@/templates/classic/sections/AboutSection';
import ClassicCoursesSection from '@/templates/classic/sections/CoursesSection';
import ClassicWebinarsSection from '@/templates/classic/sections/WebinarsSection';
import ClassicPhotoGallerySection from '@/templates/classic/sections/PhotoGallerySection';
import ClassicBlogSection from '@/templates/classic/sections/BlogSection';
import ClassicActSection from '@/templates/classic/sections/ActSection';
import ClassicFooterSection from '@/templates/classic/sections/FooterSection';

// Import Modern template sections
import ModernHeroSection from '@/templates/modern/sections/HeroSection';
import ModernValuePropsSection from '@/templates/modern/sections/ValuePropsSection';
import ModernAboutSection from '@/templates/modern/sections/AboutSection';
import ModernCoursesSection from '@/templates/modern/sections/CoursesSection';
import ModernWebinarsSection from '@/templates/modern/sections/WebinarsSection';
import ModernPhotoGallerySection from '@/templates/modern/sections/PhotoGallerySection';
import ModernBlogSection from '@/templates/modern/sections/BlogSection';
import ModernActSection from '@/templates/modern/sections/ActSection';
import ModernFooterSection from '@/templates/modern/sections/FooterSection';

// Section component maps by template
const classicSections = {
  hero: ClassicHeroSection,
  valuePropositions: ClassicValuePropsSection,
  about: ClassicAboutSection,
  courses: ClassicCoursesSection,
  webinars: ClassicWebinarsSection,
  photoGallery: ClassicPhotoGallerySection,
  blog: ClassicBlogSection,
  act: ClassicActSection,
  footer: ClassicFooterSection,
};

const modernSections = {
  hero: ModernHeroSection,
  valuePropositions: ModernValuePropsSection,
  about: ModernAboutSection,
  courses: ModernCoursesSection,
  webinars: ModernWebinarsSection,
  photoGallery: ModernPhotoGallerySection,
  blog: ModernBlogSection,
  act: ModernActSection,
  footer: ModernFooterSection,
};

// Template section registry
const templateSections: Record<TemplateId, typeof classicSections> = {
  classic: classicSections,
  modern: modernSections,
};

// Context for rendering sections in the editor
export interface EditorRenderContext {
  data: CustomLandingPageConfig;
  expertName: string;
  expertBio?: string;
  expertId: string;
  courses: Course[];
  webinars: Webinar[];
  latestBlogPost?: BlogPost;
}

// Default CTA link resolver for editor preview
const defaultResolveCtaLink = (link: string | undefined): string => {
  if (!link) return '#';
  if (link.startsWith('http://') || link.startsWith('https://')) return link;
  if (link.startsWith('#')) return link;
  return `#${link}`;
};

/**
 * Renders a section using the actual template component.
 * This ensures the editor preview matches the domain exactly.
 */
export function renderTemplateSection(
  sectionId: SectionType,
  template: TemplateId,
  context: EditorRenderContext
): React.ReactNode {
  const sections = templateSections[template] || templateSections.classic;
  const { data, expertName, expertBio, expertId, courses, webinars, latestBlogPost } = context;

  // Build an expert-like object for prop extraction (mimics what template does)
  const expertLike: Partial<Expert> = {
    name: expertName,
    bio: expertBio || '',
    customLandingPage: data,
    totalStudents: 0,
    totalCourses: courses.length,
    rating: 0,
  };

  const customHero = data.hero;
  const resolveCtaLink = defaultResolveCtaLink;

  switch (sectionId) {
    case 'hero': {
      const HeroSection = sections.hero;
      return (
        <HeroSection
          heroImage={customHero?.heroImage}
          heroImageAttribution={customHero?.heroImageAttribution}
          headline={customHero?.headline || `Transform Your\nPractice with ${expertName}`}
          description={customHero?.description || expertBio || ''}
          ctaText={customHero?.ctaText || 'Explore Courses'}
          ctaLink={customHero?.ctaLink || '#courses'}
          alignment={customHero?.alignment || 'center'}
          stats={{
            totalStudents: expertLike.totalStudents || 0,
            totalCourses: expertLike.totalCourses || 0,
            rating: expertLike.rating || 0,
            totalRatings: 0, // No ratings in editor preview
          }}
          expertName={expertName}
          resolveCtaLink={resolveCtaLink}
        />
      );
    }

    case 'valuePropositions': {
      const ValuePropsSection = sections.valuePropositions;
      const valueProps = data.valuePropositions;
      return (
        <ValuePropsSection
          type={valueProps?.type || 'list'}
          content={valueProps?.content}
          items={valueProps?.items}
        />
      );
    }

    case 'about': {
      const AboutSection = sections.about;
      const about = data.about;
      return (
        <AboutSection
          layoutType={about?.layoutType}
          videoCloudflareId={about?.videoCloudflareId}
          videoStatus={about?.videoStatus}
          imageUrl={about?.imageUrl}
          text={about?.text}
          expertName={expertName}
        />
      );
    }

    case 'courses': {
      const CoursesSection = sections.courses;
      const coursesConfig = data.courses;
      return (
        <CoursesSection
          title={coursesConfig?.title}
          description={coursesConfig?.description}
          courses={courses}
          expertId={expertId}
        />
      );
    }

    case 'webinars': {
      const WebinarsSection = sections.webinars;
      const webinarsConfig = data.webinars;
      return (
        <WebinarsSection
          title={webinarsConfig?.title}
          description={
            webinarsConfig?.description || `Join ${expertName} in live interactive sessions`
          }
          webinars={webinars}
          expertId={expertId}
        />
      );
    }

    case 'photoGallery': {
      const PhotoGallerySection = sections.photoGallery;
      const galleryConfig = data.photoGallery;
      // Don't render if no images (same as domain behavior)
      if (!galleryConfig?.images || galleryConfig.images.length === 0) {
        // Return placeholder for editor
        return (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: template === 'modern' ? '#0a0a0a' : '#f9fafb',
              color: template === 'modern' ? 'rgba(255,255,255,0.5)' : '#9ca3af',
            }}
          >
            <p>Photo Gallery</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Add images in the editor panel</p>
          </div>
        );
      }
      return (
        <PhotoGallerySection
          title={galleryConfig?.title}
          description={galleryConfig?.description}
          images={galleryConfig?.images || []}
        />
      );
    }

    case 'blog': {
      const BlogSection = sections.blog;
      const blogConfig = data.blog;
      return (
        <BlogSection
          title={blogConfig?.title}
          description={blogConfig?.description || `Insights, tips, and articles from ${expertName}`}
          latestPost={latestBlogPost}
        />
      );
    }

    case 'act': {
      const ActSection = sections.act;
      const act = data.act;
      return (
        <ActSection
          imageUrl={act?.imageUrl}
          imageAttribution={act?.imageAttribution}
          title={act?.title}
          text={act?.text}
          ctaText={act?.ctaText || customHero?.ctaText || 'Get Your Results'}
          ctaLink={act?.ctaLink || customHero?.ctaLink || '#'}
          resolveCtaLink={resolveCtaLink}
        />
      );
    }

    case 'footer': {
      const FooterSection = sections.footer;
      const footer = data.footer;
      return (
        <FooterSection
          copyrightText={footer?.copyrightText}
          tagline={footer?.tagline}
          showSocialLinks={footer?.showSocialLinks}
          socialLinks={footer?.socialLinks}
          showLegalLinks={footer?.showLegalLinks}
          legalLinks={footer?.legalLinks}
          showContactInfo={footer?.showContactInfo}
          contactEmail={footer?.contactEmail}
          expertName={expertName}
        />
      );
    }

    default:
      return null;
  }
}
