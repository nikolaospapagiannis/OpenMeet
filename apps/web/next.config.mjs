/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static page generation completely - all pages are dynamic
  // DO NOT use 'output: standalone' as it triggers static export

  // Disable Next.js telemetry
  telemetry: false,

  // ESLint configuration for build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Image optimization
  images: {
    domains: ['localhost', 'api.nebula-ai.com'],
    unoptimized: true, // Disable optimization for Docker
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5003',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:4200',
  },

  // API Rewrites - Proxy API calls to backend server
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
    return [
      // Admin API routes
      {
        source: '/api/admin/:path*',
        destination: `${apiUrl}/api/admin/:path*`,
      },
      // All other API routes (except auth which has local handlers)
      {
        source: '/api/meetings/:path*',
        destination: `${apiUrl}/api/meetings/:path*`,
      },
      {
        source: '/api/organizations/:path*',
        destination: `${apiUrl}/api/organizations/:path*`,
      },
      {
        source: '/api/billing/:path*',
        destination: `${apiUrl}/api/billing/:path*`,
      },
      {
        source: '/api/analytics/:path*',
        destination: `${apiUrl}/api/analytics/:path*`,
      },
      {
        source: '/api/recordings/:path*',
        destination: `${apiUrl}/api/recordings/:path*`,
      },
      {
        source: '/api/transcriptions/:path*',
        destination: `${apiUrl}/api/transcriptions/:path*`,
      },
      {
        source: '/api/intelligence/:path*',
        destination: `${apiUrl}/api/intelligence/:path*`,
      },
      {
        source: '/api/video/:path*',
        destination: `${apiUrl}/api/video/:path*`,
      },
      {
        source: '/api/live/:path*',
        destination: `${apiUrl}/api/live/:path*`,
      },
      {
        source: '/api/ai/:path*',
        destination: `${apiUrl}/api/ai/:path*`,
      },
      {
        source: '/api/ai-apps/:path*',
        destination: `${apiUrl}/api/ai-apps/:path*`,
      },
      {
        source: '/api/coaching/:path*',
        destination: `${apiUrl}/api/coaching/:path*`,
      },
      {
        source: '/api/templates/:path*',
        destination: `${apiUrl}/api/templates/:path*`,
      },
      {
        source: '/api/notifications/:path*',
        destination: `${apiUrl}/api/notifications/:path*`,
      },
      {
        source: '/api/webhooks/:path*',
        destination: `${apiUrl}/api/webhooks/:path*`,
      },
      {
        source: '/api/developer/:path*',
        destination: `${apiUrl}/api/developer/:path*`,
      },
      {
        source: '/api/sso/:path*',
        destination: `${apiUrl}/api/sso/:path*`,
      },
      {
        source: '/api/team-management/:path*',
        destination: `${apiUrl}/api/team-management/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
      // Health check
      {
        source: '/api/health',
        destination: `${apiUrl}/health`,
      },
    ];
  },

  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
