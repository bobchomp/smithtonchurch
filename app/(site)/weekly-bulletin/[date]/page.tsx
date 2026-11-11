import type { Metadata } from "next";
import DocumentViewerPage from "@/components/DocumentViewerPage";
import { DOCUMENT_TYPES } from "@/lib/document-types";
import { findPublicDocument } from "@/lib/document-pages";
import { pageMetadata } from "@/lib/seo";

// One bulletin in the flipbook viewer. Built when first visited, then cached; refreshed when
// bulletins are uploaded or deleted in the admin panel, and hourly as a fallback.
export const revalidate = 3600;
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const doc = await findPublicDocument("bulletin", date);
  const title = DOCUMENT_TYPES.bulletin.title;
  return pageMetadata(`/weekly-bulletin/${date}/`, {
    title: doc ? `${title}: ${doc.label}` : title,
    description: doc ? `Read the Smithton Church ${DOCUMENT_TYPES.bulletin.singular} for ${doc.label}.` : undefined,
  });
}

export default async function Page({ params }: Props) {
  const { date } = await params;
  return <DocumentViewerPage kind="bulletin" date={date} />;
}
