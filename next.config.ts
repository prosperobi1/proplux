import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["yo-yo-pavement-charm.ngrok-free.dev"],
  turbopack: { root: __dirname },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "ngrok-skip-browser-warning", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
