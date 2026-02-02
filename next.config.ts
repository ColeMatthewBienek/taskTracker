import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // We'll lint in CI separately; Cloudflare builds shouldn't fail due to eslint config issues.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
