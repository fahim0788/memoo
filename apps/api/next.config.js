/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Strip console.log/info/debug in production builds (keep error & warn)
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
