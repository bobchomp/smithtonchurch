import type { MetadataRoute } from "next";
import { site } from "@/lib/content";
import { getPublicSermons } from "@/lib/sermons";

// /sitemap.xml: every public page, including each sermon. Rebuilt hourly so new sermons appear.
export const revalidate = 3600;

const pages = [
  "",
  "about-us",
  "our-vision",
  "team",
  "community",
  "sermons",
  "live",
  "weekly-bulletin",
  "missions",
  "missions/marsalis-newsletter",
  "giving",
  "conferencing-venue",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sermons = await getPublicSermons();
  return [
    ...pages.map((page) => ({ url: `${site.url}/${page ? `${page}/` : ""}` })),
    ...sermons.map((s) => ({ url: `${site.url}${s.path}`, lastModified: s.date })),
  ];
}
