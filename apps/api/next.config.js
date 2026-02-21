import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Point Next.js file tracing to the monorepo root so standalone output
  // includes Prisma engine binaries from packages/db/node_modules/.prisma
  outputFileTracingRoot: path.join(__dirname, "../../"),

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
