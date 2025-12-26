import type { UnsplashAttribution as UnsplashAttributionType } from '../types';

interface UnsplashAttributionProps {
  attribution: UnsplashAttributionType;
  style?: React.CSSProperties;
}

/**
 * Photo attribution component - supports both Unsplash and Pexels
 * Displays photographer credit and source link
 */
export default function UnsplashAttribution({ attribution, style }: UnsplashAttributionProps) {
  if (!attribution) return null;

  // Determine the source (Pexels or Unsplash)
  const isPexels = !!attribution.pexelsUrl;
  const sourceUrl = attribution.pexelsUrl || attribution.unsplashUrl || '#';
  const sourceName = isPexels ? 'Pexels' : 'Unsplash';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        zIndex: 20,
        fontSize: '10px',
        color: 'rgba(255,255,255,0.6)',
        ...style,
      }}
    >
      Photo by{' '}
      <a
        href={attribution.photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}
      >
        {attribution.photographerName}
      </a>{' '}
      on{' '}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}
      >
        {sourceName}
      </a>
    </div>
  );
}
