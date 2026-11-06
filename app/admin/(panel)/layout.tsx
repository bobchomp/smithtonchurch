import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { signOut } from "../actions";

// Everything inside (panel) needs a signed-in admin. Server actions must call requireAdmin() too.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="admin-bar">
        <div className="container admin-bar-inner">
          <div className="admin-bar-start">
            <Link className="admin-brand" href="/admin/">
              <Image src="/images/logo-white.png" alt="Smithton Church admin" width={600} height={123} />
            </Link>
            <Link className="admin-pill" href="/admin/">
              Dashboard
            </Link>
          </div>
          <div className="admin-bar-actions">
            <form action={signOut}>
              <button type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
