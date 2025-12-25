'use client';

import type {
  TemplateProps,
  SectionType,
  HeroSectionProps,
  ValuePropsSectionProps,
  AboutSectionProps,
  CoursesSectionProps,
  WebinarsSectionProps,
  PhotoGallerySectionProps,
  BlogSectionProps,
  ActSectionProps,
  FooterSectionProps,
} from '../types';
import { ResponsiveStyles } from '../shared';

import HeroSection from './sections/HeroSection';
import ValuePropsSection from './sections/ValuePropsSection';
import AboutSection from './sections/AboutSection';
import CoursesSection from './sections/CoursesSection';
import WebinarsSection from './sections/WebinarsSection';
import PhotoGallerySection from './sections/PhotoGallerySection';
import BlogSection from './sections/BlogSection';
import ActSection from './sections/ActSection';
import FooterSection from './sections/FooterSection';

export default function ClassicTemplate({ data, config, context }: TemplateProps) {
  const { expert, courses, webinars, latestBlogPost } = data;
  const { sectionOrder, disabledSections } = config;
  const { expertId, resolveCtaLink } = context;

  // Get enabled sections in order
  const enabledSections = sectionOrder.filter(section => !disabledSections.includes(section));

  // Prepare props for each section
  const customHero = expert.customLandingPage?.hero;
  const heroProps: HeroSectionProps & { resolveCtaLink: typeof resolveCtaLink } = {
    heroImage: customHero?.heroImage,
    heroImageAttribution: customHero?.heroImageAttribution,
    headline: customHero?.headline || `Transform Your\nPractice with ${expert.name}`,
    description: customHero?.description || expert.bio,
    ctaText: customHero?.ctaText || 'Explore Courses',
    ctaLink: customHero?.ctaLink || '#courses',
    alignment: customHero?.alignment || 'center',
    stats: {
      totalStudents: expert.totalStudents || 0,
      totalCourses: expert.totalCourses || 0,
      rating: expert.rating || 5.0,
    },
    expertName: expert.name,
    resolveCtaLink,
  };

  const valueProps = expert.customLandingPage?.valuePropositions;
  const valuePropsProps: ValuePropsSectionProps = {
    type: valueProps?.type || 'list',
    content: valueProps?.content,
    items: valueProps?.items,
  };

  const about = expert.customLandingPage?.about;
  const aboutProps: AboutSectionProps = {
    layoutType: about?.layoutType,
    videoCloudflareId: about?.videoCloudflareId,
    videoStatus: about?.videoStatus,
    imageUrl: about?.imageUrl,
    text: about?.text,
    expertName: expert.name,
  };

  const coursesConfig = expert.customLandingPage?.courses;
  const coursesProps: CoursesSectionProps = {
    title: coursesConfig?.title,
    description: coursesConfig?.description,
    courses,
    expertId,
  };

  const webinarsConfig = expert.customLandingPage?.webinars;
  const webinarsProps: WebinarsSectionProps = {
    title: webinarsConfig?.title,
    description: webinarsConfig?.description || `Join ${expert.name} in live interactive sessions`,
    webinars,
    expertId,
  };

  const galleryConfig = expert.customLandingPage?.photoGallery;
  const photoGalleryProps: PhotoGallerySectionProps = {
    title: galleryConfig?.title,
    description: galleryConfig?.description,
    images: galleryConfig?.images || [],
  };

  const blogConfig = expert.customLandingPage?.blog;
  const blogProps: BlogSectionProps = {
    title: blogConfig?.title,
    description: blogConfig?.description || `Insights, tips, and articles from ${expert.name}`,
    latestPost: latestBlogPost,
    expertId,
  };

  const act = expert.customLandingPage?.act;
  const actProps: ActSectionProps & { resolveCtaLink: typeof resolveCtaLink } = {
    imageUrl: act?.imageUrl,
    imageAttribution: act?.imageAttribution,
    title: act?.title,
    text: act?.text,
    ctaText: act?.ctaText || customHero?.ctaText || 'Get Your Results',
    ctaLink: act?.ctaLink || customHero?.ctaLink || '#',
    resolveCtaLink,
  };

  const footer = expert.customLandingPage?.footer;
  const footerProps: FooterSectionProps = {
    copyrightText: footer?.copyrightText,
    tagline: footer?.tagline,
    showSocialLinks: footer?.showSocialLinks,
    socialLinks: footer?.socialLinks,
    showLegalLinks: footer?.showLegalLinks,
    legalLinks: footer?.legalLinks,
    showContactInfo: footer?.showContactInfo,
    contactEmail: footer?.contactEmail,
    expertName: expert.name,
  };

  // Render sections based on enabled sections
  const renderSection = (sectionType: SectionType) => {
    switch (sectionType) {
      case 'hero':
        return <HeroSection key="hero" {...heroProps} />;
      case 'valuePropositions':
        return <ValuePropsSection key="valuePropositions" {...valuePropsProps} />;
      case 'about':
        return <AboutSection key="about" {...aboutProps} />;
      case 'courses':
        return <CoursesSection key="courses" {...coursesProps} />;
      case 'webinars':
        return <WebinarsSection key="webinars" {...webinarsProps} />;
      case 'photoGallery':
        return <PhotoGallerySection key="photoGallery" {...photoGalleryProps} />;
      case 'blog':
        return <BlogSection key="blog" {...blogProps} />;
      case 'act':
        return <ActSection key="act" {...actProps} />;
      case 'footer':
        return <FooterSection key="footer" {...footerProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      <ResponsiveStyles />
      <style>{`
        @media (max-width: 768px) {
          .hero-section-desktop {
            display: none !important;
          }
          .hero-section-mobile {
            display: block !important;
          }
          .value-props-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .course-item {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .course-title {
            font-size: 24px !important;
          }
          .course-description {
            font-size: 16px !important;
          }
          .courses-section-title {
            font-size: 32px !important;
            margin-bottom: 40px !important;
          }
          .act-section {
            padding: 40px 20px !important;
          }
          .act-section-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .act-section-image {
            height: 250px !important;
          }
          .act-section-title {
            font-size: 32px !important;
          }
          .act-section-text {
            font-size: 16px !important;
          }
        }
        @media (min-width: 769px) {
          .hero-section-desktop {
            display: block !important;
          }
          .hero-section-mobile {
            display: none !important;
          }
        }
      `}</style>
      {enabledSections.map(sectionType => (
        <div key={sectionType}>{renderSection(sectionType)}</div>
      ))}
    </>
  );
}
