"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/admin-auth";
import { saveAnalyticsSettings } from "@/lib/analytics";

// Owners switch tracking on or off.
export async function setTracking(formData: FormData): Promise<void> {
  await requireOwner();
  await saveAnalyticsSettings({ enabled: formData.get("enabled") === "on" });
  revalidatePath("/admin/analytics");
}
