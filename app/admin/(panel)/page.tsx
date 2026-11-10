import type { Metadata } from "next";
import Link from "next/link";
import { canUse, requireAdmin } from "@/lib/admin-auth";
import { listMessages } from "@/lib/messages";
import { currentNotice } from "@/lib/live-notice-types";
import { loadNotices } from "@/lib/live-notices";
import { CONTENT_TABLES, tableReady } from "@/lib/db";
import { sermonsToReview } from "@/lib/sermon-review";
import { supabaseIsConfigured } from "@/lib/supabase";
import DatabaseSetup from "./_setup/DatabaseSetup";
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
  // Until the database tables exist, the site keeps using its older storage: ask an owner to finish.
  const tablesMissing =
    me.role === "owner" && supabaseIsConfigured()
      ? (await Promise.all(CONTENT_TABLES.map((t) => tableReady(t).catch(() => true)))).some((ok) => !ok)
      : false;
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
      {tablesMissing && (
        <div className="admin-notice-spaced">
          <DatabaseSetup title="Finish setting up the database">
            <p>
              Sermons, live notices, messages and settings are moving into your Supabase database, which keeps them
              safer. Until this script is run they stay where they were, so nothing is lost; the first time the
              website uses the database, it copies everything across by itself.
            </p>
          </DatabaseSetup>
        </div>
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
        {canUse(me, "holding-slides") && (
          <Link className="admin-tool" href="/admin/holding-slides/">
            <h2>Holding Slides</h2>
            <p>
              The live stream’s holding slides, ready to download, with every
              earlier version.
            </p>
          </Link>
        )}
        {canUse(me, "branding") && (
          <Link className="admin-tool" href="/admin/branding/">
            <h2>Branding</h2>
            <p>
              The church’s logos, colours, fonts and styles, with downloads.
            </p>
          </Link>
        )}
        {canUse(me, "activity-log") && (
          <Link className="admin-tool" href="/admin/activity/">
            <h2>Activity Log</h2>
            <p>
              Everything done in the admin panel and by the website, and who
              did it.
            </p>
          </Link>
        )}
        {me.role === "owner" && (
          <a className="admin-tool" href="/admin/backup/" download>
            <h2>Download a backup</h2>
            <p>
              Every sermon, live notice, message and setting, saved as one file
              you can keep safe.
            </p>
          </a>
        )}
        {me.role === "owner" && (
          <Link className="admin-tool" href="/admin/users/">
            <h2>Users</h2>
            <p>
              Give people their own login to the admin panel, reset passwords and remove logins.
            </p>
          </Link>
        )}
        {me.role === "owner" && (
          <Link className="admin-tool" href="/admin/user-permissions/">
            <h2>User Permissions</h2>
            <p>
              Choose who is an owner, and which tools each admin can use.
            </p>
          </Link>
        )}
      </div>
    </>
  );
}
