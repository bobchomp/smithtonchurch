import "server-only";
import { headers } from "next/headers";
import { ROLE_KEY, roleOf, type AdminRole } from "./admin-auth";
import { TOOLS_KEY, toolsOf, type AdminTool } from "./admin-tools";
import { ADMIN_HOST } from "./domains";
import { escapeEmailHtml as esc, sendSiteEmail } from "./email";
import { supabaseAdmin, supabaseAuthClient } from "./supabase";

// Admin accounts, kept in Supabase Auth. Only people whose app_metadata has a role ("owner" or
// "admin") can use the admin panel. Invitation and password-reset emails are sent by the website
// (through Resend), with links back to /admin/set-password/, so Supabase's own email settings
// don't matter.

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  tools: AdminTool[]; // what an admin can use (owners can use everything)
  invited: boolean; // hasn't set a password yet
  lastSignIn?: string;
};

export const MIN_PASSWORD_LENGTH = 10;

const authClient = supabaseAuthClient;

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users
    .map((u): AdminUser | undefined => {
      const role = roleOf(u.app_metadata);
      if (!role || !u.email) return undefined;
      return {
        id: u.id,
        email: u.email,
        name: String(u.user_metadata?.name ?? "").trim(),
        role,
        tools: toolsOf(u.app_metadata),
        invited: !u.last_sign_in_at && !u.user_metadata?.password_set,
        lastSignIn: u.last_sign_in_at ?? undefined,
      };
    })
    .filter((u): u is AdminUser => Boolean(u))
    .sort((a, b) => (a.role === b.role ? (a.name || a.email).localeCompare(b.name || b.email) : a.role === "owner" ? -1 : 1));
}

// Checks an email and password. Returns the user's ID if they may use the admin panel.
export async function checkPassword(email: string, password: string): Promise<string | undefined> {
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.user || !roleOf(data.user.app_metadata)) return undefined;
  return data.user.id;
}

// The address of the admin panel for links in emails.
async function adminOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? ADMIN_HOST;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function emailLink(kind: "invite" | "recovery", email: string, name: string, tokenHash: string): Promise<void> {
  const link = `${await adminOrigin()}/admin/set-password/?type=${kind}&token=${encodeURIComponent(tokenHash)}`;
  const greeting = name ? `Hello ${name},` : "Hello,";
  const [subject, intro, action] =
    kind === "invite"
      ? [
          "You’ve been invited to the Smithton Church website admin panel",
          "You’ve been given a login for the Smithton Church website’s admin panel. Choose a password to get started:",
          "Choose a password",
        ]
      : [
          "Reset your Smithton Church admin password",
          "Someone asked to reset the password for your Smithton Church admin login. If it was you, choose a new password:",
          "Choose a new password",
        ];
  const footer =
    kind === "invite"
      ? "This link works once and expires after 24 hours. If it has expired, ask for a new invitation."
      : "This link works once and expires after an hour. If you didn’t ask for this, you can ignore this email.";
  const text = `${greeting}\n\n${intro}\n\n${link}\n\n${footer}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b3440">
<p>${esc(greeting)}</p><p>${esc(intro)}</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#456188;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(action)}</a></p>
<p style="color:#5d6875;font-size:13px">${esc(footer)}</p></div>`;
  await sendSiteEmail(email, subject, text, html);
}

export async function inviteAdmin(email: string, name: string, role: AdminRole, tools: AdminTool[]): Promise<void> {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "invite", email, options: { data: { name } } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) throw new Error("There’s already a login for that email address.");
    throw error;
  }
  const updated = await supabaseAdmin().auth.admin.updateUserById(data.user.id, { app_metadata: { [ROLE_KEY]: role, [TOOLS_KEY]: tools } });
  if (updated.error) throw updated.error;
  await emailLink("invite", email, name, data.properties.hashed_token);
}

// A new invitation (or password reset) link for someone who already has a login.
export async function sendPasswordLink(email: string, kind: "invite" | "recovery"): Promise<void> {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
  if (error) throw error;
  if (!roleOf(data.user.app_metadata)) return; // not an admin: say nothing
  await emailLink(kind, email, String(data.user.user_metadata?.name ?? ""), data.properties.hashed_token);
}

// Uses an emailed link to set a password. Returns the user's ID.
export async function setPasswordWithToken(tokenHash: string, kind: "invite" | "recovery", password: string): Promise<string> {
  const { data, error } = await authClient().auth.verifyOtp({ token_hash: tokenHash, type: kind === "invite" ? "invite" : "recovery" });
  if (error || !data.user) throw new Error("This link has expired or has already been used. Ask for a new one.");
  if (!roleOf(data.user.app_metadata)) throw new Error("This login doesn’t have access to the admin panel.");
  await setPassword(data.user.id, password);
  return data.user.id;
}

export async function setPassword(userId: string, password: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, {
    password,
    user_metadata: { password_set: true },
  });
  if (error) throw error;
}

export async function setAdminRole(userId: string, role: AdminRole): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { app_metadata: { [ROLE_KEY]: role } });
  if (error) throw error;
}

export async function setAdminTools(userId: string, tools: AdminTool[]): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { app_metadata: { [TOOLS_KEY]: tools } });
  if (error) throw error;
}

export async function setAdminName(userId: string, name: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { user_metadata: { name } });
  if (error) throw error;
}

export async function removeAdminUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);
  if (error) throw error;
}

// True if this person is the only owner, so they can't be removed or made an ordinary admin
// (someone must always be able to manage logins).
export async function isLastOwner(userId: string): Promise<boolean> {
  const owners = (await listAdminUsers()).filter((u) => u.role === "owner");
  return owners.length === 1 && owners[0].id === userId;
}
