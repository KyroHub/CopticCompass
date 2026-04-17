import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/securityHeaders";

const securityHeaders = buildSecurityHeaders({
  includeContentSecurityPolicy: false,
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tools.applemediaservices.com",
      },
      {
        protocol: "https",
        hostname: "toolbox.marketingtools.apple.com",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/(.*)": ["public/data/**/*"],
  },
  serverExternalPackages: ["pdf-img-convert"],
};

export default nextConfig;
