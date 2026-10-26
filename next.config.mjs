/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    // Strip console.log, console.warn, and console.info from production bundles.
    // console.error is preserved for genuine runtime error diagnostics.
    removeConsole: {
      exclude: ["error"],
    },
  },
  allowedDevOrigins: [
    "*.tomesphere.in",
    "*.vercel.app"
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.tomesphere.in",
        "*.vercel.app"
      ],
    },
  },
  turbopack: {}, // Empty turbopack config to silence warning
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 10 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 1,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qusuvzwycdmnecixzsgc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/books/:slug",
        destination: "/book/:slug",
        permanent: true,
      },
      {
        source: "/discover/search",
        destination: "/search",
        permanent: true,
      },
      {
        source: "/profile",
        destination: "/me/profile",
        permanent: true,
      },
      {
        source: "/help",
        destination: "/support",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
