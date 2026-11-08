import type { NextConfig } from "next";
import { ADMIN_HOST, HIDE_FROM_SEARCH_ENGINES } from "./lib/domains";

const nextConfig: NextConfig = {
  // Files read at run time: the analytics setup script (shown in Admin → Analytics) and the holding slides.
  outputFileTracingIncludes: {
    "/admin/analytics": ["./supabase/setup.sql"],
    "/admin": ["./supabase/setup.sql"],
    // The holding slides (not public: served to signed-in admins by this route).
    "/admin/holding-slides/file/[...path]": ["./holding-slides/**/*"],
  },
  // Keep the trailing slash so page addresses match the old WordPress site (e.g. /about-us/).
  trailingSlash: true,
  // Also covers PDFs and images, which can't carry a noindex tag. See lib/domains.ts.
  async headers() {
    // Only this site and its admin panel (for the analytics heatmaps) may show pages in a frame.
    const framing = { key: "Content-Security-Policy", value: `frame-ancestors 'self' https://${ADMIN_HOST}` };
    const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };
    return [{ source: "/:path*", headers: HIDE_FROM_SEARCH_ENGINES ? [framing, noindex] : [framing] }];
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
