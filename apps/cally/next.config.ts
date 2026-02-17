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
  serverExternalPackages: ["@imgly/background-removal", "onnxruntime-web"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent webpack from bundling onnxruntime-web WASM files —
      // the library loads them at runtime from CDN via publicPath
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
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
