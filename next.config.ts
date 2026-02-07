import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

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

export default async function config() {
  // Required so `getRequestContext()` works when running `next dev` locally.
  if (process.env.NODE_ENV === "development") {
    await setupDevPlatform();
  }
  return nextConfig;
}
