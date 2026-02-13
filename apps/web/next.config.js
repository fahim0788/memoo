/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" }
        ]
      }
    ];
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
    // In dev without Docker, proxy storage requests to the API server
    if (apiBase.includes("://")) {
      const storageBase = apiBase.replace(/\/api$/, "");
      return [
        {
          source: "/storage/:path*",
          destination: `${storageBase}/storage/:path*`,
        },
      ];
    }
    return [];
  },
};
module.exports = nextConfig;
