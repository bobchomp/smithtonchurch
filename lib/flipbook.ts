import "server-only";
import { DOCUMENT_TYPES, documentId, type DocumentKind, type PublicDocument } from "./document-types";
import { SITE_HOST } from "./domains";
import { createFlipbookClient, type FlipbookEvent } from "./flipbook-server";
import { getSetting, isMissingTable, setSetting, tableReady } from "./db";
import { supabaseAdmin, withTimeout } from "./supabase";

// The flipbook viewer for bulletins and newsletters (https://newsletter.smithtonchurch.com).
// The website asks it for a viewer link with the secret key (FLIPBOOK_API_KEY, server only) and
// shows that link in a frame. Views, page views and link clicks come back by webhook
// (app/api/flipbook/webhook) and the catch-up sync below, into the flipbook_events table.

export const FLIPBOOK_ORIGIN = "https://newsletter.smithtonchurch.com";

export function flipbookIsConfigured(): boolean {
  return Boolean(process.env.FLIPBOOK_API_KEY?.trim());
}

function client() {
  // FLIPBOOK_BASE_URL is only for testing against a stand-in server.
  return createFlipbookClient({ apiKey: process.env.FLIPBOOK_API_KEY!.trim(), baseUrl: process.env.FLIPBOOK_BASE_URL || FLIPBOOK_ORIGIN });
}

// Viewer links last a day; each server reuses one until it has less than two hours left.
const LIFETIME = 24 * 3600;
const RENEW_BEFORE = 2 * 3600 * 1000;
const links = new Map<string, { url: string; pdf: string; title: string; expires: number }>();

// A viewer link for a document, or null if the flipbook isn't set up or can't be reached (the page
// then offers the PDF instead).
export async function viewerUrl(kind: DocumentKind, doc: PublicDocument): Promise<string | null> {
  if (!flipbookIsConfigured() || !doc.date) return null;
  const id = documentId(kind, doc.date);
  // The old copies kept with the website are addressed from its own domain.
  const pdf = doc.url.startsWith("/") ? `https://www.${SITE_HOST}${doc.url}` : doc.url;
  const title = `${DOCUMENT_TYPES[kind].title}: ${doc.label}`;
  const cached = links.get(id);
  if (cached && cached.pdf === pdf && cached.title === title && cached.expires - Date.now() > RENEW_BEFORE) return cached.url;
  try {
    const token = await withTimeout(client().createViewerToken({ document: { id, title, url: pdf }, expiresIn: LIFETIME }), 8_000);
    links.set(id, { url: token.url, pdf, title, expires: Date.parse(token.expiresAt) });
    return token.url;
  } catch (error) {
    console.error(`Couldn't get a flipbook viewer link for ${id}`, error);
    return null;
  }
}

// ---------- Stats ----------

// Saves events, skipping any already stored (webhook batches can arrive twice, and the catch-up
// sync can fetch events the webhook already delivered). Throws if they couldn't be saved.
export async function saveFlipbookEvents(events: FlipbookEvent[]): Promise<void> {
  const rows = events
    .filter((e) => typeof e?.id === "string" && e.id && typeof e.occurredAt === "string" && e.document?.id)
    .map((e) => ({
      id: e.id.slice(0, 100),
      sequence: Number.isSafeInteger(e.sequence) ? e.sequence : null,
      type: String(e.type).slice(0, 40),
      occurred_at: e.occurredAt,
      view_id: e.viewId ? String(e.viewId).slice(0, 100) : null,
      document_id: String(e.document.id).slice(0, 200),
      document_title: e.document.title ? String(e.document.title).slice(0, 300) : null,
      page_number: Number.isSafeInteger(e.pageNumber) ? e.pageNumber : null,
      url: e.url ? String(e.url).slice(0, 2000) : null,
      visitor: e.visitor ?? null,
    }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await withTimeout(
      supabaseAdmin().from("flipbook_events").upsert(rows.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true }),
      15_000,
    );
    if (error) throw error;
  }
}

const CURSOR = "flipbook.cursor";
let lastSync = 0;

// Catch-up: fetches every event since the last one fetched this way (the flipbook keeps them for
// 30 days), in case the webhook missed any. Run by the daily cron job and when the stats are opened.
// Returns how many events it fetched, or null if it didn't run.
export async function syncFlipbookEvents({ minGapSeconds = 0 } = {}): Promise<number | null> {
  if (!flipbookIsConfigured()) return null;
  if (Date.now() - lastSync < minGapSeconds * 1000) return null;
  lastSync = Date.now();
  try {
    if (!(await tableReady("flipbook_events"))) return null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  let cursor = (await getSetting<{ after: string }>(CURSOR))?.after ?? "0";
  let fetched = 0;
  // At most 20 pages (10,000 events) a run, so it always finishes in good time; the next run carries on.
  for (let page = 0; page < 20; page++) {
    const result = await withTimeout(client().listEvents({ after: cursor, limit: 500 }), 15_000);
    if (result.events.length) await saveFlipbookEvents(result.events);
    fetched += result.events.length;
    if (result.nextCursor && result.nextCursor !== cursor) {
      cursor = result.nextCursor;
      await setSetting(CURSOR, { after: cursor, at: new Date().toISOString() });
    }
    if (!result.hasMore) break;
  }
  return fetched;
}
