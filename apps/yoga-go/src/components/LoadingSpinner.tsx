'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizes = {
  sm: { width: 24, height: 24, border: 2 },
  md: { width: 40, height: 40, border: 3 },
  lg: { width: 48, height: 48, border: 4 },
};

export default function LoadingSpinner({
  size = 'md',
  message,
  className = '',
}: LoadingSpinnerProps) {
  const { width, height, border } = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: `${border}px solid #e5e7eb`,
          borderTop: `${border}px solid var(--color-primary)`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
    </div>
  );
}
