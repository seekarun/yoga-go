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
  // Rewrites to serve public files from static directory (for Vercel monorepo)
  async rewrites() {
    return [
      {
        source: '/myg.png',
        destination: '/_next/static/public/myg.png',
      },
      {
        source: '/cover.png',
        destination: '/_next/static/public/cover.png',
      },
      {
        source: '/yg_teach1.jpg',
        destination: '/_next/static/public/yg_teach1.jpg',
      },
      {
        source: '/images/:path*',
        destination: '/_next/static/public/images/:path*',
      },
    ];
  },
};

export default nextConfig;
