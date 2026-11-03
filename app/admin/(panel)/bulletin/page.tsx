import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { formatBulletinDate, getCurrentBulletin, listBulletins } from "@/lib/bulletins";
import { supabaseIsConfigured } from "@/lib/supabase";
import { deleteBulletin } from "./actions";
import DeleteButton from "./DeleteButton";
import UploadForm from "./UploadForm";

export const metadata: Metadata = { title: "Weekly Bulletin" };

// The coming Sunday (or today, if it's Sunday) as YYYY-MM-DD, in UK time.
function nextSunday(): string {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  today.setDate(today.getDate() + ((7 - today.getDay()) % 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

export default async function BulletinAdmin() {
  await requireAdmin();
  const configured = supabaseIsConfigured();
  const [current, uploads] = await Promise.all([
    getCurrentBulletin(),
    configured ? listBulletins().catch((error: Error) => error) : [],
  ]);

  return (
    <>
      <p className="admin-breadcrumb">
        <Link href="/admin/">Dashboard</Link> / Weekly Bulletin
      </p>
      <h1>Weekly Bulletin</h1>
      <p className="admin-intro">
        On the website now: <a href={current.url}>{current.label}</a>
      </p>

      <div className="admin-columns">
        <section className="admin-panel">
          <h2>Upload a new bulletin</h2>
          {configured ? (
            <>
              <p>The newest Sunday’s bulletin is shown on the website as soon as it’s uploaded.</p>
              <UploadForm defaultDate={nextSunday()} />
            </>
          ) : (
            <div className="admin-notice">
              <p>
                <strong>File storage isn’t connected yet.</strong> Add <code>SUPABASE_URL</code> and{" "}
                <code>SUPABASE_SECRET_KEY</code> to the project’s environment variables in Vercel, then redeploy.
                Uploads will work after that.
              </p>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <h2>Recent bulletins</h2>
          {uploads instanceof Error ? (
            <p className="admin-error">Couldn’t load the list of bulletins from storage. {uploads.message}</p>
          ) : uploads.length === 0 ? (
            <p className="admin-muted">No bulletins have been uploaded here yet.</p>
          ) : (
            <ul className="admin-list">
              {uploads.slice(0, 12).map((b, i) => (
                <li key={b.path}>
                  <div>
                    <a href={b.url}>{formatBulletinDate(b.date)}</a>
                    {i === 0 && <span className="admin-badge">On website</span>}
                    <span className="admin-muted"> · {(b.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  <form action={deleteBulletin}>
                    <input type="hidden" name="path" value={b.path} />
                    <DeleteButton label={formatBulletinDate(b.date)} />
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
