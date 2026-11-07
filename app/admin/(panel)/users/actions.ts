"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner, type AdminRole } from "@/lib/admin-auth";
import { isAdminTool } from "@/lib/admin-tools";
import { inviteAdmin, isLastOwner, listAdminUsers, removeAdminUser, sendPasswordLink } from "@/lib/admin-users";
import { describeStorageError } from "@/lib/supabase";

export type UserFormState = { error?: string; done?: string };

const isRole = (v: unknown): v is AdminRole => v === "owner" || v === "admin";

export async function invite(_state: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireOwner();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const role = formData.get("role");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!name) return { error: "Please enter their name." };
  if (!isRole(role)) return { error: "Please choose what they can do." };
  try {
    await inviteAdmin(email, name, role, formData.getAll("tools").filter(isAdminTool));
  } catch (error) {
    return { error: `Couldn’t send the invitation. ${describeStorageError(error)}` };
  }
  revalidatePath("/admin/users");
  return { done: `Invitation sent to ${email}.` };
}

export async function remove(formData: FormData): Promise<void> {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (id === me.id || (await isLastOwner(id))) return;
  await removeAdminUser(id);
  revalidatePath("/admin/users");
}

export async function resendInvite(formData: FormData): Promise<void> {
  await requireOwner();
  const email = String(formData.get("email") ?? "");
  await sendPasswordLink(email, "invite");
  revalidatePath("/admin/users");
}

// Emails someone a link to choose a new password. Their current password keeps working until they do.
export async function sendPasswordReset(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const user = (await listAdminUsers()).find((u) => u.id === id);
  if (!user) return;
  let result: string;
  try {
    await sendPasswordLink(user.email, "recovery");
    result = `reset=${encodeURIComponent(user.email)}`;
  } catch {
    result = `failed=${encodeURIComponent(user.email)}`;
  }
  redirect(`/admin/users/?${result}`);
}
