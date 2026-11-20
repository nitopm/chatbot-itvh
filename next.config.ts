import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimizaciones para Vercel Serverless
  serverExternalPackages: ["@google/generative-ai"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

