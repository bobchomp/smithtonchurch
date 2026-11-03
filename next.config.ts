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
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
