'use client';

import { getClientExpertContext } from '@/lib/domainContext';
import type { Course, Expert } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

export default function ExpertDetailPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<Expert | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
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
                  href={customHero?.ctaLink || '#courses'}
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
                {expert.liveStreamingEnabled && (
                  <Link
                    href={`/app/live/book/${expert.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '16px 48px',
                      background: '#667eea',
                      color: '#fff',
                      fontSize: '18px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'transform 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = '#5568d3';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = '#667eea';
                    }}
                  >
                    📅 Book 1:1 Session
                  </Link>
                )}
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
            {customHero?.headline ? heroHeadline : <>Transform Your Practice with {expert.name}</>}
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
                href={customHero?.ctaLink || '#courses'}
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
              {expert.liveStreamingEnabled && (
                <Link
                  href={`/app/live/book/${expert.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '14px 32px',
                    background: '#667eea',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = '#5568d3';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = '#667eea';
                  }}
                >
                  📅 Book 1:1 Session
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Value Propositions Section */}
      {expert.customLandingPage?.valuePropositions &&
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
      {expert.customLandingPage?.about &&
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
      {courses.length > 0 && (
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

                    {/* CTA Button */}
                    {!expertMode.isExpertMode && (
                      <Link
                        href={`/experts/${expertId}/courses/${course.id}`}
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
                        View Course
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Act Section - Image Left, Content Right */}
      {expert.customLandingPage?.act &&
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

      {/* Become an Expert CTA - Hidden in expert mode */}
      {!expertMode.isExpertMode && (
        <section
          style={{
            padding: '80px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#fff',
              }}
            >
              Inspired by {expert?.name || 'our experts'}?
            </h2>
            <p
              style={{
                fontSize: '18px',
                marginBottom: '24px',
                color: '#fff',
                opacity: 0.95,
                lineHeight: '1.6',
              }}
            >
              Become an expert too and share your passion for yoga with students around the world.
            </p>
            <Link
              href="/teach/apply"
              style={{
                padding: '14px 32px',
                background: '#fff',
                color: '#764ba2',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Apply to Teach
            </Link>
          </div>
        </section>
      )}

      {/* CTA Section - Hidden in expert mode */}
      {!expertMode.isExpertMode && (
        <section
          style={{
            padding: '80px 20px',
            background: '#000',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '600',
              marginBottom: '16px',
            }}
          >
            Ready to Start Learning?
          </h2>
          <p
            style={{
              fontSize: '20px',
              opacity: 0.9,
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px',
            }}
          >
            Join thousands of students learning from {expert.name}
          </p>
          <Link
            href="/courses"
            style={{
              display: 'inline-block',
              padding: '14px 40px',
              background: '#fff',
              color: '#000',
              borderRadius: '100px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
            }}
          >
            Browse All Courses
          </Link>
        </section>
      )}
    </div>
  );
}
