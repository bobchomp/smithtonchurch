import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the trailing slash so page addresses match the old WordPress site (e.g. /about-us/).
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
