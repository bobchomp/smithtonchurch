import { NextResponse } from "next/server";
import { saveFlipbookEvents } from "@/lib/flipbook";
import { verifyWebhook, type WebhookPayload } from "@/lib/flipbook-server";

// Views, page views and link clicks from the flipbook viewer, sent by
// https://newsletter.smithtonchurch.com as they happen. Each delivery is signed with
// FLIPBOOK_WEBHOOK_SECRET (the "Flipbook-Signature" header), so nobody else can add events.
// Anything but a 2xx reply makes the flipbook send the batch again later, so a failed save loses nothing.
export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000; // 100 events is far less than this

export async function POST(request: Request) {
  const secret = process.env.FLIPBOOK_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Webhook not set up" }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
  if (!(await verifyWebhook(raw, request.headers.get("flipbook-signature"), secret))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const events = Array.isArray(payload?.events) ? payload.events : [];
  // A test delivery from the flipbook site's Developers page: say it worked, but don't keep it.
  if (payload.test) return NextResponse.json({ ok: true, test: true, received: events.length });
  try {
    await saveFlipbookEvents(events);
  } catch (error) {
    console.error("Couldn't save flipbook events", error);
    return NextResponse.json({ error: "Couldn't save the events just now" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, received: events.length });
}
