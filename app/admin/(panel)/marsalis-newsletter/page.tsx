import type { Metadata } from "next";
import DocumentsAdmin from "../_documents/DocumentsAdmin";

export const metadata: Metadata = { title: "Marsali’s Newsletter" };

export default async function NewsletterAdmin({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  return <DocumentsAdmin kind="newsletter" findDate={(await searchParams).date} />;
}
