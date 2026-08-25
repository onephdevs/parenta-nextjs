import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
  // Increase API route body size limit for image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/admin/lease-management',
        destination: '/admin/leasing',
        permanent: false,
      },
      {
        source: '/admin/lease-management/:path*',
        destination: '/admin/leasing/:path*',
        permanent: false,
      },
      {
        source: '/admin/leasing/new',
        destination: '/admin/lease-templates/new',
        permanent: false,
      },
      {
        source: '/admin/leasing/:id/edit',
        destination: '/admin/lease-templates/:id/edit',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
