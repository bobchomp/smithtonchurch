import type { NextConfig } from "next";
import { HIDE_FROM_SEARCH_ENGINES } from "./lib/domains";

const nextConfig: NextConfig = {
  // Keep the trailing slash so page addresses match the old WordPress site (e.g. /about-us/).
  trailingSlash: true,
  // Also covers PDFs and images, which can't carry a noindex tag. See lib/domains.ts.
  async headers() {
    if (!HIDE_FROM_SEARCH_ENGINES) return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  // Old addresses that have moved, so existing links and search results still work.
  async redirects() {
    return [
      { source: "/conferencing-venue-inverness", destination: "/conferencing-venue/", permanent: true },
      { source: "/weekly-devotional", destination: "/weekly-bulletin/", permanent: true },
      { source: "/missions/marsalis-musings", destination: "/missions/marsalis-newsletter/", permanent: true },
      { source: "/admin/musings", destination: "/admin/marsalis-newsletter/", permanent: true },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
