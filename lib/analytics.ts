import "server-only";
import { readPrivateJson, writePrivateJson, ensurePrivateBucket } from "./private-store";
import { supabaseAdmin, supabaseIsConfigured, withTimeout } from "./supabase";

// Website analytics: events are saved in the Supabase database (table analytics_events, set up by
// supabase/analytics.sql) and summarised by its functions for Admin → Analytics. Whether tracking is
// on is a setting saved in the private bucket (settings/analytics.json).

const SETTINGS_PATH = "settings/analytics.json";
export type AnalyticsSettings = { enabled: boolean };

let cached: { at: number; value: AnalyticsSettings } | undefined;

export async function analyticsSettings(fresh = false): Promise<AnalyticsSettings> {
  if (!supabaseIsConfigured()) return { enabled: false };
  if (!fresh && cached && Date.now() - cached.at < 60_000) return cached.value;
  const value = { enabled: false, ...((await readPrivateJson<AnalyticsSettings>(SETTINGS_PATH).catch(() => undefined)) ?? {}) };
  cached = { at: Date.now(), value };
  return value;
}

export async function saveAnalyticsSettings(settings: AnalyticsSettings): Promise<void> {
  await ensurePrivateBucket();
  await writePrivateJson(SETTINGS_PATH, settings);
  cached = { at: Date.now(), value: settings };
}

export type EventRow = {
  type: "pageview" | "leave" | "click";
  visitor_id: string;
  session_id: string;
  entry?: boolean;
  path: string;
  title?: string | null;
  referrer?: string | null;
  ref_domain?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  device?: string;
  browser?: string;
  os?: string;
  screen_w?: number | null;
  duration_ms?: number | null;
  scroll_pct?: number | null;
  target?: string | null;
  target_kind?: string | null;
  target_label?: string | null;
};

export async function recordEvents(rows: EventRow[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await withTimeout(supabaseAdmin().from("analytics_events").insert(rows));
  if (error) throw error;
}

// ---------- Reports ----------

export type Range = { from: Date; to: Date; unit: "hour" | "day" | "week" | "month" };

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T[]> {
  const { data, error } = await withTimeout(supabaseAdmin().rpc(fn, args), 15_000);
  if (error) throw error;
  return (data ?? []) as T[];
}

// True if the database hasn't been set up yet (the setup script hasn't been run).
export function isMissingSetup(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === "PGRST202" || e?.code === "42P01" || e?.code === "42883" || /could not find the function|does not exist|schema cache/i.test(e?.message ?? "");
}

const span = (r: Range) => ({ p_from: r.from.toISOString(), p_to: r.to.toISOString() });

export type Overview = { visitors: number; sessions: number; pageviews: number; bounce_rate: number | null; avg_visit_seconds: number | null };
export type SeriesPoint = { bucket: string; visitors: number; pageviews: number };
export type PageRow = { path: string; pageviews: number; visitors: number; avg_seconds: number | null; avg_scroll: number | null; entries: number; exits: number };
export type BreakdownRow = { label: string; visitors: number; pageviews: number };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function overview(r: Range): Promise<Overview> {
  const [row] = await rpc<Record<string, unknown>>("analytics_overview", span(r));
  return {
    visitors: Number(row?.visitors ?? 0),
    sessions: Number(row?.sessions ?? 0),
    pageviews: Number(row?.pageviews ?? 0),
    bounce_rate: num(row?.bounce_rate),
    avg_visit_seconds: num(row?.avg_visit_seconds),
  };
}

export async function series(r: Range): Promise<SeriesPoint[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_series", { ...span(r), p_unit: r.unit });
  return rows.map((x) => ({ bucket: String(x.bucket), visitors: Number(x.visitors), pageviews: Number(x.pageviews) }));
}

export async function pages(r: Range, limit = 50): Promise<PageRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_pages", { ...span(r), p_limit: limit });
  return rows.map((x) => ({
    path: String(x.path),
    pageviews: Number(x.pageviews),
    visitors: Number(x.visitors),
    avg_seconds: num(x.avg_seconds),
    avg_scroll: num(x.avg_scroll),
    entries: Number(x.entries),
    exits: Number(x.exits),
  }));
}

export type Dimension = "source" | "campaign" | "medium" | "referrer" | "entry" | "country" | "city" | "device" | "browser" | "os" | "screen";

export async function breakdown(r: Range, dim: Dimension, limit = 20): Promise<BreakdownRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_breakdown", { ...span(r), p_dim: dim, p_limit: limit });
  return rows.map((x) => ({ label: String(x.label), visitors: Number(x.visitors), pageviews: Number(x.pageviews) }));
}

export async function live(): Promise<{ path: string; visitors: number }[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_live");
  return rows.map((x) => ({ path: String(x.path), visitors: Number(x.visitors) }));
}

export async function storageUsed(): Promise<{ bytes: number; events: number; since: string | null }> {
  const [row] = await rpc<Record<string, unknown>>("analytics_storage");
  return { bytes: Number(row?.bytes ?? 0), events: Number(row?.events ?? 0), since: row?.since ? String(row.since) : null };
}
