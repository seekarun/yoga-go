import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@core/types",
    "@core/lib",
    "@core/repositories",
    "@core/components",
    "@core/contexts",
    "@core/hooks",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/images/:path*",
        destination: "/_next/static/public/images/:path*",
      },
    ];
  },
};

export default nextConfig;
