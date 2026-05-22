import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship as raw TypeScript; Next transpiles them.
  transpilePackages: ["@helix/types"],
};

export default nextConfig;
