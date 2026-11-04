import type { Metadata } from "next";
import DocumentsAdmin from "../_documents/DocumentsAdmin";

export const metadata: Metadata = { title: "Marsali’s Musings" };

export default async function MusingsAdmin({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  return <DocumentsAdmin kind="musings" findDate={(await searchParams).date} />;
}
