"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity";
import { checkPassword, MIN_PASSWORD_LENGTH, setAdminName, setPassword } from "@/lib/admin-users";

export type AccountState = { error?: string; done?: string };

export async function changeName(_state: AccountState, formData: FormData): Promise<AccountState> {
  const me = await requireAdmin();
  if (me.kind !== "user") return { error: "Sign in with your own login to change your details." };
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Please enter your name." };
  await setAdminName(me.id, name);
  await logActivity({ area: "Account", action: "Changed their name", target: name, details: { from: me.name } });
  revalidatePath("/admin");
  return { done: "Name saved." };
}

export async function changePassword(_state: AccountState, formData: FormData): Promise<AccountState> {
  const me = await requireAdmin();
  if (me.kind !== "user" || !me.email) return { error: "Sign in with your own login to change your password." };
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(me.email, current))) {
    await logActivity({ area: "Account", action: "Tried to change their password (current password wrong)" });
    return { error: "Your current password isn’t right." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Please use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two new passwords don’t match." };
  await setPassword(me.id, password);
  await logActivity({ area: "Account", action: "Changed their password" });
  return { done: "Password changed." };
}
