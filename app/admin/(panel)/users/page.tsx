import type { Metadata } from "next";
import Link from "next/link";
import DeleteButton from "../_documents/DeleteButton";
import { requireOwner } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-users";
import { emailIsConfigured } from "@/lib/email";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import { ADMIN_TOOLS, ALL_TOOLS, DEFAULT_TOOLS } from "@/lib/admin-tools";
import { remove, resendInvite, sendPasswordReset } from "./actions";
import InviteForm from "./InviteForm";

export const metadata: Metadata = { title: "Users" };

function lastSeen(iso?: string): string {
  if (!iso) return "";
  return `Last signed in ${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })}`;
}

export default async function Users({ searchParams }: { searchParams: Promise<{ reset?: string; failed?: string }> }) {
  const me = await requireOwner();
  const { reset, failed } = await searchParams;
  const users = supabaseIsConfigured() ? await listAdminUsers().catch((e: Error) => e) : new Error("Supabase isn’t set up.");
  const owners = users instanceof Error ? 0 : users.filter((u) => u.role === "owner").length;

  return (
    <>
      <h1>Users</h1>
      <p className="admin-intro">
        Everyone who looks after the website has their own login. Add, reset and remove logins here; choose what each
        person can do in <Link href="/admin/user-permissions/">User Permissions</Link>.
      </p>
      {!emailIsConfigured() && (
        <p className="admin-error admin-notice-spaced">Invitations are sent by email, which isn’t set up yet (RESEND_API_KEY).</p>
      )}

      {reset && (
        <div className="admin-notice admin-notice-success admin-notice-spaced" role="status">
          <p className="admin-success">
            Password reset email sent to {reset}. The link lasts an hour; their current password keeps working until they choose a new one.
          </p>
        </div>
      )}
      {failed && <p className="admin-error admin-notice-spaced" role="alert">Couldn’t send the password reset email to {failed}. Please try again.</p>}

      <div className="admin-columns admin-columns-wide">
        <section className="admin-panel">
          <h2>Logins</h2>
          {users instanceof Error ? (
            <p className="admin-error">Couldn’t load the logins. {describeStorageError(users)}</p>
          ) : users.length === 0 ? (
            <p className="admin-muted">No one has a login yet. Invite yourself first, as an owner.</p>
          ) : (
            <ul className="admin-list admin-users-list">
              {users.map((u) => {
                const lastOwner = u.role === "owner" && owners === 1;
                return (
                  <li key={u.id} className="admin-notice-row">
                    <div className="admin-list-item admin-sermon-row">
                      <strong>{u.name || u.email}{u.id === me.id && " (you)"}</strong>
                      <span className="admin-muted">
                        {u.email} · <span className={`admin-badge${u.role === "owner" ? " admin-status-showing" : ""}`}>{u.role === "owner" ? "Owner" : "Admin"}</span>{" "}
                        {u.invited ? <span className="admin-badge admin-status-scheduled">Invited</span> : lastSeen(u.lastSignIn)}
                      </span>
                    </div>
                    <div className="admin-row-links">
                      {u.invited && (
                        <form action={resendInvite}>
                          <input type="hidden" name="email" value={u.email} />
                          <button className="admin-link-button admin-link-plain" type="submit">Resend invite</button>
                        </form>
                      )}
                      {!u.invited && (
                        <form action={sendPasswordReset}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className="admin-link-button admin-link-plain" type="submit">Reset password</button>
                        </form>
                      )}
                      {u.id !== me.id && !lastOwner && (
                        <form action={remove}>
                          <input type="hidden" name="id" value={u.id} />
                          <DeleteButton question={`Remove ${u.name || u.email}’s login? They won’t be able to sign in any more.`} label="Remove" />
                        </form>
                      )}
                    </div>
                    <p className="admin-muted admin-users-summary">
                      {u.role === "owner"
                        ? "Every tool, and manages logins"
                        : u.tools.length === ALL_TOOLS.length
                          ? "All tools"
                          : u.tools.length === DEFAULT_TOOLS.length && DEFAULT_TOOLS.every((t) => u.tools.includes(t))
                            ? "All tools except the Activity Log"
                          : u.tools.length === 0
                            ? "No tools"
                            : ADMIN_TOOLS.filter((t) => u.tools.includes(t.key)).map((t) => t.label).join(", ")}{" "}
                      · <Link href={`/admin/user-permissions/#u-${u.id}`}>Change permissions</Link>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="admin-panel">
          <h2>Invite someone</h2>
          <p className="admin-muted">They’ll get an email with a link to choose their password.</p>
          <InviteForm />
        </section>
      </div>
    </>
  );
}
