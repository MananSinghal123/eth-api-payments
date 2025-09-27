import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ this disables ESLint blocking during builds
  },
};

export default nextConfig;
