import type { Metadata } from "next";
import DocumentViewerPage from "@/components/DocumentViewerPage";
import { DOCUMENT_TYPES } from "@/lib/document-types";
import { findPublicDocument } from "@/lib/document-pages";
import { pageMetadata } from "@/lib/seo";

// One newsletter in the flipbook viewer. Built when first visited, then cached; refreshed when
// newsletters are uploaded or deleted in the admin panel, and hourly as a fallback.
export const revalidate = 3600;
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  const doc = await findPublicDocument("newsletter", month);
  const title = DOCUMENT_TYPES.newsletter.title;
  return pageMetadata(`/missions/marsalis-newsletter/${month}/`, {
    title: doc ? `${title}: ${doc.label}` : title,
    description: doc ? `Read the Smithton Church ${DOCUMENT_TYPES.newsletter.singular} for ${doc.label}.` : undefined,
  });
}

export default async function Page({ params }: Props) {
  const { month } = await params;
  return <DocumentViewerPage kind="newsletter" date={month} />;
}
