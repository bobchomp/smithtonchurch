import type { Metadata } from "next";
import DeleteButton from "../_documents/DeleteButton";
import { requireOwner } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-users";
import { emailIsConfigured } from "@/lib/email";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import { ADMIN_TOOLS, ALL_TOOLS } from "@/lib/admin-tools";
import { changeRole, changeTools, remove, resendInvite } from "./actions";
import ToolChecklist from "./ToolChecklist";
import InviteForm from "./InviteForm";

export const metadata: Metadata = { title: "Users" };

function lastSeen(iso?: string): string {
  if (!iso) return "";
  return `Last signed in ${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })}`;
}

export default async function Users() {
  const me = await requireOwner();
  const users = supabaseIsConfigured() ? await listAdminUsers().catch((e: Error) => e) : new Error("Supabase isn’t set up.");
  const owners = users instanceof Error ? 0 : users.filter((u) => u.role === "owner").length;

  return (
    <>
      <h1>Users</h1>
      <p className="admin-intro">
        Everyone who looks after the website has their own login. <strong>Admins</strong> can use the tools you choose for them;{" "}
        <strong>owners</strong> can also add and remove logins here.
      </p>
      {!emailIsConfigured() && (
        <p className="admin-error admin-notice-spaced">Invitations are sent by email, which isn’t set up yet (RESEND_API_KEY).</p>
      )}

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
                      {!lastOwner && (
                        <form action={changeRole}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === "owner" ? "admin" : "owner"} />
                          <button className="admin-link-button admin-link-plain" type="submit">
                            {u.role === "owner" ? "Make admin" : "Make owner"}
                          </button>
                        </form>
                      )}
                      {u.id !== me.id && !lastOwner && (
                        <form action={remove}>
                          <input type="hidden" name="id" value={u.id} />
                          <DeleteButton question={`Remove ${u.name || u.email}’s login? They won’t be able to sign in any more.`} label="Remove" />
                        </form>
                      )}
                    </div>
                    {u.role === "admin" && (
                      <details className="admin-tools-edit">
                        <summary>
                          {u.tools.length === ALL_TOOLS.length
                            ? "All tools"
                            : u.tools.length === 0
                              ? "No tools"
                              : ADMIN_TOOLS.filter((t) => u.tools.includes(t.key)).map((t) => t.label).join(", ")}{" "}
                          <span className="admin-tools-change">Change</span>
                        </summary>
                        <form action={changeTools}>
                          <input type="hidden" name="id" value={u.id} />
                          <ToolChecklist selected={u.tools} />
                          <button className="button" type="submit">Save tools</button>
                        </form>
                      </details>
                    )}
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
