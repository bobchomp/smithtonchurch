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

// undefined if the file doesn't exist (or can't be read).
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
