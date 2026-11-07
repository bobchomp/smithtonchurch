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
const TYPES = new Set(["pageview", "leave", "click", "media", "search", "form"]);
const MEDIA = new Set(["audio", "video"]);
const FILTERS = ["preacher", "book", "year", "service"];
const MILESTONES = [0, 25, 50, 75, 95];
// "none": a click on something that isn't a link or button (kept only for the heatmaps).
const KINDS = new Set(["internal", "outbound", "download", "phone", "email", "button", "none"]);
const SELECTOR = /^[#\w\-:().>]+$/;

type Incoming = {
  t?: string; p?: string; ti?: string; en?: boolean; r?: string; w?: number;
  us?: string; um?: string; uc?: string; d?: number; sc?: number; k?: string; h?: string; l?: string;
  pc?: number; n?: number; f?: Record<string, unknown>; nf?: boolean; fr?: string; sel?: string; fx?: number; fy?: number;
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

// Where someone came to a missing page from: a page on this website, or another website's address.
function cameFrom(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return refDomain(referrer) ?? url.pathname.slice(0, 300);
  } catch {
    return null;
  }
}

// The extra details kept for sermon plays, sermon searches and missing pages.
function propsFor(e: Incoming): Record<string, unknown> | null {
  if (e.t === "media") {
    const pct = whole(e.pc, 0, 100);
    return { pct: MILESTONES.filter((m) => m <= (pct ?? 0)).pop() ?? 0 };
  }
  if (e.t === "search") {
    const filters: Record<string, string> = {};
    for (const key of FILTERS) {
      const value = text(e.f?.[key], 100);
      if (value) filters[key] = value;
    }
    return { results: whole(e.n, 0, 100_000) ?? 0, ...(Object.keys(filters).length ? { filters } : {}) };
  }
  if (e.t === "pageview" && e.nf) return { nf: true, from: cameFrom(text(e.fr, 500)) };
  if (e.t === "click") {
    // Where on the page, for the heatmaps: the clicked element and the point within it (0 to 1).
    const sel = text(e.sel, 400);
    const fx = typeof e.fx === "number" && Number.isFinite(e.fx) ? Math.min(1, Math.max(0, Math.round(e.fx * 1000) / 1000)) : null;
    const fy = typeof e.fy === "number" && Number.isFinite(e.fy) ? Math.min(1, Math.max(0, Math.round(e.fy * 1000) / 1000)) : null;
    return sel && SELECTOR.test(sel) && fx !== null && fy !== null ? { sel, fx, fy } : null;
  }
  return null;
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
    if (e.t === "media" && (!e.k || !MEDIA.has(e.k) || !text(e.h, 300)?.startsWith("/"))) continue;
    if (e.t === "search" && !text(e.l, 100) && !e.f) continue;
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
      target: e.t === "click" ? text(e.h, 500) : e.t === "media" ? text(e.h, 300) : null,
      target_kind: e.t === "click" && e.k && KINDS.has(e.k) ? e.k : e.t === "media" ? e.k! : null,
      target_label: e.t === "click" || e.t === "media" ? text(e.l, 200) : e.t === "search" ? text(e.l, 100) : e.t === "form" ? text(e.l, 40) : null,
      props: propsFor(e),
    });
  }
  try {
    await recordEvents(rows);
  } catch (error) {
    console.error("Could not record analytics", error);
  }
  return Response.json({ on: true });
}
