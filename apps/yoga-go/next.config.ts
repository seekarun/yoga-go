import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    // Use unoptimized images to bypass Next.js image optimization API
    // This serves images directly from /public without going through /_next/image
    unoptimized: true,
  },
};

export default nextConfig;
