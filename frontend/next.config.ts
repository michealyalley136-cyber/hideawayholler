import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: '/api/backend/dashboard/admin',
        destination: '/api/backend/admin-dashboard-stats',
      },
      {
        source: '/api/backend/admin/dashboard',
        destination: '/api/backend/admin-dashboard-stats',
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost', port: '5000', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
