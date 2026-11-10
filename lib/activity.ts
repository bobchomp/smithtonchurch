import "server-only";
import { currentAdmin } from "./admin-auth";
import { db, selectAll, tableReady } from "./db";
import { withTimeout } from "./supabase";

// The activity log (Admin → Activity Log): everything done in the admin panel, and by the website
// itself, which is recorded as "System". Stored in the database's activity_log table.
// Recording never stops what's being done: if it fails (or the table isn't set up yet), the
// action still happens and the problem is only written to the server log.

export type ActivityArea =
  | "Sign-in"
  | "Account"
  | "Users"
  | "Sermons"
  | "Livestreams"
  | "Bulletins"
  | "Newsletters"
  | "Live notices"
  | "Messages"
  | "Analytics"
  | "Backup"
  | "Database";

export type ActivityEntry = {
  area: ActivityArea;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
};

export type Actor = { id: string | null; name: string };
export const SYSTEM: Actor = { id: null, name: "System" };

// Records something that happened. By default it's put down to whoever is signed in (or System if
// no one is, e.g. the scheduled YouTube check or a visitor sending a message).
export async function logActivity(entry: ActivityEntry, actor?: Actor): Promise<void> {
  try {
    if (!(await tableReady("activity_log"))) return;
    let who = actor;
    if (!who) {
      const admin = await currentAdmin().catch(() => null);
      who = admin ? { id: admin.id, name: admin.kind === "pin" ? "Backup PIN" : admin.name } : SYSTEM;
    }
    const { error } = await withTimeout(
      db()
        .from("activity_log")
        .insert({
          actor_id: who.id,
          actor: who.name.slice(0, 120),
          area: entry.area,
          action: entry.action.slice(0, 300),
          target: entry.target?.slice(0, 300) ?? null,
          details: entry.details ?? null,
        }),
    );
    if (error) throw error;
  } catch (error) {
    console.error("Could not record activity", entry, error);
  }
}

export type ActivityRow = {
  id: number;
  at: string;
  actor_id: string | null;
  actor: string;
  area: string;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
};

export type ActivityFilter = { area?: string; actor?: string; from?: string; to?: string };

// A page of the log, newest first, and whether there's more.
export async function readActivity(filter: ActivityFilter, page: number, perPage = 50): Promise<{ rows: ActivityRow[]; more: boolean }> {
  let query = db().from("activity_log").select("*").order("at", { ascending: false }).order("id", { ascending: false });
  if (filter.area) query = query.eq("area", filter.area);
  if (filter.actor) query = query.eq("actor", filter.actor);
  if (filter.from) query = query.gte("at", filter.from);
  if (filter.to) query = query.lt("at", filter.to);
  const start = page * perPage;
  const { data, error } = await withTimeout(query.range(start, start + perPage), 15_000);
  if (error) throw error;
  const rows = (data ?? []) as ActivityRow[];
  return { rows: rows.slice(0, perPage), more: rows.length > perPage };
}

// Everyone who appears in the log (for the "Who" filter).
export async function activityActors(): Promise<string[]> {
  const { data, error } = await withTimeout(db().rpc("activity_actors"), 15_000);
  if (error) {
    // Before the setup script adds the function: the names in the latest entries.
    const { data: recent } = await withTimeout(db().from("activity_log").select("actor").order("at", { ascending: false }).limit(1000), 15_000);
    return [...new Set((recent ?? []).map((r: { actor: string }) => r.actor))].sort();
  }
  return ((data ?? []) as { actor: string }[]).map((r) => r.actor);
}

// Every entry matching the filter (for the CSV download).
export async function allActivity(filter: ActivityFilter): Promise<ActivityRow[]> {
  return selectAll<ActivityRow>((from, to) => {
    let query = db().from("activity_log").select("*").order("at", { ascending: false }).order("id", { ascending: false });
    if (filter.area) query = query.eq("area", filter.area);
    if (filter.actor) query = query.eq("actor", filter.actor);
    if (filter.from) query = query.gte("at", filter.from);
    if (filter.to) query = query.lt("at", filter.to);
    return query.range(from, to);
  });
}
