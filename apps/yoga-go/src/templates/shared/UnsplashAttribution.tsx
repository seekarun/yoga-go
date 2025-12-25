import type { UnsplashAttribution as UnsplashAttributionType } from '../types';

interface UnsplashAttributionProps {
  attribution: UnsplashAttributionType;
  style?: React.CSSProperties;
}

export default function UnsplashAttribution({ attribution, style }: UnsplashAttributionProps) {
  if (!attribution) return null;

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
        href={attribution.unsplashUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}
      >
        Unsplash
      </a>
    </div>
  );
}
