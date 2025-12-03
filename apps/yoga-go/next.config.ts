import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Enable standalone output for Docker builds
  output: 'standalone',
  // Set the root for output file tracing in monorepo
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
