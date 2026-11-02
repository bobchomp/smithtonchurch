import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

const pages = ["", "about-us", "our-vision", "team", "weekly-devotional", "community", "missions", "conferencing-venue-inverness", "giving"];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((page) => ({ url: `${site.url}/${page ? `${page}/` : ""}` }));
}
