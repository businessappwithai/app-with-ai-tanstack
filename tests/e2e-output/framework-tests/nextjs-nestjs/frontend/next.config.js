/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API rewrites for development and production
  // Uses BACKEND_URL env var (localhost:3001 for dev, backend:3001 for Docker)
  // Falls back to config.baseUrl for backward compatibility
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3010";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Enable image optimization for external domains if needed
  images: {
    domains: [],
  },

  // Experimental features
  experimental: {
    // Enable server actions if needed
    // serverActions: true,
  },
};

module.exports = nextConfig;
