import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { NameForm, PasswordForm } from "./AccountForms";

export const metadata: Metadata = { title: "My account" };

export default async function Account() {
  const me = await requireAdmin();
  return (
    <>
      <h1>My account</h1>
      {me.kind === "pin" ? (
        <p className="admin-intro">
          You’re signed in with the backup PIN, so there are no account details to change. Owners can give you your own
          login in Users.
        </p>
      ) : (
        <>
          <p className="admin-intro">
            Signed in as {me.email} ({me.role === "owner" ? "owner" : "admin"}).
          </p>
          <div className="admin-columns">
            <section className="admin-panel">
              <h2>Name</h2>
              <NameForm name={me.name === me.email ? "" : me.name} />
            </section>
            <section className="admin-panel">
              <h2>Password</h2>
              <PasswordForm />
            </section>
          </div>
        </>
      )}
    </>
  );
}
