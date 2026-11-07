import type { Metadata } from "next";
import Link from "next/link";
import { canUse, requireAdmin } from "@/lib/admin-auth";
import { listMessages } from "@/lib/messages";
import { currentNotice } from "@/lib/live-notice-types";
import { loadNotices } from "@/lib/live-notices";
import { sermonsToReview } from "@/lib/sermon-review";
import { loadSermons } from "@/lib/sermons";

export const metadata: Metadata = { title: "Dashboard" };

// The admin home page. New tools get a card in the grid below.
export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const me = await requireAdmin();
  const welcome = (await searchParams).welcome;
  // Only load what this person's tiles need.
  const [messages, sermons, notices] = await Promise.all([
    canUse(me, "messages") ? listMessages().catch(() => []) : [],
    canUse(me, "sermon-details") ? loadSermons().catch(() => []) : [],
    canUse(me, "live-notices") ? loadNotices().catch(() => []) : [],
  ]);
  const noticeShowing = Boolean(currentNotice(notices));
  const unread = messages.filter((m) => !m.read).length;
  const toReview = sermonsToReview(sermons).length;
  return (
    <>
      <h1>Dashboard</h1>
      <p className="admin-intro">
        {me.kind === "pin"
          ? "Signed in with the backup PIN."
          : `Welcome, ${me.name}.`}{" "}
        <Link href="/admin/account/">My account</Link>
      </p>
      {welcome && (
        <p className="admin-success admin-notice-spaced">
          Your password is saved and you’re signed in.
        </p>
      )}
      {me.role === "admin" && me.tools.length === 0 && (
        <p className="admin-muted">
          You haven’t been given any tools yet. Ask an owner to choose which
          tools you can use.
        </p>
      )}
      <div className="admin-tools">
        {canUse(me, "messages") && (
          <Link className="admin-tool" href="/admin/messages/">
            <h2>
              Messages{" "}
              {unread > 0 && <span className="admin-count">{unread} new</span>}
            </h2>
            <p>
              Read messages sent through the website, and choose who’s emailed
              about them.
            </p>
          </Link>
        )}
        {canUse(me, "bulletin") && (
          <Link className="admin-tool" href="/admin/bulletin/">
            <h2>Weekly Bulletin</h2>
            <p>Upload this week’s bulletin PDF to the website.</p>
          </Link>
        )}
        {canUse(me, "sermons") && (
          <Link className="admin-tool" href="/admin/sermons/">
            <h2>Sermons</h2>
            <p>Add sermons with their audio, and edit the sermon archive.</p>
          </Link>
        )}
        {canUse(me, "sermon-details") && (
          <Link className="admin-tool" href="/admin/sermons/review/">
            <h2>
              Sermon Details{" "}
              {toReview > 0 && (
                <span className="admin-count">{toReview} to do</span>
              )}
            </h2>
            <p>
              Watch each recent sermon and fill in its title, preacher and Bible
              books, one after another.
            </p>
          </Link>
        )}
        {canUse(me, "live-notices") && (
          <Link className="admin-tool" href="/admin/live-notices/">
            <h2>
              Live Notices{" "}
              {noticeShowing && (
                <span className="admin-badge">Showing now</span>
              )}
            </h2>
            <p>
              Show a message or image above the player on the Watch Live page,
              between the times you choose.
            </p>
          </Link>
        )}
        {canUse(me, "pages-to-review") && (
          <Link className="admin-tool" href="/admin/pagestoreview/">
            <h2>Pages to Review</h2>
            <p>
              Draft page designs to look over before they go live on the
              website.
            </p>
          </Link>
        )}
        {canUse(me, "newsletter") && (
          <Link className="admin-tool" href="/admin/marsalis-newsletter/">
            <h2>Marsali’s Newsletter</h2>
            <p>
              Upload Marsali’s monthly newsletter to her page on the website.
            </p>
          </Link>
        )}
        {canUse(me, "analytics") && (
          <Link className="admin-tool" href="/admin/analytics/">
            <h2>Analytics</h2>
            <p>
              See how people find and use the website: pages, visitors, where
              they came from and more.
            </p>
          </Link>
        )}
        {me.role === "owner" && (
          <Link className="admin-tool" href="/admin/users/">
            <h2>Users</h2>
            <p>
              Give people their own login to the admin panel, and remove logins.
            </p>
          </Link>
        )}
      </div>
    </>
  );
}
