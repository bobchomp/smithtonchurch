import type { Metadata } from "next";
import DocumentsAdmin from "../_documents/DocumentsAdmin";

export const metadata: Metadata = { title: "Weekly Bulletin" };

export default async function BulletinAdmin({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  return <DocumentsAdmin kind="bulletin" findDate={(await searchParams).date} />;
}
