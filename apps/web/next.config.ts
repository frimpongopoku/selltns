import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/demo", destination: "/akosua", permanent: false },
      { source: "/demo/:path*", destination: "/akosua/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
