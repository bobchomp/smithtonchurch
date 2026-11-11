import { readFileSync } from "node:fs";
import { join } from "node:path";
import { missingReports } from "./analytics";
import { isMissingTable } from "./db";
import { supabaseAdmin, withTimeout } from "./supabase";

// supabase/setup.sql is split into "-- @part <table|function> <name>" sections, each one table or
// function with everything it needs. These work out which parts the database is missing, so the
// admin panel can offer just those instead of the whole script.

export type SetupPart = { kind: "table" | "function"; name: string; sql: string };

export function setupScript(): string {
  return readFileSync(join(process.cwd(), "supabase/setup.sql"), "utf8");
}

export function setupParts(script = setupScript()): { parts: SetupPart[]; footer: string } {
  const parts: SetupPart[] = [];
  const pieces = script.split(/^-- @part (table|function) (\w+)[ \t]*$/m);
  const [last, footer = ""] = (pieces[pieces.length - 1] ?? "").split(/^-- @end[ \t]*$/m);
  pieces[pieces.length - 1] = last;
  for (let i = 1; i + 2 < pieces.length; i += 3) {
    parts.push({ kind: pieces[i] as SetupPart["kind"], name: pieces[i + 1], sql: pieces[i + 2].trim() });
  }
  return { parts, footer: footer.trim() };
}

// Functions that can be tried safely when the database can't yet say what it has (before setup_status).
const PROBES: Record<string, Record<string, unknown>> = {
  activity_actors: {},
  rate_limit_count: { p_key: "setup-check", p_window: 1 },
};

async function existing(parts: SetupPart[]): Promise<(p: SetupPart) => boolean> {
  const db = supabaseAdmin();
  const { data, error } = await withTimeout(db.rpc("setup_status"));
  if (!error) {
    const have = new Set((data as { kind: string; name: string }[]).map((r) => `${r.kind}:${r.name}`));
    return (p) => have.has(`${p.kind}:${p.name}`);
  }
  if (!isMissingTable(error)) throw error;
  // Older databases: check the tables, and the functions that can be tried; assume the rest are there.
  const tables = parts.filter((p) => p.kind === "table");
  const tableThere = new Map(
    await Promise.all(
      tables.map(async (t) => {
        const { error: e } = await withTimeout(db.from(t.name).select("*").limit(1));
        if (e && !isMissingTable(e)) throw e;
        return [t.name, !e] as const;
      }),
    ),
  );
  const missingFns = new Set((await missingReports().catch(() => [])).map((r) => r.fn));
  await Promise.all(
    Object.entries(PROBES).map(async ([fn, args]) => {
      const { error: e } = await withTimeout(db.rpc(fn, args));
      if (e && /PGRST202|42883/.test(e.code ?? "")) missingFns.add(fn);
    }),
  );
  return (p) => (p.kind === "table" ? tableThere.get(p.name) !== false : p.name !== "setup_status" && !missingFns.has(p.name));
}

// The parts the database is missing, as one script ready to run (null if it couldn't be worked out).
export async function missingSetup(): Promise<{ parts: SetupPart[]; sql: string } | null> {
  try {
    const { parts, footer } = setupParts();
    if (!parts.length) return null;
    const has = await existing(parts);
    const missing = parts.filter((p) => !has(p));
    if (!missing.length) return { parts: [], sql: "" };
    const sql = [
      "-- Smithton Church: the parts your database is missing (from supabase/setup.sql). Safe to run again.",
      ...missing.map((p) => p.sql),
      footer,
    ].join("\n\n");
    return { parts: missing, sql: sql + "\n" };
  } catch {
    return null;
  }
}

// A short description of a part, for the admin panel.
export function describePart(p: SetupPart): string {
  if (p.kind === "table") return `The ${p.name.replace(/_/g, " ")} table`;
  if (p.name.startsWith("analytics_")) return `Analytics report: ${p.name.slice(10).replace(/_/g, " ")}`;
  return `The ${p.name.replace(/_/g, " ")} function`;
}
