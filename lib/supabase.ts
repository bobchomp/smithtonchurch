import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase is used for file storage (and later, other data). This client uses the secret
// key, so it must only ever run on the server; "server-only" makes the build fail otherwise.
//
// Environment variables (set in Vercel):
//   SUPABASE_URL         the project URL, e.g. https://abcd1234.supabase.co
//   SUPABASE_SECRET_KEY  the project's secret key (or the older service_role key)
// The names the Vercel–Supabase integration creates also work.

export const STORAGE_BUCKET = "website";

function settings() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function supabaseIsConfigured(): boolean {
  const { url, key } = settings();
  return Boolean(url && key);
}

let client: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  const { url, key } = settings();
  if (!url || !key) throw new Error("Supabase isn’t set up: add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// The public "website" bucket holds files shown on the site (bulletins, and more later).
export function storage() {
  return supabaseAdmin().storage.from(STORAGE_BUCKET);
}

// Creates the bucket the first time something is uploaded, so there's nothing to set up by hand.
export async function ensureStorageBucket(): Promise<void> {
  const { error } = await supabaseAdmin().storage.getBucket(STORAGE_BUCKET);
  if (!error) return;
  const created = await supabaseAdmin().storage.createBucket(STORAGE_BUCKET, { public: true });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

// Gives up after a few seconds if Supabase can't be reached (e.g. a paused free project),
// so pages can fall back instead of hanging.
export function withTimeout<T>(promise: PromiseLike<T>, ms = 8_000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Supabase timed out")), ms)),
  ]);
}
