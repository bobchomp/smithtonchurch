"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/admin-auth";
import { isAdminTool } from "@/lib/admin-tools";
import { isLastOwner, listAdminUsers, setAdminRole, setAdminTools } from "@/lib/admin-users";
import { describeStorageError } from "@/lib/supabase";

export type PermissionsState = { error?: string; done?: string };

// Saves one person's role and, for admins, the tools they can use.
export async function savePermissions(_state: PermissionsState, formData: FormData): Promise<PermissionsState> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const role = formData.get("role");
  if (role !== "owner" && role !== "admin") return { error: "Please choose what they can do." };
  const user = (await listAdminUsers()).find((u) => u.id === id);
  if (!user) return { error: "That login no longer exists." };
  try {
    if (role === "admin" && user.role === "owner" && (await isLastOwner(id))) {
      return { error: "There must always be at least one owner. Make someone else an owner first." };
    }
    if (role === "admin") await setAdminTools(id, [...new Set(formData.getAll("tools").filter(isAdminTool))]);
    if (role !== user.role) await setAdminRole(id, role);
  } catch (error) {
    return { error: `Couldn’t save. ${describeStorageError(error)}` };
  }
  revalidatePath("/admin/user-permissions");
  revalidatePath("/admin/users");
  return { done: "Saved." };
}
