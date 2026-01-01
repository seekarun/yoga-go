'use client';

import type { ReactNode } from 'react';
import type { TemplateProps, SectionType } from '../types';

// Import Classic template sections
import HeroSection from './sections/HeroSection';
import ValuePropsSection from './sections/ValuePropsSection';
import AboutSection from './sections/AboutSection';
import CoursesSection from './sections/CoursesSection';
import WebinarsSection from './sections/WebinarsSection';
import PhotoGallerySection from './sections/PhotoGallerySection';
import BlogSection from './sections/BlogSection';
import ActSection from './sections/ActSection';
import FooterSection from './sections/FooterSection';

interface ClassicPageTemplateProps extends TemplateProps {
  renderSection?: (sectionId: SectionType, content: ReactNode) => ReactNode;
}

export default function ClassicPageTemplate({
  data,
  config,
  context,
  renderSection,
}: ClassicPageTemplateProps) {
  const { expert, courses, webinars, latestBlogPost } = data;
  const { sectionOrder, disabledSections } = config;
  const { resolveCtaLink } = context;

  const customConfig = expert.customLandingPage || {};

  // Helper to wrap section content with renderSection callback
  const wrapSection = (sectionId: SectionType, content: ReactNode): ReactNode => {
    if (disabledSections.includes(sectionId)) {
      return null;
    }
    return renderSection ? renderSection(sectionId, content) : content;
  };

  // Build section content for each section type
  const sectionContent: Record<SectionType, ReactNode> = {
    hero: (
      <HeroSection
        heroImage={customConfig.hero?.heroImage}
        heroImagePosition={customConfig.hero?.heroImagePosition}
        heroImageZoom={customConfig.hero?.heroImageZoom}
        heroImageAttribution={customConfig.hero?.heroImageAttribution}
        headline={customConfig.hero?.headline || `Transform Your\nPractice with ${expert.name}`}
        description={customConfig.hero?.description || expert.bio || ''}
        ctaText={customConfig.hero?.ctaText || 'Explore Courses'}
        ctaLink={customConfig.hero?.ctaLink || '#courses'}
        alignment={customConfig.hero?.alignment || 'center'}
        stats={{
          totalStudents: expert.totalStudents || 0,
          totalCourses: expert.totalCourses || courses.length,
          rating: expert.rating || 0,
          totalRatings: 0,
        }}
        expertName={expert.name}
        resolveCtaLink={resolveCtaLink}
      />
    ),
    valuePropositions: (
      <ValuePropsSection
        type={customConfig.valuePropositions?.type || 'cards'}
        content={customConfig.valuePropositions?.content}
        items={customConfig.valuePropositions?.items}
      />
    ),
    about: (
      <AboutSection
        layoutType={customConfig.about?.layoutType}
        videoCloudflareId={customConfig.about?.videoCloudflareId}
        videoStatus={customConfig.about?.videoStatus}
        imageUrl={customConfig.about?.imageUrl}
        imagePosition={customConfig.about?.imagePosition}
        imageZoom={customConfig.about?.imageZoom}
        text={customConfig.about?.text}
        expertName={expert.name}
      />
    ),
    courses: (
      <CoursesSection
        title={customConfig.courses?.title}
        description={customConfig.courses?.description}
        courses={courses}
        expertId={context.expertId}
      />
    ),
    webinars: (
      <WebinarsSection
        title={customConfig.webinars?.title}
        description={
          customConfig.webinars?.description || `Join ${expert.name} in live interactive sessions`
        }
        webinars={webinars}
        expertId={context.expertId}
      />
    ),
    photoGallery: (() => {
      const galleryConfig = customConfig.photoGallery;
      if (!galleryConfig?.images || galleryConfig.images.length === 0) {
        return (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#f9fafb',
              color: '#9ca3af',
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
          onImageClick={context.onGalleryImageClick}
        />
      );
    })(),
    blog: (
      <BlogSection
        title={customConfig.blog?.title}
        description={
          customConfig.blog?.description || `Insights, tips, and articles from ${expert.name}`
        }
        latestPost={latestBlogPost}
      />
    ),
    act: (
      <ActSection
        imageUrl={customConfig.act?.imageUrl}
        imageAttribution={customConfig.act?.imageAttribution}
        title={customConfig.act?.title}
        text={customConfig.act?.text}
        ctaText={customConfig.act?.ctaText || customConfig.hero?.ctaText || 'Get Your Results'}
        ctaLink={customConfig.act?.ctaLink || customConfig.hero?.ctaLink || '#'}
        resolveCtaLink={resolveCtaLink}
      />
    ),
    footer: (
      <FooterSection
        copyrightText={customConfig.footer?.copyrightText}
        tagline={customConfig.footer?.tagline}
        showSocialLinks={customConfig.footer?.showSocialLinks}
        socialLinks={customConfig.footer?.socialLinks}
        showLegalLinks={customConfig.footer?.showLegalLinks}
        legalLinks={customConfig.footer?.legalLinks}
        showContactInfo={customConfig.footer?.showContactInfo}
        contactEmail={customConfig.footer?.contactEmail}
        expertName={expert.name}
      />
    ),
  };

  // Render sections in order
  return (
    <div
      className="classic-template"
      style={{
        background: '#fff',
        minHeight: '100vh',
      }}
    >
      {sectionOrder.map(sectionId => wrapSection(sectionId, sectionContent[sectionId]))}
    </div>
  );
}
