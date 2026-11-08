import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db, isMissingTable } from "./db";
import { withTimeout } from "./supabase";

// Limits on repeated attempts (backup PIN, password-reset emails, contact messages, analytics),
// counted in the database (rate_limits, supabase/setup.sql). If the database can't be reached or
// hasn't been set up, attempts are allowed: these limits are a safety net, not a way to lock the
// owner out.

// A one-way code for the visitor's internet address: the same address always gives the same code,
// but the address can't be worked back out of it. The address itself is never stored.
export async function senderCode(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  const salt = process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_PIN?.trim() || "smithton";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

// Counts an attempt: true if it's within `limit` attempts per `windowSeconds`.
export async function allowAttempt(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await withTimeout(db().rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window: windowSeconds }), 5_000);
    if (error) {
      if (!isMissingTable(error)) console.error("Rate limit check failed", error);
      return true;
    }
    return data !== false;
  } catch (error) {
    console.error("Rate limit check failed", error);
    return true;
  }
}

// Whether `limit` attempts have already been made in the window (doesn't count another).
export async function limitReached(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await withTimeout(db().rpc("rate_limit_count", { p_key: key, p_window: windowSeconds }), 5_000);
    if (error) return false;
    return Number(data) >= limit;
  } catch {
    return false;
  }
}
