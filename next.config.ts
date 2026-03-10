import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: 50 * 1024 * 1024, // 50MB
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
