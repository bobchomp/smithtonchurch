import "server-only";
import { readPrivateJsonStrict, writePrivateJson, ensurePrivateBucket } from "./private-store";
import { supabaseAdmin, withTimeout } from "./supabase";

// The website's content tables in the Supabase database (created by supabase/setup.sql): sermons,
// live_notices, contact_messages and site_settings. Until the owner has run the setup script, each
// part of the site carries on using the files it used before; the first time a table is used, the
// existing files are copied into it (the files are left alone as a backup).

// rate_limits (lib/rate-limit.ts) and activity_log (lib/activity.ts) are listed so the dashboard asks for the
// setup script until they exist.
export const CONTENT_TABLES = ["sermons", "live_notices", "contact_messages", "site_settings", "rate_limits", "activity_log", "flipbook_events"] as const;
export type ContentTable = (typeof CONTENT_TABLES)[number];

export function db() {
  return supabaseAdmin();
}

// True if a database error just means the table (or function) hasn't been created yet.
export function isMissingTable(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return (
    e?.code === "42P01" ||
    e?.code === "PGRST205" ||
    e?.code === "PGRST202" ||
    /could not find the (table|relation)|relation .* does not exist|schema cache/i.test(e?.message ?? "")
  );
}

// Whether a table exists. Remembered once it does; re-checked every 30 seconds while it doesn't.
const ready = new Map<string, true | number>();
export async function tableReady(table: ContentTable): Promise<boolean> {
  const known = ready.get(table);
  if (known === true) return true;
  if (typeof known === "number" && Date.now() - known < 30_000) return false;
  // A normal one-row read (not a "head" request: for those the library reports a missing table as
  // success, because the reply has no body to say otherwise).
  const { error } = await withTimeout(db().from(table).select("*").limit(1));
  if (!error) {
    ready.set(table, true);
    return true;
  }
  if (isMissingTable(error)) {
    ready.set(table, Date.now());
    return false;
  }
  throw error;
}

// Every row a query returns. The database hands back at most 1,000 rows at a time, so this asks
// for one page after another.
export async function selectAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await withTimeout(query(from, from + size - 1), 20_000);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

// Saves rows in batches (insert, or update those that already exist).
export async function upsertRows(table: ContentTable, rows: Record<string, unknown>[], conflict: string): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await withTimeout(db().from(table).upsert(rows.slice(i, i + 500), { onConflict: conflict }), 20_000);
    if (error) throw error;
  }
}

// ---------- Settings ----------

// A setting. legacyPath: the file in the private bucket it was kept in before; it's copied into the
// database the first time it's read there. Throws if it can't be read (never guesses "empty").
export async function getSetting<T>(key: string, legacyPath?: string): Promise<T | undefined> {
  if (!(await tableReady("site_settings"))) return legacyPath ? readPrivateJsonStrict<T>(legacyPath) : undefined;
  const { data, error } = await withTimeout(db().from("site_settings").select("value").eq("key", key).maybeSingle());
  if (error) throw error;
  if (data) return data.value as T;
  if (!legacyPath) return undefined;
  const old = await readPrivateJsonStrict<T>(legacyPath);
  if (old !== undefined) await setSetting(key, old);
  return old;
}

export async function setSetting(key: string, value: unknown, legacyPath?: string): Promise<void> {
  if (!(await tableReady("site_settings"))) {
    if (!legacyPath) throw new Error("The database hasn’t been set up yet.");
    await ensurePrivateBucket();
    await writePrivateJson(legacyPath, value);
    return;
  }
  const { error } = await withTimeout(
    db().from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" }),
  );
  if (error) throw error;
}

// ---------- Copying the old files in ----------

// Runs `copy` once per table (marked as done in site_settings), so the files are copied in the first
// time the table is used. Safe if two requests do it at once: rows are inserted by their ID.
const copied = new Set<string>();
export async function copyInOnce(table: ContentTable, copy: () => Promise<number>): Promise<void> {
  if (copied.has(table)) return;
  const marker = `copied-from-files.${table}`;
  if (!(await tableReady("site_settings"))) return; // the copy waits until settings can record it
  const done = await getSetting<{ at: string }>(marker);
  if (!done) {
    const count = await copy();
    // Several servers can do this at the same moment (the copy itself is safe to repeat);
    // only the one that records the marker first logs it.
    const { error } = await withTimeout(db().from("site_settings").insert({ key: marker, value: { at: new Date().toISOString(), count } }));
    if (error) {
      if (error.code === "23505") { copied.add(table); return; }
      throw error;
    }
    copied.add(table);
    if (!count) return;
    const { logActivity, SYSTEM } = await import("./activity");
    const names: Record<string, string> = { sermons: "sermons", live_notices: "live notices", contact_messages: "messages" };
    await logActivity({ area: "Database", action: `Copied ${count} ${names[table] ?? table} from the old files into the database` }, SYSTEM);
  }
  copied.add(table);
}
