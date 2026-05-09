import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: () => {
    return {}
  },
};

export default nextConfig;