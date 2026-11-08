import "server-only";
import { randomUUID } from "node:crypto";
import { copyInOnce, db, getSetting, selectAll, setSetting, tableReady, upsertRows } from "./db";
import {
  ensurePrivateBucket,
  isStorageNotFound,
  privateStore,
  readPrivateJson as readJson,
  readPrivateJsonStrict as readJsonStrict,
  writePrivateJson as writeJson,
} from "./private-store";
import { supabaseIsConfigured, withTimeout } from "./supabase";

// Messages sent through the website's contact forms, one row each in the database's
// "contact_messages" table (lib/db.ts). Before the database was set up, each was its own file in the
// private bucket (messages/<time>-<id>.json); those are copied in the first time the table is used.
// The list of people emailed about new messages is the "contact.recipients" setting (before: the
// file settings/contact.json).

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

export function messagesAreConfigured(): boolean {
  return supabaseIsConfigured();
}

const toRow = (m: ContactMessage) => ({ id: m.id, received_at: m.receivedAt, read: m.read, data: m, updated_at: new Date().toISOString() });

// The message files in the old folder (a page at a time, so none are missed however many there are).
async function messageFileNames(): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await withTimeout(privateStore().list(FOLDER, { limit: 1000, offset }));
    if (error) {
      if (isStorageNotFound(error)) return names;
      throw error;
    }
    names.push(...data.filter((f) => f.id && f.name.endsWith(".json")).map((f) => f.name));
    if (data.length < 1000) return names;
  }
}

async function useDatabase(): Promise<boolean> {
  if (!(await tableReady("contact_messages"))) return false;
  await copyInOnce("contact_messages", async () => {
    const names = await messageFileNames();
    const messages = (await Promise.all(names.map((n) => readJsonStrict<ContactMessage>(`${FOLDER}/${n}`)))).filter((m) => m !== undefined);
    await upsertRows("contact_messages", messages.map(toRow), "id");
    return messages.length;
  });
  return true;
}

export async function saveNewMessage(
  fields: Omit<ContactMessage, "id" | "receivedAt" | "read" | "emailed" | "emailError">,
): Promise<ContactMessage> {
  const now = new Date();
  const message: ContactMessage = {
    id: `${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
    receivedAt: now.toISOString(),
    read: false,
    ...fields,
  };
  if (await useDatabase()) {
    const { error } = await withTimeout(db().from("contact_messages").insert(toRow(message)));
    if (error) throw error;
    return message;
  }
  await ensurePrivateBucket();
  await writeJson(`${FOLDER}/${message.id}.json`, message);
  return message;
}

export async function updateMessage(message: ContactMessage): Promise<void> {
  if (await useDatabase()) return upsertRows("contact_messages", [toRow(message)], "id");
  await writeJson(`${FOLDER}/${message.id}.json`, message);
}

function validId(id: string): boolean {
  return /^[\w-]{10,80}$/.test(id);
}

export async function getMessage(id: string): Promise<ContactMessage | undefined> {
  if (!validId(id)) return undefined;
  if (await useDatabase()) {
    const { data, error } = await withTimeout(db().from("contact_messages").select("data").eq("id", id).maybeSingle());
    if (error) throw error;
    return data?.data as ContactMessage | undefined;
  }
  return readJson<ContactMessage>(`${FOLDER}/${id}.json`);
}

// Newest first.
export async function listMessages(): Promise<ContactMessage[]> {
  if (!supabaseIsConfigured()) return [];
  if (await useDatabase()) {
    const rows = await selectAll<{ data: ContactMessage }>((from, to) =>
      db().from("contact_messages").select("data").order("received_at", { ascending: false }).order("id", { ascending: false }).range(from, to),
    );
    return rows.map((r) => r.data);
  }
  const names = (await messageFileNames()).sort().reverse();
  const messages = await Promise.all(names.map((name) => readJson<ContactMessage>(`${FOLDER}/${name}`)));
  return messages.filter((m) => m !== undefined);
}

export async function deleteMessages(ids: string[]): Promise<void> {
  const valid = ids.filter(validId);
  if (!valid.length) return;
  if (await useDatabase()) {
    const { error } = await withTimeout(db().from("contact_messages").delete().in("id", valid));
    if (error) throw error;
    return;
  }
  const { error } = await privateStore().remove(valid.map((id) => `${FOLDER}/${id}.json`));
  if (error) throw error;
}

// ---------- Who gets emailed ----------

// Throws if the list can't be read, so a failed read is never saved over it.
export async function getRecipients(): Promise<string[]> {
  if (!supabaseIsConfigured()) return [];
  return (await getSetting<{ recipients: string[] }>("contact.recipients", SETTINGS_PATH))?.recipients ?? [];
}

export async function setRecipients(recipients: string[]): Promise<void> {
  await setSetting("contact.recipients", { recipients }, SETTINGS_PATH);
}

export function isEmailAddress(value: string): boolean {
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(value) && value.length <= 254;
}
