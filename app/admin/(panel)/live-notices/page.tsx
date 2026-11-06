import type { Metadata } from "next";
import Link from "next/link";
import DeleteButton from "../_documents/DeleteButton";
import { requireAdmin } from "@/lib/admin-auth";
import { formatNoticeTime, noticeStatus, type LiveNotice, type NoticeStatus } from "@/lib/live-notice-types";
import { loadNotices } from "@/lib/live-notices";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import { deleteNotice } from "./actions";
import NoticeSwitch from "./NoticeSwitch";

export const metadata: Metadata = { title: "Live Notices" };

const LABELS: Record<NoticeStatus, string> = {
  showing: "Showing now",
  hidden: "On, but a newer notice is showing",
  scheduled: "Scheduled",
  ended: "Ended",
  off: "Switched off",
};

function when(n: LiveNotice): string {
  const from = n.startsAt ? `From ${formatNoticeTime(n.startsAt)}` : "From when it was added";
  const until = n.endsAt ? ` until ${formatNoticeTime(n.endsAt)}` : " until removed";
  return from + until;
}

export default async function LiveNoticesAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const saved = (await searchParams).saved;
  const loaded = supabaseIsConfigured() ? await loadNotices().catch((e: Error) => e) : [];
  const notices = loaded instanceof Error ? [] : loaded;
  const now = Date.now();
  const order: NoticeStatus[] = ["showing", "hidden", "scheduled", "off", "ended"];
  const sorted = notices
    .map((n) => ({ n, status: noticeStatus(n, notices, now) }))
    .sort(
      (a, b) =>
        order.indexOf(a.status) - order.indexOf(b.status) ||
        Date.parse(b.n.startsAt ?? b.n.createdAt) - Date.parse(a.n.startsAt ?? a.n.createdAt),
    );

  return (
    <>
      <h1>Live Notices</h1>
      <p className="admin-intro">
        A notice shows above the player on the <Link href="/live/">Watch Live page</Link> between the times you choose.
        Only one shows at a time: if several are on, the one that started most recently. Use the switch to turn a
        notice off without deleting it.
      </p>
      {saved && <p className="admin-success admin-notice-spaced">Notice saved.</p>}
      {!supabaseIsConfigured() && <p className="admin-error">File storage (Supabase) isn’t set up yet.</p>}
      {loaded instanceof Error && <p className="admin-error">Couldn’t load the notices. {describeStorageError(loaded)}</p>}

      <div className="admin-toolbar">
        <Link className="button" href="/admin/live-notices/new/">
          Add a notice
        </Link>
      </div>

      <section className="admin-panel">
        {sorted.length === 0 ? (
          <p className="admin-muted">No notices yet.</p>
        ) : (
          <ul className="admin-list">
            {sorted.map(({ n, status }) => (
              <li key={n.id} className="admin-notice-row">
                <div className="admin-list-item admin-sermon-row">
                  <Link href={`/admin/live-notices/${n.id}/`}>{n.heading || n.text.slice(0, 60) || "(image only)"}</Link>
                  <span className="admin-muted">
                    <span className={`admin-badge admin-status-${status}`}>{LABELS[status]}</span> {when(n)}
                  </span>
                </div>
                <div className="admin-row-links">
                  <NoticeSwitch id={n.id} on={!n.off} label={n.heading || "untitled"} />
                  <Link href={`/admin/live-notices/${n.id}/`}>Edit</Link>
                  <form action={deleteNotice}>
                    <input type="hidden" name="id" value={n.id} />
                    <DeleteButton question={`Delete the notice “${n.heading || "untitled"}”?`} />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
