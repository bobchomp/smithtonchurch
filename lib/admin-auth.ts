import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ALL_TOOLS, toolsOf, type AdminTool } from "./admin-tools";
import { ADMIN_HOST, SITE_HOST } from "./domains";
import { supabaseAdmin, supabaseIsConfigured } from "./supabase";

// Signing in to the admin panel. Each person has their own login (email and password, kept by
// Supabase Auth); the shared ADMIN_PIN still works as a backup way in with full access.
//
// Signing in stores a signed cookie naming who is signed in ("pin" or the person's Supabase user ID).
// The cookie is signed with ADMIN_SESSION_SECRET, or ADMIN_PIN if that isn't set, so changing either
// signs everyone out. On every page, a person's account is checked again in Supabase, so removing
// them (or their admin role) takes effect straight away.

const COOKIE_NAME = "smithton_admin";
const SESSION_HOURS = 12;

export type AdminRole = "owner" | "admin";
export const ROLE_KEY = "smithton_role"; // in each Supabase user's app_metadata (only the server can set it)

export type Admin = {
  kind: "user" | "pin";
  id: string; // Supabase user ID, or "pin"
  email?: string;
  name: string;
  role: AdminRole;
  tools: AdminTool[]; // owners: every tool
};

function secret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_PIN?.trim() || undefined;
}

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(`smithton-admin:${value}`).digest("hex");
}

function sameText(a: string, b: string): boolean {
  // Compare hashes so the comparison takes the same time whatever the input.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function adminPinIsSet(): boolean {
  return Boolean(process.env.ADMIN_PIN?.trim());
}

export function sessionsCanBeSigned(): boolean {
  return Boolean(secret());
}

export function pinMatches(attempt: string): boolean {
  const pin = process.env.ADMIN_PIN?.trim();
  return Boolean(pin) && sameText(attempt, pin!);
}

export function roleOf(appMetadata: Record<string, unknown> | undefined): AdminRole | undefined {
  const role = appMetadata?.[ROLE_KEY];
  return role === "owner" || role === "admin" ? role : undefined;
}

// Signs someone in: "pin", or a Supabase user ID.
export async function startSession(subject: string): Promise<void> {
  const key = secret();
  if (!key) throw new Error("ADMIN_PIN (or ADMIN_SESSION_SECRET) isn’t set");
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const value = `${subject}.${expires}`;
  (await cookies()).set(COOKIE_NAME, `${value}.${sign(value, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
  await markAsAdminBrowser();
}

// Tells the public website's analytics not to count this browser (admins checking the site would
// otherwise fill the reports). Set for the main domain too, as the admin panel is on a subdomain.
async function markAsAdminBrowser(): Promise<void> {
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  const domain = host === ADMIN_HOST && ADMIN_HOST.endsWith(`.${SITE_HOST}`) ? SITE_HOST : undefined;
  (await cookies()).set("sc_admin", "1", {
    domain,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

async function sessionSubject(): Promise<string | undefined> {
  const key = secret();
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!key || !token) return undefined;
  const [subject, expires, signature] = token.split(".");
  if (!subject || !expires || !signature || Number(expires) < Date.now()) return undefined;
  return sameText(signature, sign(`${subject}.${expires}`, key)) ? subject : undefined;
}

// Who is signed in, or null. Checked once per request.
export const currentAdmin = cache(async (): Promise<Admin | null> => {
  const subject = await sessionSubject();
  if (!subject) return null;
  if (subject === "pin") {
    return adminPinIsSet() ? { kind: "pin", id: "pin", name: "Backup PIN", role: "owner", tools: ALL_TOOLS } : null;
  }
  if (!supabaseIsConfigured()) return null;
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(subject);
  const user = data?.user;
  const role = roleOf(user?.app_metadata);
  const banned = user?.banned_until && Date.parse(user.banned_until) > Date.now();
  if (error || !user || !role || banned) return null;
  const name = String(user.user_metadata?.name ?? "").trim() || user.email || "Admin";
  const tools = role === "owner" ? ALL_TOOLS : toolsOf(user.app_metadata);
  return { kind: "user", id: user.id, email: user.email, name, role, tools };
});

export async function isSignedIn(): Promise<boolean> {
  return Boolean(await currentAdmin());
}

// Call at the top of every admin page and server action that needs a signed-in user.
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login/");
  return admin;
}

// For managing admin users: owners only (the backup PIN counts as an owner).
export async function requireOwner(): Promise<Admin> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/");
  return admin;
}

export function canUse(admin: Admin, tool: AdminTool): boolean {
  return admin.role === "owner" || admin.tools.includes(tool);
}

// For a tool's pages and actions: the admin must have been given this tool (or any of several).
export async function requireTool(...tools: AdminTool[]): Promise<Admin> {
  const admin = await requireAdmin();
  if (!tools.some((tool) => canUse(admin, tool))) redirect("/admin/");
  return admin;
}
