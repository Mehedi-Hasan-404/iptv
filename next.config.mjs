// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows using external image URLs for category icons and channel logos.
  // This is necessary because your image sources will come from the database.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allows any HTTPS hostname.
      },
      {
        protocol: 'http',
        hostname: '**', // Allows any HTTP hostname.
      },
    ],
  },
};

export default nextConfig;
