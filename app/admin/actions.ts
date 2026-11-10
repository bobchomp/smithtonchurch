"use server";

import { redirect } from "next/navigation";
import { adminPinIsSet, endSession, pinMatches, sessionsCanBeSigned, startSession } from "@/lib/admin-auth";
import { checkPassword, MIN_PASSWORD_LENGTH, sendPasswordLink, setPasswordWithToken } from "@/lib/admin-users";
import { logActivity, SYSTEM } from "@/lib/activity";
import { allowAttempt, limitReached, senderCode } from "@/lib/rate-limit";
import { supabaseIsConfigured } from "@/lib/supabase";

export type FormState = { error?: string; done?: string };

const slowDown = () => new Promise((resolve) => setTimeout(resolve, 1500)); // makes guessing slow

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!supabaseIsConfigured() || !sessionsCanBeSigned()) return { error: "Sign-in isn’t set up yet. Use the backup PIN." };
  if (!email || !password) return { error: "Please enter your email and password." };
  if (!(await allowAttempt(`signin:${await senderCode()}`, 20, 15 * 60))) {
    await logActivity({ area: "Sign-in", action: "Sign-in blocked: too many attempts from one connection", target: email }, SYSTEM);
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }
  const userId = await checkPassword(email, password).catch(() => undefined);
  if (!userId) {
    await logActivity({ area: "Sign-in", action: "Failed sign-in (wrong email or password)", target: email }, SYSTEM);
    await slowDown();
    return { error: "That email and password don’t match an admin login." };
  }
  await startSession(userId);
  await logActivity({ area: "Sign-in", action: "Signed in" });
  redirect("/admin/");
}

export async function signInWithPin(_state: FormState, formData: FormData): Promise<FormState> {
  if (!adminPinIsSet()) return { error: "The backup PIN hasn’t been set up (ADMIN_PIN in Vercel)." };
  // After 10 wrong PINs in 15 minutes (from anywhere), the PIN stops working for a while.
  const locked = "The backup PIN is locked for 15 minutes after too many wrong attempts. Sign in with your email and password instead.";
  if (await limitReached("pin-failures", 10, 15 * 60)) {
    await logActivity({ area: "Sign-in", action: "Backup PIN tried while locked" }, SYSTEM);
    return { error: locked };
  }
  if (!pinMatches(String(formData.get("pin") ?? "").trim())) {
    const stillAllowed = await allowAttempt("pin-failures", 10, 15 * 60);
    await logActivity(
      { area: "Sign-in", action: stillAllowed ? "Wrong backup PIN entered" : "Wrong backup PIN entered: the PIN is now locked for 15 minutes" },
      SYSTEM,
    );
    await slowDown();
    return { error: "That PIN isn’t right. Please try again." };
  }
  await startSession("pin");
  await logActivity({ area: "Sign-in", action: "Signed in with the backup PIN" });
  redirect("/admin/");
}

// "Forgot your password?" Always gives the same answer, so it can't be used to find out who has a login.
export async function requestPasswordReset(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter your email address." };
  // At most one email per address every 5 minutes, and 5 an hour from one connection; the reply is
  // the same either way, so this can't be used to find out who has a login.
  const allowed = (await allowAttempt(`reset-from:${await senderCode()}`, 5, 60 * 60)) && (await allowAttempt(`reset:${email}`, 1, 5 * 60));
  if (allowed) await sendPasswordLink(email, "recovery").catch((error) => console.error("Password reset not sent", error));
  await logActivity(
    { area: "Sign-in", action: allowed ? "“Forgot your password?” used" : "“Forgot your password?” used too often: no email sent", target: email },
    SYSTEM,
  );
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
  await logActivity({ area: "Account", action: kind === "invite" ? "Accepted an invitation and chose a password" : "Chose a new password from a reset email" });
  redirect("/admin/?welcome=1");
}

export async function signOut(): Promise<void> {
  await logActivity({ area: "Sign-in", action: "Signed out" });
  await endSession();
  redirect("/admin/login/");
}
