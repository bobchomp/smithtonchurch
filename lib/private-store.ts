import "server-only";
import { supabaseAdmin, withTimeout } from "./supabase";

// The "private" Supabase bucket: things that mustn't be readable by the public (contact messages,
// settings, notices that haven't been shown yet).

export const PRIVATE_BUCKET = "private";

export function privateStore() {
  return supabaseAdmin().storage.from(PRIVATE_BUCKET);
}

export async function ensurePrivateBucket(): Promise<void> {
  const { error } = await supabaseAdmin().storage.getBucket(PRIVATE_BUCKET);
  if (!error) return;
  const created = await supabaseAdmin().storage.createBucket(PRIVATE_BUCKET, { public: false });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

// True if a storage error just means "there's no such file" (rather than "couldn't read it").
export function isStorageNotFound(error: unknown): boolean {
  const e = error as { message?: string; status?: number; statusCode?: string | number };
  return /not[ _]?found|does not exist/i.test(e?.message ?? "") || e?.status === 404 || String(e?.statusCode ?? "") === "404";
}

// For reading before a change is saved: undefined only if the file really doesn't exist; any other
// problem throws, so a failed read can never be mistaken for "empty" and saved over the real data.
export async function readPrivateJsonStrict<T>(path: string): Promise<T | undefined> {
  const { data, error } = await withTimeout(privateStore().download(path, { cacheNonce: String(Date.now()) }));
  if (error) {
    if (isStorageNotFound(error)) return undefined;
    throw error;
  }
  return JSON.parse(await data.text()) as T;
}

// For showing things: undefined if the file doesn't exist (or can't be read).
export async function readPrivateJson<T>(path: string): Promise<T | undefined> {
  const { data, error } = await withTimeout(privateStore().download(path, { cacheNonce: String(Date.now()) }));
  if (error) return undefined;
  return JSON.parse(await data.text()) as T;
}

export async function writePrivateJson(path: string, value: unknown): Promise<void> {
  const { error } = await privateStore().upload(path, JSON.stringify(value), {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw error;
}
