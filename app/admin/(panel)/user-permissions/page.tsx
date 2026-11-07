import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-users";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import PermissionsForm from "./PermissionsForm";

export const metadata: Metadata = { title: "User Permissions" };

export default async function UserPermissions() {
  const me = await requireOwner();
  const users = supabaseIsConfigured() ? await listAdminUsers().catch((e: Error) => e) : new Error("Supabase isn’t set up.");
  const owners = users instanceof Error ? 0 : users.filter((u) => u.role === "owner").length;

  return (
    <>
      <h1>User Permissions</h1>
      <p className="admin-intro">
        Choose what each person can do. <strong>Admins</strong> only see the tools you tick for them; <strong>owners</strong> can
        use every tool and manage logins. To add or remove a login, go to <Link href="/admin/users/">Users</Link>.
      </p>
      {users instanceof Error ? (
        <p className="admin-error">Couldn’t load the logins. {describeStorageError(users)}</p>
      ) : users.length === 0 ? (
        <p className="admin-muted">No one has a login yet. <Link href="/admin/users/">Invite someone</Link> first.</p>
      ) : (
        <div className="admin-permissions">
          {users.map((u) => (
            <section key={u.id} id={`u-${u.id}`} className="admin-panel">
              <h2>{u.name || u.email}{u.id === me.id && " (you)"}</h2>
              <p className="admin-muted admin-permissions-email">{u.email}</p>
              <PermissionsForm id={u.id} role={u.role} tools={u.tools} lastOwner={u.role === "owner" && owners === 1} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
