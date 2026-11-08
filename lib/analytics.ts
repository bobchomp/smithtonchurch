import "server-only";
import type { GoalCondition, GoalsConfig } from "./analytics-goals";
import { getSetting, setSetting } from "./db";
import { supabaseAdmin, supabaseIsConfigured, withTimeout } from "./supabase";

// Website analytics: events are saved in the Supabase database (table analytics_events, set up by
// supabase/setup.sql) and summarised by its functions for Admin → Analytics. Whether tracking is
// on is a setting saved in the private bucket (settings/analytics.json).

const SETTINGS_PATH = "settings/analytics.json";
export type AnalyticsSettings = { enabled: boolean };

let cached: { at: number; value: AnalyticsSettings } | undefined;

export async function analyticsSettings(fresh = false): Promise<AnalyticsSettings> {
  if (!supabaseIsConfigured()) return { enabled: false };
  if (!fresh && cached && Date.now() - cached.at < 60_000) return cached.value;
  const value = { enabled: false, ...((await getSetting<AnalyticsSettings>("analytics", SETTINGS_PATH).catch(() => undefined)) ?? {}) };
  cached = { at: Date.now(), value };
  return value;
}

export async function saveAnalyticsSettings(settings: AnalyticsSettings): Promise<void> {
  await setSetting("analytics", settings, SETTINGS_PATH);
  cached = { at: Date.now(), value: settings };
}

export type EventRow = {
  type: "pageview" | "leave" | "click" | "media" | "search" | "form";
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
  props?: Record<string, unknown> | null;
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

// ---------- Phase 2 reports ----------

const n0 = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

export type ClickKind = "internal" | "outbound" | "download" | "phone" | "email" | "button";
export type ClickRow = { kind: string; target: string | null; label: string | null; clicks: number; visitors: number; pages: number };

export async function clicks(r: Range, kind: ClickKind | null, limit = 50): Promise<ClickRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_clicks", { ...span(r), p_kind: kind, p_limit: limit });
  return rows.map((x) => ({ kind: String(x.kind), target: str(x.target), label: str(x.label), clicks: n0(x.clicks), visitors: n0(x.visitors), pages: n0(x.pages) }));
}

export async function clickKinds(r: Range): Promise<{ kind: string; clicks: number; visitors: number }[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_click_kinds", span(r));
  return rows.map((x) => ({ kind: String(x.kind), clicks: n0(x.clicks), visitors: n0(x.visitors) }));
}

export type SermonPlays = { plays: number; audio: number; video: number; listeners: number; avg_progress: number | null; finished: number };
export type SermonRow = SermonPlays & { path: string; title: string | null };

const plays = (x: Record<string, unknown>): SermonPlays => ({
  plays: n0(x.plays),
  audio: n0(x.audio),
  video: n0(x.video),
  listeners: n0(x.listeners),
  avg_progress: num(x.avg_progress),
  finished: n0(x.finished),
});

export async function sermonPlays(r: Range, limit = 50): Promise<SermonRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_sermons", { ...span(r), p_limit: limit });
  return rows.map((x) => ({ path: String(x.path), title: str(x.title), ...plays(x) }));
}

export async function sermonTotals(r: Range): Promise<SermonPlays> {
  const [row] = await rpc<Record<string, unknown>>("analytics_sermon_totals", span(r));
  return plays(row ?? {});
}

export type SearchRow = { term: string; searches: number; visitors: number; avg_results: number | null; no_results: number };

export async function searches(r: Range, limit = 50): Promise<SearchRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_searches", { ...span(r), p_limit: limit });
  return rows.map((x) => ({ term: String(x.term), searches: n0(x.searches), visitors: n0(x.visitors), avg_results: num(x.avg_results), no_results: n0(x.no_results) }));
}

export async function searchFilters(r: Range, limit = 50): Promise<{ filter: string; value: string; uses: number }[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_search_filters", { ...span(r), p_limit: limit });
  return rows.map((x) => ({ filter: String(x.filter), value: String(x.value), uses: n0(x.uses) }));
}

export type MissingRow = { path: string; views: number; visitors: number; last_seen: string; came_from: string | null };

export async function notFound(r: Range, limit = 100): Promise<MissingRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_not_found", { ...span(r), p_limit: limit });
  return rows.map((x) => ({ path: String(x.path), views: n0(x.views), visitors: n0(x.visitors), last_seen: String(x.last_seen), came_from: str(x.came_from) }));
}

export type FlowRow = { direction: "from" | "to"; label: string; visits: number };

export async function pageFlow(r: Range, path: string, limit = 10): Promise<FlowRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_page_flow", { ...span(r), p_path: path, p_limit: limit });
  return rows.map((x) => ({ direction: x.direction === "to" ? "to" : "from", label: String(x.label), visits: n0(x.visits) }));
}

export async function journeys(r: Range, steps = 4, limit = 20): Promise<{ journey: string; visits: number; visitors: number }[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_journeys", { ...span(r), p_steps: steps, p_limit: limit });
  return rows.map((x) => ({ journey: String(x.journey), visits: n0(x.visits), visitors: n0(x.visitors) }));
}

export type VisitRow = {
  started: string; source: string | null; place: string | null; device: string | null; browser: string | null;
  pages: string[]; seconds: number | null; returning: boolean;
};

export async function visits(r: Range, limit = 30, offset = 0): Promise<VisitRow[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_visits", { ...span(r), p_limit: limit, p_offset: offset });
  return rows.map((x) => ({
    started: String(x.started),
    source: str(x.source),
    place: str(x.place),
    device: str(x.device),
    browser: str(x.browser),
    pages: Array.isArray(x.pages) ? x.pages.map(String) : [],
    seconds: num(x.seconds),
    returning: Boolean(x.returning_visitor),
  }));
}

// Every event in a period, oldest first, a page at a time (for the CSV download).
export async function* allEvents(r: Range): AsyncGenerator<Record<string, unknown>[]> {
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await withTimeout(
      supabaseAdmin()
        .from("analytics_events")
        .select("*")
        .gte("created_at", r.from.toISOString())
        .lt("created_at", r.to.toISOString())
        .order("id")
        .range(from, from + size - 1),
      20_000,
    );
    if (error) throw error;
    if (!data?.length) return;
    yield data as Record<string, unknown>[];
    if (data.length < size) return;
  }
}

// ---------- Phase 3: goals, funnels, heatmaps and the flow diagram ----------

const GOALS_PATH = "settings/analytics-goals.json";

export async function loadGoals(): Promise<GoalsConfig> {
  // Throws if they can't be read, so a failed read is never saved over them.
  const saved = await getSetting<Partial<GoalsConfig>>("analytics.goals", GOALS_PATH);
  return { goals: saved?.goals ?? [], funnels: saved?.funnels ?? [] };
}

export async function saveGoals(config: GoalsConfig): Promise<void> {
  await setSetting("analytics.goals", config, GOALS_PATH);
}

export type FunnelResult = { step: number; visits: number; visitors: number }[];

// Visits that did each step in order (a goal is a funnel with one step).
export async function funnel(r: Range, steps: GoalCondition[]): Promise<FunnelResult> {
  const rows = await rpc<Record<string, unknown>>("analytics_funnel", { ...span(r), p_steps: steps });
  return rows.map((x) => ({ step: n0(x.step), visits: n0(x.visits), visitors: n0(x.visitors) }));
}

export async function goalSources(r: Range, goal: GoalCondition, limit = 10): Promise<{ kind: "source" | "entry"; label: string; visits: number }[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_goal_sources", { ...span(r), p_goal: goal, p_limit: limit });
  return rows.map((x) => ({ kind: x.kind === "entry" ? "entry" : "source", label: String(x.label), visits: n0(x.visits) }));
}

export const SCREEN_SIZES = [
  { key: "phone", label: "Phones", min: 0, max: 768, width: 390, viewport: 760 },
  { key: "tablet", label: "Tablets", min: 768, max: 1024, width: 820, viewport: 1100 },
  { key: "desktop", label: "Computers", min: 1024, max: 100_000, width: 1440, viewport: 860 },
] as const;
export type ScreenSize = (typeof SCREEN_SIZES)[number];

export async function heatmapClicks(r: Range, path: string, size: ScreenSize, limit = 5000): Promise<{ sel: string; fx: number; fy: number; kind: string | null }[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_heatmap", { ...span(r), p_path: path, p_min_w: size.min, p_max_w: size.max, p_limit: limit });
  return rows.map((x) => ({ sel: String(x.sel), fx: Number(x.fx), fy: Number(x.fy), kind: str(x.kind) }));
}

export async function scrollReach(r: Range, path: string, size: ScreenSize): Promise<{ pct: number; share: number; total: number }[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_scroll_reach", { ...span(r), p_path: path, p_min_w: size.min, p_max_w: size.max });
  return rows.map((x) => ({ pct: n0(x.pct), share: n0(x.total) ? n0(x.views) / n0(x.total) : 0, total: n0(x.total) }));
}

export type FlowLink = { step: number; source: string; target: string; visits: number };

export async function flow(r: Range, steps = 4, nodes = 6): Promise<FlowLink[]> {
  const rows = await rpc<Record<string, unknown>>("analytics_flow", { ...span(r), p_steps: steps, p_nodes: nodes });
  return rows.map((x) => ({ step: n0(x.step), source: String(x.source), target: String(x.target), visits: n0(x.visits) }));
}

// ---------- Checking the set-up ----------

// Every report function, with harmless arguments, and the tab that needs it. Used to say exactly what's
// missing when the setup script hasn't been run (or re-run since new reports were added).
const REPORT_FUNCTIONS: { fn: string; tab: string; args: (r: Range) => Record<string, unknown> }[] = [
  { fn: "analytics_overview", tab: "Overview", args: span },
  { fn: "analytics_series", tab: "Overview", args: (r) => ({ ...span(r), p_unit: "day" }) },
  { fn: "analytics_breakdown", tab: "Overview", args: (r) => ({ ...span(r), p_dim: "source", p_limit: 1 }) },
  { fn: "analytics_live", tab: "Overview", args: () => ({}) },
  { fn: "analytics_storage", tab: "Overview", args: () => ({}) },
  { fn: "analytics_pages", tab: "Pages & journeys", args: (r) => ({ ...span(r), p_limit: 1 }) },
  { fn: "analytics_page_flow", tab: "Pages & journeys", args: (r) => ({ ...span(r), p_path: "/", p_limit: 1 }) },
  { fn: "analytics_journeys", tab: "Pages & journeys", args: (r) => ({ ...span(r), p_steps: 2, p_limit: 1 }) },
  { fn: "analytics_visits", tab: "Pages & journeys", args: (r) => ({ ...span(r), p_limit: 1, p_offset: 0 }) },
  { fn: "analytics_flow", tab: "Pages & journeys", args: (r) => ({ ...span(r), p_steps: 2, p_nodes: 1 }) },
  { fn: "analytics_heatmap", tab: "Heatmaps", args: (r) => ({ ...span(r), p_path: "/", p_min_w: 0, p_max_w: 1, p_limit: 1 }) },
  { fn: "analytics_scroll_reach", tab: "Heatmaps", args: (r) => ({ ...span(r), p_path: "/", p_min_w: 0, p_max_w: 1 }) },
  { fn: "analytics_funnel", tab: "Goals & funnels", args: (r) => ({ ...span(r), p_steps: [{ type: "form" }] }) },
  { fn: "analytics_goal_sources", tab: "Goals & funnels", args: (r) => ({ ...span(r), p_goal: { type: "form" }, p_limit: 1 }) },
  { fn: "analytics_clicks", tab: "Clicks & downloads", args: (r) => ({ ...span(r), p_kind: null, p_limit: 1 }) },
  { fn: "analytics_click_kinds", tab: "Clicks & downloads", args: span },
  { fn: "analytics_sermons", tab: "Sermons", args: (r) => ({ ...span(r), p_limit: 1 }) },
  { fn: "analytics_sermon_totals", tab: "Sermons", args: span },
  { fn: "analytics_searches", tab: "Searches", args: (r) => ({ ...span(r), p_limit: 1 }) },
  { fn: "analytics_search_filters", tab: "Searches", args: (r) => ({ ...span(r), p_limit: 1 }) },
  { fn: "analytics_not_found", tab: "Missing pages", args: (r) => ({ ...span(r), p_limit: 1 }) },
];

// The report functions the database doesn't have yet, and the tabs they're for.
export async function missingReports(): Promise<{ fn: string; tab: string }[]> {
  const now = new Date();
  const r: Range = { from: now, to: now, unit: "day" };
  const results = await Promise.all(
    REPORT_FUNCTIONS.map(async (f) => {
      try {
        await rpc(f.fn, f.args(r));
        return null;
      } catch (error) {
        return isMissingSetup(error) ? { fn: f.fn, tab: f.tab } : null;
      }
    }),
  );
  return results.filter((x): x is { fn: string; tab: string } => x !== null);
}

// When the last visit was recorded (straight from the table, so it works whatever reports exist).
export async function lastRecorded(): Promise<string | null> {
  const { data, error } = await withTimeout(supabaseAdmin().from("analytics_events").select("created_at").order("id", { ascending: false }).limit(1));
  if (error) throw error;
  return data?.[0]?.created_at ?? null;
}

// The last time recording a visit failed, saved by /api/collect so it shows in the admin panel.
const STATUS_PATH = "settings/analytics-status.json";
export type RecordingProblem = { at: string; message: string };

export async function saveRecordingProblem(message: string): Promise<void> {
  await setSetting("analytics.status", { at: new Date().toISOString(), message: message.slice(0, 500) } satisfies RecordingProblem, STATUS_PATH);
}

export async function recordingProblem(): Promise<RecordingProblem | undefined> {
  return getSetting<RecordingProblem>("analytics.status", STATUS_PATH).catch(() => undefined);
}
