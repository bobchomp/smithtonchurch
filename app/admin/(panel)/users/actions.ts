"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, type AdminRole } from "@/lib/admin-auth";
import { isAdminTool } from "@/lib/admin-tools";
import { inviteAdmin, listAdminUsers, removeAdminUser, sendPasswordLink, setAdminRole, setAdminTools } from "@/lib/admin-users";
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

// Stops the last owner being removed or made an ordinary admin, so someone can always manage logins.
async function wouldLeaveNoOwner(userId: string): Promise<boolean> {
  const owners = (await listAdminUsers()).filter((u) => u.role === "owner");
  return owners.length === 1 && owners[0].id === userId;
}

export async function changeRole(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const role = formData.get("role");
  if (!isRole(role)) return;
  if (role === "admin" && (await wouldLeaveNoOwner(id))) return;
  await setAdminRole(id, role);
  revalidatePath("/admin/users");
}

export async function changeTools(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  await setAdminTools(id, [...new Set(formData.getAll("tools").filter(isAdminTool))]);
  revalidatePath("/admin/users");
}

export async function remove(formData: FormData): Promise<void> {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (id === me.id || (await wouldLeaveNoOwner(id))) return;
  await removeAdminUser(id);
  revalidatePath("/admin/users");
}

export async function resendInvite(formData: FormData): Promise<void> {
  await requireOwner();
  const email = String(formData.get("email") ?? "");
  await sendPasswordLink(email, "invite");
  revalidatePath("/admin/users");
}
