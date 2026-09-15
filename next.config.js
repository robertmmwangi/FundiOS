const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: { document: "/offline" },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkFirst",
      options: { cacheName: "supabase-api", networkTimeoutSeconds: 3 },
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: "NetworkFirst",
      options: { cacheName: "app-api", networkTimeoutSeconds: 3 },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: "CacheFirst",
      options: { cacheName: "images" },
    },
  ],
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
};

module.exports = withPWA(nextConfig);
