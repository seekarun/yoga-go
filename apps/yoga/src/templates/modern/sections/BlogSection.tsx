import Image from 'next/image';
import Link from 'next/link';
import { SECTION_MAX_WIDTH } from '../../shared';
import type { BlogSectionProps } from '../../types';

const CF_SUBDOMAIN = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'iq7mgkvtb3bwxqf5';

// Check if URL is a Cloudflare video ID (32 char hex)
const isCloudflareVideoId = (url: string) => /^[a-f0-9]{32}$/.test(url);

// Get Cloudflare iframe URL from video ID
const getCloudflareVideoUrl = (videoId: string) =>
  `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BlogSection({ title, description, latestPost }: BlogSectionProps) {
  return (
    <section
      style={{
        padding: '100px 40px',
        background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: SECTION_MAX_WIDTH, margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            {title || 'Latest Posts'}
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.6',
            }}
          >
            {description || 'Updates and insights from our expert'}
          </p>
        </div>

        {/* Featured Post Card */}
        {latestPost && (
          <div style={{ maxWidth: '500px', margin: '0 auto 32px' }}>
            <Link
              href={`/blog/${latestPost.id}`}
              style={{
                display: 'block',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {latestPost.media && latestPost.media.length > 0 && (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                  {latestPost.media[0].type === 'image' ? (
                    <Image
                      src={latestPost.media[0].url}
                      alt="Post media"
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  ) : latestPost.media[0].type === 'video' ? (
                    isCloudflareVideoId(latestPost.media[0].url) ||
                    latestPost.media[0].url.includes('cloudflarestream.com') ? (
                      <iframe
                        src={
                          isCloudflareVideoId(latestPost.media[0].url)
                            ? getCloudflareVideoUrl(latestPost.media[0].url)
                            : latestPost.media[0].url
                        }
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none',
                        }}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    ) : latestPost.media[0].thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={latestPost.media[0].thumbnailUrl}
                        alt="Video thumbnail"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : null
                  ) : null}
                </div>
              )}

              <div style={{ padding: '20px' }}>
                {latestPost.content && (
                  <p
                    style={{
                      fontSize: '15px',
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: '1.6',
                      marginBottom: '12px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {latestPost.content}
                  </p>
                )}

                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  {formatRelativeTime(latestPost.publishedAt || latestPost.createdAt || '')}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* View All Posts Button */}
        <div style={{ textAlign: 'center' }}>
          <Link
            href="/blog"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
              color: 'var(--brand-500-contrast)',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--brand-500) 30%, transparent)',
            }}
          >
            View All Posts
          </Link>
        </div>
      </div>
    </section>
  );
}
