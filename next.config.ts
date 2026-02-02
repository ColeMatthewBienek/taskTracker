import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // We'll lint in CI separately; Cloudflare builds shouldn't fail due to eslint config issues.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Cloudflare Pages builds run full type-checking; keep deploys unblocked.
    // We still want type safety locally/CI.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
