import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin-auth";
import { site } from "@/lib/content";
import { signOut } from "../actions";

// Everything inside (panel) needs the admin PIN. Server actions must call requireAdmin() too.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const onAdminHost = ((await headers()).get("host") ?? "").split(":")[0] === "admin.rossmdev.co.uk";
  return (
    <>
      <header className="admin-bar">
        <div className="container admin-bar-inner">
          <Link className="admin-brand" href="/admin/">
            <Image src="/images/logo-white.png" alt="Smithton Church" width={600} height={123} />
            <span>Admin</span>
          </Link>
          <div className="admin-bar-actions">
            <a href={onAdminHost ? site.url : "/"}>View website</a>
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
