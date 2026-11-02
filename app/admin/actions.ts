"use server";

import { redirect } from "next/navigation";
import { adminPinIsSet, endSession, pinMatches, startSession } from "@/lib/admin-auth";

export type LoginState = { error?: string };

export async function signIn(_state: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminPinIsSet()) {
    return { error: "The admin PIN hasn’t been set up yet. Add ADMIN_PIN in Vercel’s environment variables." };
  }
  const pin = String(formData.get("pin") ?? "").trim();
  if (!pinMatches(pin)) {
    // Slow down repeated guessing.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { error: "That PIN isn’t right. Please try again." };
  }
  await startSession();
  redirect("/admin/");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/admin/login/");
}
