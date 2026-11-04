import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseIsConfigured, supabaseAdmin, withTimeout } from "./supabase";

// Messages sent through the website's contact forms. Each is saved as its own small file in
// Supabase (messages/<time>-<id>.json, in a private bucket), so two messages arriving at once can't
// overwrite each other. The list of people emailed about new messages is settings/contact.json.

const BUCKET = "private";
const FOLDER = "messages";
const SETTINGS_PATH = "settings/contact.json";

export type ContactMessage = {
  id: string; // also the file name, newest sorts last
  receivedAt: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  source: string; // which form, e.g. "Home page" or "Conferencing venue"
  read: boolean;
  emailed?: boolean; // whether the notification email went out
  emailError?: string;
};

function privateStore() {
  return supabaseAdmin().storage.from(BUCKET);
}

// Messages contain people's details, so they live in a bucket that isn't public.
async function ensurePrivateBucket(): Promise<void> {
  const { error } = await supabaseAdmin().storage.getBucket(BUCKET);
  if (!error) return;
  const created = await supabaseAdmin().storage.createBucket(BUCKET, { public: false });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

async function readJson<T>(path: string): Promise<T | undefined> {
  const { data, error } = await withTimeout(privateStore().download(path, { cacheNonce: String(Date.now()) }));
  if (error) return undefined;
  return JSON.parse(await data.text()) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const { error } = await privateStore().upload(path, JSON.stringify(value), {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw error;
}

export function messagesAreConfigured(): boolean {
  return supabaseIsConfigured();
}

export async function saveNewMessage(
  fields: Omit<ContactMessage, "id" | "receivedAt" | "read" | "emailed" | "emailError">,
): Promise<ContactMessage> {
  await ensurePrivateBucket();
  const now = new Date();
  const message: ContactMessage = {
    id: `${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
    receivedAt: now.toISOString(),
    read: false,
    ...fields,
  };
  await writeJson(`${FOLDER}/${message.id}.json`, message);
  return message;
}

export async function updateMessage(message: ContactMessage): Promise<void> {
  await writeJson(`${FOLDER}/${message.id}.json`, message);
}

function validId(id: string): boolean {
  return /^[\w-]{10,80}$/.test(id);
}

export async function getMessage(id: string): Promise<ContactMessage | undefined> {
  if (!validId(id)) return undefined;
  return readJson<ContactMessage>(`${FOLDER}/${id}.json`);
}

// Newest first.
export async function listMessages(): Promise<ContactMessage[]> {
  if (!supabaseIsConfigured()) return [];
  const { data, error } = await withTimeout(privateStore().list(FOLDER, { limit: 1000 }));
  if (error) {
    if (/not found/i.test(error.message)) return [];
    throw error;
  }
  const names = data.filter((f) => f.id && f.name.endsWith(".json")).map((f) => f.name).sort().reverse();
  const messages = await Promise.all(names.map((name) => readJson<ContactMessage>(`${FOLDER}/${name}`)));
  return messages.filter((m) => m !== undefined);
}

export async function deleteMessages(ids: string[]): Promise<void> {
  const paths = ids.filter(validId).map((id) => `${FOLDER}/${id}.json`);
  if (!paths.length) return;
  const { error } = await privateStore().remove(paths);
  if (error) throw error;
}

// ---------- Who gets emailed ----------

export async function getRecipients(): Promise<string[]> {
  if (!supabaseIsConfigured()) return [];
  return (await readJson<{ recipients: string[] }>(SETTINGS_PATH))?.recipients ?? [];
}

export async function setRecipients(recipients: string[]): Promise<void> {
  await ensurePrivateBucket();
  await writeJson(SETTINGS_PATH, { recipients });
}

export function isEmailAddress(value: string): boolean {
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(value) && value.length <= 254;
}
