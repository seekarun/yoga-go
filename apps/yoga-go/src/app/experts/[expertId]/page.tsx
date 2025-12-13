'use client';

import { getClientExpertContext } from '@/lib/domainContext';
import type { Course, Expert, BlogPost } from '@/types';
import type { SectionType } from '@/components/landing-page/sections/types';
import { DEFAULT_SECTION_ORDER } from '@/components/landing-page/sections/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

export default function ExpertDetailPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<Expert | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [latestBlogPost, setLatestBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [expertMode, setExpertMode] = useState<{ isExpertMode: boolean; expertId: string | null }>({
    isExpertMode: false,
    expertId: null,
  });

  // Detect expert mode on mount
  useEffect(() => {
    const context = getClientExpertContext();
    setExpertMode({
      isExpertMode: context.isExpertMode,
      expertId: context.expertId,
    });
  }, []);

  useEffect(() => {
    const fetchExpertData = async () => {
      try {
        console.log('[DBG][expert-detail] Fetching expert:', expertId);

        // Fetch expert details
        const expertRes = await fetch(`/data/experts/${expertId}`);
        const expertData = await expertRes.json();

        if (expertData.success) {
          setExpert(expertData.data);
          console.log('[DBG][expert-detail] Expert loaded:', expertData.data);
        }

        // Fetch courses for this expert (only PUBLISHED)
        const coursesRes = await fetch(`/data/courses?instructorId=${expertId}`);
        const coursesData = await coursesRes.json();

        if (coursesData.success && expertData.success) {
          setCourses(coursesData.data || []);
          console.log('[DBG][expert-detail] Expert courses:', coursesData.data);
        }

        // Fetch latest blog post for this expert
        const blogRes = await fetch(`/data/experts/${expertId}/blog?limit=1`);
        const blogData = await blogRes.json();

        if (blogData.success && blogData.data?.length > 0) {
          setLatestBlogPost(blogData.data[0]);
          console.log('[DBG][expert-detail] Latest blog post:', blogData.data[0]);
        }
      } catch (error) {
        console.error('[DBG][expert-detail] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchExpertData();
    }
  }, [expertId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ fontSize: '16px', color: '#666' }}>Loading expert profile...</div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Expert not found</h2>
          {/* Hide "View all experts" link in expert mode */}
          {!expertMode.isExpertMode && (
            <Link
              href="/experts"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'underline',
              }}
            >
              View all experts
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Helper to resolve CTA links - transforms /survey/{id} to full path
  const resolveCtaLink = (link: string | undefined): string => {
    if (!link) return '#courses';
    // If link starts with /survey/, prepend the expert path
    if (link.startsWith('/survey/')) {
      return `/experts/${expertId}${link}`;
    }
    return link;
  };

  // Get custom landing page data or use defaults
  const customHero = expert.customLandingPage?.hero;
  const hasCustomHero = !!(
    customHero?.heroImage ||
    customHero?.headline ||
    customHero?.description
  );

  console.log('[DBG][expert-detail] Custom hero data:', {
    customHero,
    hasCustomHero,
    fullLandingPage: expert.customLandingPage,
  });

  const heroHeadline = customHero?.headline || `Transform Your\nPractice with ${expert.name}`;
  const heroDescription = customHero?.description || expert.bio;
  const heroCtaText = customHero?.ctaText || 'Explore Courses';
  const heroImage = customHero?.heroImage;
  const heroAlignment = customHero?.alignment || 'center';

  console.log('[DBG][expert-detail] Hero display values:', {
    heroHeadline,
    heroDescription,
    heroCtaText,
    heroImage,
    heroAlignment,
  });

  // Get section order and disabled sections from config
  const sectionOrder: SectionType[] =
    (expert.customLandingPage?.sectionOrder as SectionType[]) || DEFAULT_SECTION_ORDER;
  const disabledSections: SectionType[] =
    (expert.customLandingPage?.disabledSections as SectionType[]) || [];

  // Filter out disabled sections
  const enabledSections = sectionOrder.filter(section => !disabledSections.includes(section));

  console.log('[DBG][expert-detail] Section config:', {
    sectionOrder,
    disabledSections,
    enabledSections,
  });

  // Helper to check if a section is enabled
  const isSectionEnabled = (section: SectionType) => enabledSections.includes(section);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
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

      {/* Hero Section (Desktop + Mobile) */}
      {isSectionEnabled('hero') && (
        <>
          {/* Desktop Hero Section */}
          <section
            className="hero-section-desktop"
            style={{
              minHeight: '600px',
              paddingTop: '64px',
              position: 'relative',
              background: heroImage
                ? `url(${heroImage})`
                : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Gradient Overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: heroImage
                  ? 'rgba(0, 0, 0, 0.5)'
                  : 'radial-gradient(circle at 20% 50%, rgba(118, 75, 162, 0.2) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />

            <div
              className="container"
              style={{
                position: 'relative',
                height: '100%',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column',
                alignItems:
                  heroAlignment === 'left'
                    ? 'flex-start'
                    : heroAlignment === 'right'
                      ? 'flex-end'
                      : 'center',
                justifyContent: 'center',
                padding: '0 20px 80px 20px',
                textAlign: heroAlignment === 'center' ? 'center' : heroAlignment,
              }}
            >
              <div
                style={{
                  zIndex: 10,
                  maxWidth: heroAlignment === 'center' ? '900px' : '600px',
                  width: heroAlignment === 'center' ? '100%' : '50%',
                }}
              >
                <h1
                  style={{
                    fontSize: '64px',
                    fontWeight: '700',
                    lineHeight: '1.1',
                    marginBottom: '24px',
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {customHero?.headline ? (
                    heroHeadline
                  ) : (
                    <>
                      Transform Your
                      <br />
                      <span
                        style={{
                          background:
                            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        Practice
                      </span>{' '}
                      with {expert.name}
                    </>
                  )}
                </h1>

                <p
                  style={{
                    fontSize: '20px',
                    lineHeight: '1.6',
                    marginBottom: '40px',
                    color: 'rgba(255, 255, 255, 0.85)',
                  }}
                >
                  {heroDescription}
                </p>

                {/* CTA Button */}
                {!expertMode.isExpertMode && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap',
                      justifyContent: heroAlignment,
                    }}
                  >
                    <a
                      href={resolveCtaLink(customHero?.ctaLink)}
                      style={{
                        display: 'inline-block',
                        padding: '16px 48px',
                        background: '#fcd34d',
                        color: '#1f2937',
                        fontSize: '18px',
                        fontWeight: '600',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.background = '#fbbf24';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = '#fcd34d';
                      }}
                    >
                      {heroCtaText}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Elements */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '100px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
                pointerEvents: 'none',
              }}
            />
          </section>

          {/* Mobile Hero Section */}
          <section className="hero-section-mobile" style={{ display: 'none', paddingTop: '64px' }}>
            {/* Hero Image */}
            {heroImage ? (
              <div style={{ width: '100%', height: '300px', overflow: 'hidden' }}>
                <img
                  src={heroImage}
                  alt={expert.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '300px',
                  background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
                }}
              />
            )}

            {/* Content Below Image */}
            <div
              style={{
                padding: '40px 20px',
                background: '#fff',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  lineHeight: '1.2',
                  marginBottom: '20px',
                  color: '#1a202c',
                  letterSpacing: '-0.02em',
                }}
              >
                {customHero?.headline ? (
                  heroHeadline
                ) : (
                  <>Transform Your Practice with {expert.name}</>
                )}
              </h1>

              <p
                style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '32px',
                  color: '#4a5568',
                }}
              >
                {heroDescription}
              </p>

              {/* CTA Buttons */}
              {!expertMode.isExpertMode && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <a
                    href={resolveCtaLink(customHero?.ctaLink)}
                    style={{
                      display: 'inline-block',
                      padding: '14px 32px',
                      background: '#fcd34d',
                      color: '#1f2937',
                      fontSize: '16px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'transform 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = '#fbbf24';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = '#fcd34d';
                    }}
                  >
                    {heroCtaText}
                  </a>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Expert Promo Video Section */}
      {expert.promoVideoCloudflareId && expert.promoVideoStatus === 'ready' && (
        <section
          style={{
            padding: '60px 20px',
            background: '#f8f8f8',
          }}
        >
          <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={`https://customer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com/${expert.promoVideoCloudflareId}/iframe?preload=auto&poster=https%3A%2F%2Fcustomer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com%2F${expert.promoVideoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600`}
                  style={{
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '100%',
                  }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen={true}
                  title={`${expert.name} - Introduction Video`}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Value Propositions Section */}
      {isSectionEnabled('valuePropositions') &&
        expert.customLandingPage?.valuePropositions &&
        (expert.customLandingPage.valuePropositions.content ||
          (expert.customLandingPage.valuePropositions.items &&
            expert.customLandingPage.valuePropositions.items.length > 0)) && (
          <section
            style={{
              padding: '60px 20px',
              background: '#fff',
            }}
          >
            <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
              {expert.customLandingPage.valuePropositions.type === 'paragraph' ? (
                <p
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.8',
                    color: '#4a5568',
                    textAlign: 'center',
                  }}
                >
                  {expert.customLandingPage.valuePropositions.content}
                </p>
              ) : (
                <div
                  className="value-props-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      expert.customLandingPage.valuePropositions.items?.length === 3
                        ? 'repeat(3, 1fr)'
                        : 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '32px',
                    maxWidth: '1000px',
                    margin: '0 auto',
                  }}
                >
                  {expert.customLandingPage.valuePropositions.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '32px 24px',
                        background: '#f7fafc',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background:
                            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 20px',
                          color: '#fff',
                          fontSize: '24px',
                          fontWeight: '600',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <p
                        style={{
                          fontSize: '16px',
                          lineHeight: '1.6',
                          color: '#2d3748',
                          fontWeight: '500',
                        }}
                      >
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      {/* About Section */}
      {isSectionEnabled('about') &&
        expert.customLandingPage?.about &&
        (expert.customLandingPage.about.layoutType === 'video' ||
          expert.customLandingPage.about.layoutType === 'image-text') && (
          <section
            style={{
              padding: '60px 20px',
              background: '#f8f8f8',
            }}
          >
            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {expert.customLandingPage.about.layoutType === 'video' &&
              expert.customLandingPage.about.videoCloudflareId &&
              expert.customLandingPage.about.videoStatus === 'ready' ? (
                // Video Layout - Centered
                <div
                  style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      src={`https://customer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com/${expert.customLandingPage.about.videoCloudflareId}/iframe?preload=auto&poster=https%3A%2F%2Fcustomer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com%2F${expert.customLandingPage.about.videoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600`}
                      style={{
                        border: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: '100%',
                      }}
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen={true}
                    />
                  </div>
                </div>
              ) : expert.customLandingPage.about.layoutType === 'image-text' ? (
                // Image + Text Layout - Side by Side
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '48px',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                  >
                    <img
                      src={expert.customLandingPage.about.imageUrl}
                      alt="About"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      lineHeight: '1.8',
                      color: '#4a5568',
                    }}
                  >
                    {expert.customLandingPage.about.text}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

      {/* Courses Section */}
      {isSectionEnabled('courses') && courses.length > 0 && (
        <section
          style={{
            padding: '80px 20px',
            background: '#fff',
          }}
        >
          <div className="container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h2
              className="courses-section-title"
              style={{
                fontSize: '48px',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '60px',
                color: '#1a202c',
              }}
            >
              Courses
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
              {courses.map(course => (
                <div
                  key={course.id}
                  className="course-item"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '48px',
                    alignItems: 'center',
                  }}
                >
                  {/* Video - Left Half */}
                  <div
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                  >
                    {course.promoVideoCloudflareId && course.promoVideoStatus === 'ready' ? (
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          src={`https://customer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com/${course.promoVideoCloudflareId}/iframe?preload=auto&poster=https%3A%2F%2Fcustomer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com%2F${course.promoVideoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600`}
                          style={{
                            border: 'none',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '100%',
                          }}
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                          allowFullScreen={true}
                        />
                      </div>
                    ) : (
                      <img
                        src={course.thumbnail || course.coverImage}
                        alt={course.title}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                    )}
                  </div>

                  {/* Details - Right Half */}
                  <div>
                    <h3
                      className="course-title"
                      style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        color: '#1a202c',
                        lineHeight: '1.2',
                      }}
                    >
                      {course.title}
                    </h3>

                    <p
                      className="course-description"
                      style={{
                        fontSize: '18px',
                        lineHeight: '1.8',
                        color: '#4a5568',
                        marginBottom: '24px',
                      }}
                    >
                      {course.description}
                    </p>

                    {/* Course Details */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '24px',
                        marginBottom: '32px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-primary)',
                          }}
                        >
                          Level:
                        </span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>{course.level}</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-primary)',
                          }}
                        >
                          Duration:
                        </span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                          {course.duration}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-primary)',
                          }}
                        >
                          Lessons:
                        </span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                          {course.totalLessons}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-primary)',
                          }}
                        >
                          Category:
                        </span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                          {course.category}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button - Links to course detail page where users can buy */}
                    <Link
                      href={`/courses/${course.id}`}
                      style={{
                        display: 'inline-block',
                        padding: '14px 32px',
                        background:
                          'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(118, 75, 162, 0.4)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      More Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Act Section - Image Left, Content Right */}
      {isSectionEnabled('act') &&
        expert.customLandingPage?.act &&
        (expert.customLandingPage.act.imageUrl ||
          expert.customLandingPage.act.title ||
          expert.customLandingPage.act.text) && (
          <section className="act-section" style={{ padding: '80px 20px', background: '#374151' }}>
            <div className="container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div
                className="act-section-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '60px',
                  alignItems: 'center',
                }}
              >
                {/* Left: Image */}
                <div
                  className="act-section-image"
                  style={{
                    width: '100%',
                    height: '400px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={
                      expert.customLandingPage.act.imageUrl ||
                      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop'
                    }
                    alt={expert.customLandingPage.act.title || 'Act section'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>

                {/* Right: Content */}
                <div>
                  <h2
                    className="act-section-title"
                    style={{
                      fontSize: '48px',
                      fontWeight: '700',
                      marginBottom: '24px',
                      color: '#fff',
                      lineHeight: '1.2',
                    }}
                  >
                    {expert.customLandingPage.act.title || "Let's uncover the power of your brand."}
                  </h2>
                  <p
                    className="act-section-text"
                    style={{
                      fontSize: '18px',
                      lineHeight: '1.8',
                      color: '#d1d5db',
                      marginBottom: '32px',
                    }}
                  >
                    {expert.customLandingPage.act.text ||
                      "Take the guesswork out of your branding and marketing today with this rapid questionnaire. At the end you'll receive a personalised report with data insights and key suggestions to help you move forward with your business in a new light."}
                  </p>
                  {!expertMode.isExpertMode && (
                    <Link
                      href={`/experts/${expertId}/survey`}
                      style={{
                        padding: '16px 48px',
                        background: '#fcd34d',
                        color: '#1f2937',
                        borderRadius: '8px',
                        fontSize: '18px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        display: 'inline-block',
                        transition: 'transform 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.background = '#fbbf24';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = '#fcd34d';
                      }}
                    >
                      {customHero?.ctaText || 'Get Your Results'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

      {/* Blog Section */}
      {isSectionEnabled('blog') && (
        <section
          style={{
            padding: '80px 20px',
            background: '#f8f9fa',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#111',
              }}
            >
              {expert.customLandingPage?.blog?.title || 'From the Blog'}
            </h2>
            <p
              style={{
                fontSize: '18px',
                marginBottom: '24px',
                color: '#666',
                lineHeight: '1.6',
              }}
            >
              {expert.customLandingPage?.blog?.description ||
                `Insights, tips, and articles from ${expert?.name || 'our expert'}`}
            </p>
            {latestBlogPost && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  marginBottom: '24px',
                  textAlign: 'left',
                }}
              >
                {latestBlogPost.coverImage && (
                  <div
                    style={{
                      width: '100%',
                      height: '200px',
                      background: `url(${latestBlogPost.coverImage}) center/cover`,
                    }}
                  />
                )}
                <div style={{ padding: '20px' }}>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#111',
                      marginBottom: '8px',
                    }}
                  >
                    {latestBlogPost.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.5',
                      marginBottom: '12px',
                    }}
                  >
                    {latestBlogPost.excerpt}
                  </p>
                  <Link
                    href={`/experts/${expertId}/blog/${latestBlogPost.id}`}
                    style={{
                      fontSize: '14px',
                      color: '#2563eb',
                      fontWeight: '500',
                    }}
                  >
                    Read more →
                  </Link>
                </div>
              </div>
            )}
            <Link
              href={`/experts/${expertId}/blog`}
              style={{
                padding: '14px 32px',
                background: '#111',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = '#333';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = '#111';
              }}
            >
              View All Posts
            </Link>
          </div>
        </section>
      )}

      {/* Footer Section */}
      {isSectionEnabled('footer') && (
        <footer
          style={{
            padding: '40px 20px',
            background: '#1a1a1a',
            color: '#fff',
          }}
        >
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Tagline */}
            {expert.customLandingPage?.footer?.tagline && (
              <p
                style={{
                  fontSize: '16px',
                  color: '#a0a0a0',
                  textAlign: 'center',
                  marginBottom: '24px',
                  fontStyle: 'italic',
                }}
              >
                {expert.customLandingPage.footer.tagline}
              </p>
            )}

            {/* Social Links */}
            {expert.customLandingPage?.footer?.showSocialLinks !== false &&
              (expert.customLandingPage?.footer?.socialLinks?.instagram ||
                expert.customLandingPage?.footer?.socialLinks?.youtube ||
                expert.customLandingPage?.footer?.socialLinks?.facebook ||
                expert.customLandingPage?.footer?.socialLinks?.twitter ||
                expert.customLandingPage?.footer?.socialLinks?.tiktok) && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginBottom: '24px',
                  }}
                >
                  {expert.customLandingPage.footer.socialLinks?.instagram && (
                    <a
                      href={expert.customLandingPage.footer.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0' }}
                      title="Instagram"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  )}
                  {expert.customLandingPage.footer.socialLinks?.youtube && (
                    <a
                      href={expert.customLandingPage.footer.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0' }}
                      title="YouTube"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                      </svg>
                    </a>
                  )}
                  {expert.customLandingPage.footer.socialLinks?.facebook && (
                    <a
                      href={expert.customLandingPage.footer.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0' }}
                      title="Facebook"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                      </svg>
                    </a>
                  )}
                  {expert.customLandingPage.footer.socialLinks?.twitter && (
                    <a
                      href={expert.customLandingPage.footer.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0' }}
                      title="X (Twitter)"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                  {expert.customLandingPage.footer.socialLinks?.tiktok && (
                    <a
                      href={expert.customLandingPage.footer.socialLinks.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0' }}
                      title="TikTok"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}

            {/* Legal Links */}
            {expert.customLandingPage?.footer?.showLegalLinks !== false &&
              (expert.customLandingPage?.footer?.legalLinks?.privacyPolicy ||
                expert.customLandingPage?.footer?.legalLinks?.termsOfService ||
                expert.customLandingPage?.footer?.legalLinks?.refundPolicy) && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                  }}
                >
                  {expert.customLandingPage.footer.legalLinks?.privacyPolicy && (
                    <a
                      href={expert.customLandingPage.footer.legalLinks.privacyPolicy}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0', fontSize: '14px', textDecoration: 'none' }}
                    >
                      Privacy Policy
                    </a>
                  )}
                  {expert.customLandingPage.footer.legalLinks?.termsOfService && (
                    <a
                      href={expert.customLandingPage.footer.legalLinks.termsOfService}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0', fontSize: '14px', textDecoration: 'none' }}
                    >
                      Terms of Service
                    </a>
                  )}
                  {expert.customLandingPage.footer.legalLinks?.refundPolicy && (
                    <a
                      href={expert.customLandingPage.footer.legalLinks.refundPolicy}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a0a0a0', fontSize: '14px', textDecoration: 'none' }}
                    >
                      Refund Policy
                    </a>
                  )}
                </div>
              )}

            {/* Contact Email */}
            {expert.customLandingPage?.footer?.showContactInfo !== false &&
              expert.customLandingPage?.footer?.contactEmail && (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#a0a0a0',
                    marginBottom: '16px',
                  }}
                >
                  <a
                    href={`mailto:${expert.customLandingPage.footer.contactEmail}`}
                    style={{ color: '#a0a0a0', textDecoration: 'none' }}
                  >
                    {expert.customLandingPage.footer.contactEmail}
                  </a>
                </p>
              )}

            {/* Copyright */}
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>
              {expert.customLandingPage?.footer?.copyrightText ||
                `${new Date().getFullYear()} ${expert.name}. All rights reserved.`}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
