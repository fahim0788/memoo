/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Désactiver la télémétrie Next.js
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configuration pour API-only (pas de pages statiques)
  experimental: {
    // Optimisation pour API routes
  },
};

export default nextConfig;
