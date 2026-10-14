import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Names this build. The installed app compares it with what the server is
    // running and reloads itself after a new deploy (see ServiceWorkerRegistrar).
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()),
  },
};

export default nextConfig;
