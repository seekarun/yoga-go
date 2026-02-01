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
    <div>
      <section
        style={{
          padding: '80px 20px',
          background: '#f8f9fa',
          textAlign: 'center',
          maxWidth: SECTION_MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '12px',
              color: 'var(--brand-500)',
            }}
          >
            {title || 'Latest Posts'}
          </h2>
          <p style={{ fontSize: '18px', marginBottom: '24px', color: '#666', lineHeight: '1.6' }}>
            {description || 'Updates and insights from our expert'}
          </p>
          {latestPost && (
            <Link
              href={`/blog/${latestPost.id}`}
              style={{
                display: 'block',
                background: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '24px',
                textAlign: 'left',
                textDecoration: 'none',
              }}
            >
              {latestPost.media && latestPost.media.length > 0 && (
                <div style={{ position: 'relative', width: '100%', height: '250px' }}>
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
              <div style={{ padding: '16px' }}>
                {latestPost.content && (
                  <p
                    style={{
                      fontSize: '15px',
                      color: '#333',
                      lineHeight: '1.5',
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
                <p style={{ fontSize: '13px', color: '#666' }}>
                  {formatRelativeTime(latestPost.publishedAt || latestPost.createdAt || '')}
                </p>
              </div>
            </Link>
          )}
          <div style={{ textAlign: 'right' }}>
            <Link
              href="/blog"
              style={{
                fontSize: '14px',
                color: 'var(--brand-500)',
                textDecoration: 'none',
              }}
            >
              View all posts &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
