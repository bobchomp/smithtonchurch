"use server";

import { redirect } from "next/navigation";
import { adminPinIsSet, endSession, pinMatches, sessionsCanBeSigned, startSession } from "@/lib/admin-auth";
import { checkPassword, MIN_PASSWORD_LENGTH, sendPasswordLink, setPasswordWithToken } from "@/lib/admin-users";
import { supabaseIsConfigured } from "@/lib/supabase";

export type FormState = { error?: string; done?: string };

const slowDown = () => new Promise((resolve) => setTimeout(resolve, 1500)); // makes guessing slow

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!supabaseIsConfigured() || !sessionsCanBeSigned()) return { error: "Sign-in isn’t set up yet. Use the backup PIN." };
  if (!email || !password) return { error: "Please enter your email and password." };
  const userId = await checkPassword(email, password).catch(() => undefined);
  if (!userId) {
    await slowDown();
    return { error: "That email and password don’t match an admin login." };
  }
  await startSession(userId);
  redirect("/admin/");
}

export async function signInWithPin(_state: FormState, formData: FormData): Promise<FormState> {
  if (!adminPinIsSet()) return { error: "The backup PIN hasn’t been set up (ADMIN_PIN in Vercel)." };
  if (!pinMatches(String(formData.get("pin") ?? "").trim())) {
    await slowDown();
    return { error: "That PIN isn’t right. Please try again." };
  }
  await startSession("pin");
  redirect("/admin/");
}

// "Forgot your password?" Always gives the same answer, so it can't be used to find out who has a login.
export async function requestPasswordReset(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter your email address." };
  await sendPasswordLink(email, "recovery").catch((error) => console.error("Password reset not sent", error));
  return { done: "If that email address has an admin login, we’ve sent it a link to choose a new password." };
}

export async function setPasswordFromLink(_state: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const kind = formData.get("type") === "invite" ? "invite" : "recovery";
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Please use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two passwords don’t match." };
  let userId: string;
  try {
    userId = await setPasswordWithToken(token, kind, password);
  } catch (error) {
    return { error: (error as Error).message };
  }
  await startSession(userId);
  redirect("/admin/?welcome=1");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/admin/login/");
}
