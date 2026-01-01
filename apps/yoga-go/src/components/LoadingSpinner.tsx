'use client';

import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizes = {
  sm: 32,
  md: 48,
  lg: 64,
};

export default function LoadingSpinner({
  size = 'md',
  message,
  className = '',
}: LoadingSpinnerProps) {
  const imgSize = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Image
        src="/loading.png"
        alt="Loading"
        width={imgSize}
        height={imgSize}
        style={{
          animation: 'spin 3s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
    </div>
  );
}
