import "server-only";
import { randomUUID } from "node:crypto";
import { db, getSetting, selectAll, setSetting, upsertRows } from "./db";
import { supabaseIsConfigured, withTimeout } from "./supabase";

// Messages sent through the website's contact forms, one row each in the database's
// "contact_messages" table (lib/db.ts). The list of people emailed about new messages is the
// "contact.recipients" setting.

export type ContactMessage = {
  id: string; // newest sorts last
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
  const { error } = await withTimeout(db().from("contact_messages").insert(toRow(message)));
  if (error) throw error;
  return message;
}

export async function updateMessage(message: ContactMessage): Promise<void> {
  return upsertRows("contact_messages", [toRow(message)], "id");
}

function validId(id: string): boolean {
  return /^[\w-]{10,80}$/.test(id);
}

export async function getMessage(id: string): Promise<ContactMessage | undefined> {
  if (!validId(id)) return undefined;
  const { data, error } = await withTimeout(db().from("contact_messages").select("data").eq("id", id).maybeSingle());
  if (error) throw error;
  return data?.data as ContactMessage | undefined;
}

// Newest first.
export async function listMessages(): Promise<ContactMessage[]> {
  if (!supabaseIsConfigured()) return [];
  const rows = await selectAll<{ data: ContactMessage }>((from, to) =>
    db().from("contact_messages").select("data").order("received_at", { ascending: false }).order("id", { ascending: false }).range(from, to),
  );
  return rows.map((r) => r.data);
}

export async function deleteMessages(ids: string[]): Promise<void> {
  const valid = ids.filter(validId);
  if (!valid.length) return;
  const { error } = await withTimeout(db().from("contact_messages").delete().in("id", valid));
  if (error) throw error;
}

// ---------- Who gets emailed ----------

// Throws if the list can't be read, so a failed read is never saved over it.
export async function getRecipients(): Promise<string[]> {
  if (!supabaseIsConfigured()) return [];
  return (await getSetting<{ recipients: string[] }>("contact.recipients"))?.recipients ?? [];
}

export async function setRecipients(recipients: string[]): Promise<void> {
  await setSetting("contact.recipients", { recipients });
}

export function isEmailAddress(value: string): boolean {
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(value) && value.length <= 254;
}
