import { NextResponse } from "next/server";
import { isDocumentKind } from "@/lib/document-types";
import { findPublicDocument } from "@/lib/document-pages";
import { flipbookIsConfigured, viewerUrl } from "@/lib/flipbook";

// A viewer link for one bulletin or newsletter, for its flipbook page. Only documents the website
// publishes can be asked for (the PDF's address is looked up here, never taken from the request).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "";
  const date = params.get("date") ?? "";
  const headers = { "cache-control": "private, no-store" };
  if (!isDocumentKind(kind)) return NextResponse.json({ error: "Unknown document" }, { status: 404, headers });
  const doc = await findPublicDocument(kind, date);
  if (!doc) return NextResponse.json({ error: "Unknown document" }, { status: 404, headers });
  // Not set up yet (no FLIPBOOK_API_KEY): the page goes straight to the PDF, as before the flipbook.
  if (!flipbookIsConfigured()) return NextResponse.json({ pdf: doc.url, off: true }, { headers });
  const url = await viewerUrl(kind, doc);
  return NextResponse.json(url ? { url } : { pdf: doc.url }, { headers });
}
