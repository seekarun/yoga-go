'use client';

import Header from '@/components/Header';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';
import { getClientExpertContext } from '@/lib/domainContext';
import type {
  LandingPageConfig,
  LandingPageContext,
  LandingPageData,
  SectionType,
  TemplateId,
} from '@/templates/types';
import { DEFAULT_SECTION_ORDER } from '@/templates/types';
import type { BlogPost, Course, Expert, Webinar } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Lazy load templates
import dynamic from 'next/dynamic';

const ClassicTemplate = dynamic(() => import('@/templates/classic'), { ssr: false });
const ModernTemplate = dynamic(() => import('@/templates/modern'), { ssr: false });

export default function ExpertDetailPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<Expert | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [latestBlogPost, setLatestBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [expertMode, setExpertMode] = useState<{ isExpertMode: boolean; expertId: string | null }>({
    isExpertMode: false,
    expertId: null,
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDraftPreview, setIsDraftPreview] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Detect expert mode and preview domain on mount
  useEffect(() => {
    const context = getClientExpertContext();
    setExpertMode({
      isExpertMode: context.isExpertMode,
      expertId: context.expertId,
    });

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      if (hostname === 'preview.myyoga.guru' || hostname.startsWith('preview.localhost')) {
        setIsDraftPreview(true);
        console.log('[DBG][expert-detail] On preview domain - showing draft');
      }
    }
  }, []);

  // Check if current user is the owner of this expert page
  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const res = await fetch('/data/app/expert/me', { credentials: 'include' });
        console.log('[DBG][expert-detail] /data/app/expert/me response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[DBG][expert-detail] /data/app/expert/me data:', data);
          if (data.success && data.data?.id === expertId) {
            setIsOwner(true);
            console.log('[DBG][expert-detail] User is the owner of this page');
          }
        }
      } catch (err) {
        console.log('[DBG][expert-detail] User is not logged in or not an expert:', err);
      }
    };
    checkOwnership();
  }, [expertId]);

  useEffect(() => {
    const fetchExpertData = async () => {
      try {
        console.log('[DBG][expert-detail] Fetching expert:', expertId);

        const hostname =
          typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
        const isOnPreviewDomain =
          hostname === 'preview.myyoga.guru' || hostname.startsWith('preview.localhost');

        const fetchHeaders: HeadersInit = isOnPreviewDomain ? { 'x-preview-mode': 'draft' } : {};

        console.log('[DBG][expert-detail] On preview domain:', isOnPreviewDomain);

        const expertRes = await fetch(`/data/experts/${expertId}`, {
          headers: fetchHeaders,
          credentials: 'include',
        });
        console.log('[DBG][expert-detail] /data/experts response status:', expertRes.status);
        const expertData = await expertRes.json();
        console.log('[DBG][expert-detail] /data/experts response:', expertData);

        if (expertData.success) {
          setExpert(expertData.data);
          console.log('[DBG][expert-detail] Expert loaded:', expertData.data);
          if (expertData.data?.isLandingPagePublished === false) {
            setIsPreviewMode(true);
            console.log('[DBG][expert-detail] Page is in preview mode (unpublished)');
          }
        } else {
          console.error('[DBG][expert-detail] Expert fetch failed:', expertData.error);
        }

        const coursesRes = await fetch(`/data/courses?instructorId=${expertId}`);
        const coursesData = await coursesRes.json();

        if (coursesData.success && expertData.success) {
          setCourses(coursesData.data || []);
          console.log('[DBG][expert-detail] Expert courses:', coursesData.data);
        }

        const blogRes = await fetch(`/data/experts/${expertId}/blog?limit=1`);
        const blogData = await blogRes.json();

        if (blogData.success && blogData.data?.length > 0) {
          setLatestBlogPost(blogData.data[0]);
          console.log('[DBG][expert-detail] Latest blog post:', blogData.data[0]);
        }

        const webinarsRes = await fetch(`/data/webinars?expertId=${expertId}`);
        const webinarsData = await webinarsRes.json();

        if (webinarsData.success && webinarsData.data) {
          const activeWebinars = webinarsData.data.filter(
            (w: Webinar) => w.status === 'SCHEDULED' || w.status === 'LIVE'
          );
          setWebinars(activeWebinars);
          console.log('[DBG][expert-detail] Webinars loaded:', activeWebinars.length);
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
        <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
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
          {!expertMode.isExpertMode && (
            <Link
              href="/experts"
              style={{
                color: 'var(--brand-500, #6b7280)',
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

  // Redirect non-owners on draft preview
  if (isDraftPreview && !isOwner && !loading) {
    if (typeof window !== 'undefined') {
      console.log('[DBG][expert-detail] Non-owner on draft preview, redirecting');
      window.location.href = 'https://myyoga.guru';
      return null;
    }
  }

  // Redirect non-owners on unpublished preview
  if (isPreviewMode && !isDraftPreview && !isOwner && !loading) {
    if (typeof window !== 'undefined') {
      window.location.href = 'https://myyoga.guru';
      return null;
    }
  }

  // Preview banner component
  const PreviewBanner = () => {
    if (isDraftPreview && isOwner) {
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            Draft Preview — You are viewing unpublished changes. Publish to make them live.
          </span>
          <a
            href={`https://myyoga.guru/srv/${expertId}/landing-page`}
            style={{
              background: 'white',
              color: '#1d4ed8',
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Edit
          </a>
          {expert?.isLandingPagePublished && (
            <a
              href={`https://${expertId}.myyoga.guru`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              View Published
            </a>
          )}
        </div>
      );
    }

    if (isPreviewMode && isOwner) {
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            Preview Mode — This page is not published yet. Only you can see it.
          </span>
          <Link
            href={`/srv/${expertId}/landing-page`}
            style={{
              background: 'white',
              color: '#d97706',
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Edit & Publish
          </Link>
        </div>
      );
    }

    return null;
  };

  // Helper to resolve CTA links
  // On subdomains, middleware handles rewriting /survey/* and /courses/* to /experts/{expertId}/*
  const resolveCtaLink = (link: string | undefined): string => {
    if (!link) return '#courses';
    // Return links as-is - middleware handles subdomain rewriting
    return link;
  };

  // Get template and section configuration
  const template: TemplateId = expert.customLandingPage?.template || 'classic';
  const savedSectionOrder = expert.customLandingPage?.sectionOrder as SectionType[] | undefined;
  const sectionOrder: SectionType[] = savedSectionOrder
    ? [...savedSectionOrder, ...DEFAULT_SECTION_ORDER.filter(s => !savedSectionOrder.includes(s))]
    : DEFAULT_SECTION_ORDER;
  const disabledSections: SectionType[] =
    (expert.customLandingPage?.disabledSections as SectionType[]) || [];

  console.log('[DBG][expert-detail] Template config:', {
    template,
    sectionOrder,
    disabledSections,
  });

  // Prepare template props
  const templateData: LandingPageData = {
    expert,
    courses,
    webinars,
    latestBlogPost: latestBlogPost || undefined,
  };

  const templateConfig: LandingPageConfig = {
    template,
    sectionOrder,
    disabledSections,
    theme: {
      primaryColor: expert.customLandingPage?.theme?.primaryColor,
      palette: expert.customLandingPage?.theme?.palette,
    },
  };

  const templateContext: LandingPageContext = {
    expertId,
    resolveCtaLink,
    isPreviewMode: isPreviewMode || isDraftPreview,
  };

  // Select template component
  const TemplateComponent = template === 'modern' ? ModernTemplate : ClassicTemplate;

  return (
    <LandingPageThemeProvider palette={expert.customLandingPage?.theme?.palette}>
      <div
        style={{
          minHeight: '100vh',
          paddingTop: (isPreviewMode || isDraftPreview) && isOwner ? '48px' : 0,
        }}
      >
        <PreviewBanner />
        <Header />
        <TemplateComponent data={templateData} config={templateConfig} context={templateContext} />
      </div>
    </LandingPageThemeProvider>
  );
}
