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

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^["']|["']$/g, "").trim();
  return trimmed || undefined;
}

// Accepts the project URL however it was pasted: with or without https://, with a trailing
// path such as /rest/v1/, the dashboard link, or just the 20-character project ID.
export function normaliseSupabaseUrl(raw: string | undefined): string | undefined {
  let value = clean(raw);
  if (!value) return undefined;
  const ref = value.match(/dashboard\/project\/([a-z0-9]{20})/i)?.[1] ?? value.match(/^([a-z0-9]{20})$/i)?.[1];
  if (ref) value = `https://${ref.toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function settings() {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return {
    rawUrl,
    url: normaliseSupabaseUrl(rawUrl),
    key: clean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

// Explains a storage error for the admin panel, naming the address when it couldn't be reached.
export function describeStorageError(error: unknown): string {
  const message = (error as Error)?.message ?? String(error);
  const host = settings().url ? new URL(settings().url!).host : undefined;
  if (/fetch failed|timed out/i.test(message) && host) {
    const hint = host.endsWith(".supabase.co")
      ? "The Supabase project may be paused; restore it from the Supabase dashboard."
      : "SUPABASE_URL in Vercel should be your project URL, like https://abcd1234.supabase.co";
    return `Couldn’t reach ${host}. ${hint}`;
  }
  return message;
}

export function supabaseIsConfigured(): boolean {
  const { rawUrl, key } = settings();
  return Boolean(clean(rawUrl) && key);
}

let client: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  const { rawUrl, url, key } = settings();
  if (clean(rawUrl) && !url) {
    throw new Error("SUPABASE_URL in Vercel isn’t a web address. It should look like https://abcd1234.supabase.co");
  }
  if (!url || !key) throw new Error("Supabase isn’t set up: add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// A separate client with no shared state, for one-off sign-in checks (so one person's sign-in can
// never affect the shared client above).
export function supabaseAuthClient(): SupabaseClient {
  const { url, key } = settings();
  if (!url || !key) throw new Error("Supabase isn’t set up: add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Supabase timed out")), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
