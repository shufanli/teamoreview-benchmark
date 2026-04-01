import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: "/teamoreview",
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://${process.env.BACKEND_HOST || "localhost"}:8000/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
