import type { NextConfig } from "next";

// Conservative security headers. No Content-Security-Policy here: it would
// need to allow Next's inline runtime/style nonces and is better owned by
// the edge proxy (Traefik) in production.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Workspace packages ship as raw TypeScript; Next transpiles them.
  transpilePackages: ["@helix/types"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
