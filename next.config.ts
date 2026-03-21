import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Clerk auth pages
  async redirects() {
    return [];
  },
};

export default nextConfig;
