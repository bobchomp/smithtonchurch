import { analyticsSettings, recordEvents, type EventRow } from "@/lib/analytics";
import { describeAgent, isBot } from "@/lib/analytics-ua";
import { MAIN_HOSTS } from "@/lib/domains";

// Receives analytics events from the public pages (components/Analytics.tsx). Nothing is recorded
// when tracking is off, for people who chose "Don't count me" (or whose browser sends Global Privacy
// Control), for signed-in admins, or for bots. IP addresses are never stored: the visitor's town
// comes from Vercel's location headers.

export const dynamic = "force-dynamic";

const countries = new Intl.DisplayNames(["en-GB"], { type: "region" });
const MAX_EVENTS = 25;
const ID = /^[a-z0-9-]{8,40}$/i;
const TYPES = new Set(["pageview", "leave", "click"]);
const KINDS = new Set(["internal", "outbound", "download", "phone", "email", "button"]);

type Incoming = {
  t?: string; p?: string; ti?: string; en?: boolean; r?: string; w?: number;
  us?: string; um?: string; uc?: string; d?: number; sc?: number; k?: string; h?: string; l?: string;
};

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const whole = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : null;

function cookie(header: string | null, name: string): string | undefined {
  return header?.split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
}

function refDomain(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    return MAIN_HOSTS.includes(host) || host.endsWith(".vercel.app") ? null : host;
  } catch {
    return null;
  }
}

function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(request: Request) {
  const { enabled } = await analyticsSettings();
  const off = () => Response.json({ on: false });
  if (!enabled) return off();
  const cookies = request.headers.get("cookie");
  const ua = request.headers.get("user-agent") ?? "";
  if (cookie(cookies, "sc_consent") === "no" || cookie(cookies, "sc_admin") === "1" || request.headers.get("sec-gpc") === "1") return off();
  if (isBot(ua)) return Response.json({ on: true });

  let body: { v?: string; s?: string; e?: Incoming[] };
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return new Response("Too large", { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!ID.test(body.v ?? "") || !ID.test(body.s ?? "") || !Array.isArray(body.e)) return new Response("Bad request", { status: 400 });

  const h = request.headers;
  const code = h.get("x-vercel-ip-country");
  let country: string | null = null;
  try {
    country = code ? (countries.of(code.toUpperCase()) ?? code) : null;
  } catch {
    country = code;
  }
  const place = { country, region: decode(h.get("x-vercel-ip-country-region")), city: decode(h.get("x-vercel-ip-city")) };

  const rows: EventRow[] = [];
  for (const e of body.e.slice(0, MAX_EVENTS)) {
    const path = text(e.p, 300);
    if (!e.t || !TYPES.has(e.t) || !path || !path.startsWith("/") || path.startsWith("/admin")) continue;
    const width = whole(e.w, 100, 10_000);
    const referrer = e.en ? text(e.r, 500) : null;
    rows.push({
      type: e.t as EventRow["type"],
      visitor_id: body.v!,
      session_id: body.s!,
      entry: Boolean(e.en && e.t === "pageview"),
      path,
      title: text(e.ti, 200),
      referrer: refDomain(referrer) ? referrer : null,
      ref_domain: refDomain(referrer),
      utm_source: e.en ? text(e.us, 100)?.toLowerCase() ?? null : null,
      utm_medium: e.en ? text(e.um, 100)?.toLowerCase() ?? null : null,
      utm_campaign: e.en ? text(e.uc, 100) : null,
      ...place,
      ...describeAgent(ua, width ?? undefined),
      screen_w: width,
      duration_ms: e.t === "leave" ? whole(e.d, 0, 6 * 60 * 60 * 1000) : null,
      scroll_pct: e.t === "leave" ? whole(e.sc, 0, 100) : null,
      target: e.t === "click" ? text(e.h, 500) : null,
      target_kind: e.t === "click" && e.k && KINDS.has(e.k) ? e.k : null,
      target_label: e.t === "click" ? text(e.l, 120) : null,
    });
  }
  try {
    await recordEvents(rows);
  } catch (error) {
    console.error("Could not record analytics", error);
  }
  return Response.json({ on: true });
}
