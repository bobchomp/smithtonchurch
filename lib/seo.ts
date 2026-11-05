import type { Metadata } from "next";
import { site } from "./content";

// Search and sharing details for a page: its canonical address (always on smithtonchurch.com, from
// content/site.yml) and the Open Graph tags used when it's shared on Facebook, WhatsApp and so on.
export const SHARE_IMAGE = { url: "/images/og-image.jpg", width: 1200, height: 630, alt: "Smithton Church, Inverness" };

export function pageMetadata(path: string, meta: Metadata & { title?: string | { absolute: string } }): Metadata {
  const title = typeof meta.title === "string" ? `${meta.title} | ${site.title}` : meta.title?.absolute ?? `${site.title}, Inverness`;
  const description = meta.description ?? site.description;
  return {
    ...meta,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.title,
      locale: "en_GB",
      url: path,
      title,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE.url] },
  };
}
