import type { Metadata } from "next";
import Link from "next/link";
import { listMessages } from "@/lib/messages";
import { currentNotice } from "@/lib/live-notice-types";
import { loadNotices } from "@/lib/live-notices";
import { sermonsToReview } from "@/lib/sermon-review";
import { loadSermons } from "@/lib/sermons";

export const metadata: Metadata = { title: "Dashboard" };

// The admin home page. New tools get a card in the grid below.
export default async function AdminDashboard() {
  const [messages, sermons, notices] = await Promise.all([
    listMessages().catch(() => []),
    loadSermons().catch(() => []),
    loadNotices().catch(() => []),
  ]);
  const noticeShowing = Boolean(currentNotice(notices));
  const unread = messages.filter((m) => !m.read).length;
  const toReview = sermonsToReview(sermons).length;
  return (
    <>
      <h1>Dashboard</h1>
      <p className="admin-intro">Welcome to the Smithton Church admin panel.</p>
      <div className="admin-tools">
        <Link className="admin-tool" href="/admin/messages/">
          <h2>
            Messages {unread > 0 && <span className="admin-count">{unread} new</span>}
          </h2>
          <p>Read messages sent through the website, and choose who’s emailed about them.</p>
        </Link>
        <Link className="admin-tool" href="/admin/bulletin/">
          <h2>Weekly Bulletin</h2>
          <p>Upload this week’s bulletin PDF to the website.</p>
        </Link>
        <Link className="admin-tool" href="/admin/sermons/">
          <h2>Sermons</h2>
          <p>Add sermons with their audio, and edit the sermon archive.</p>
        </Link>
        <Link className="admin-tool" href="/admin/sermons/review/">
          <h2>
            Sermon Details {toReview > 0 && <span className="admin-count">{toReview} to do</span>}
          </h2>
          <p>Watch each recent sermon and fill in its title, preacher and Bible books, one after another.</p>
        </Link>
        <Link className="admin-tool" href="/admin/live-notices/">
          <h2>
            Live Notices {noticeShowing && <span className="admin-badge">Showing now</span>}
          </h2>
          <p>Show a message or image above the player on the Watch Live page, between the times you choose.</p>
        </Link>
        <Link className="admin-tool" href="/admin/marsalis-newsletter/">
          <h2>Marsali’s Newsletter</h2>
          <p>Upload Marsali’s monthly newsletter to her page on the website.</p>
        </Link>
      </div>
    </>
  );
}
