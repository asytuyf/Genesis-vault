import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The single manifest the site used before every page had its own. An app
  // installed back then still asks for it, and gets the Goals one it was.
  async rewrites() {
    return [{ source: "/manifest.webmanifest", destination: "/app-manifest/goals" }];
  },
  env: {
    // Names this build. The installed app compares it with what the server is
    // running and reloads itself after a new deploy (see ServiceWorkerRegistrar).
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()),
  },
};

export default nextConfig;
