import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

// /robots.txt. Search engines may read every public page. The admin panel and the website's
// background addresses (/api/) aren't for search results. (While the site is on the development
// domain, each page also says "noindex", so it isn't listed; see lib/domains.ts.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
