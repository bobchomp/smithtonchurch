import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { formatBulletinDate, getCurrentBulletin, isBulletinDate, listBulletins, type UploadedBulletin } from "@/lib/bulletins";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
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

const RECENT_COUNT = 2;

function BulletinRow({ bulletin, live }: { bulletin: UploadedBulletin; live: boolean }) {
  const label = formatBulletinDate(bulletin.date);
  return (
    <li>
      <div className="admin-list-item">
        {bulletin.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="admin-thumb" src={bulletin.coverUrl} alt="" width={36} height={51} />
        )}
        <a href={bulletin.url}>{label}</a>
        {live && <span className="admin-badge">On website</span>}
        <span className="admin-muted"> · {(bulletin.size / 1024 / 1024).toFixed(1)} MB</span>
      </div>
      <form action={deleteBulletin}>
        <input type="hidden" name="path" value={bulletin.path} />
        <DeleteButton label={label} />
      </form>
    </li>
  );
}

// Older bulletins are found by date rather than listed, so the page doesn't grow forever.
function FindBulletin({ uploads, date }: { uploads: UploadedBulletin[]; date?: string }) {
  const found = date ? uploads.find((b) => b.date === date) : undefined;
  // uploads is newest first, so the nearest earlier/later Sundays are either side of the date.
  const earlier = date ? uploads.find((b) => b.date < date) : undefined;
  const later = date ? [...uploads].reverse().find((b) => b.date > date) : undefined;
  return (
    <section className="admin-panel">
      <h2>Find an older bulletin</h2>
      <form className="admin-find" method="get">
        <label>
          Sunday
          <input type="date" name="date" defaultValue={date} required />
        </label>
        <button className="button" type="submit">Find</button>
      </form>
      {date &&
        (found ? (
          <ul className="admin-list admin-find-result">
            <BulletinRow bulletin={found} live={found === uploads[0]} />
          </ul>
        ) : (
          <p className="admin-muted admin-find-result">
            There’s no bulletin for {formatBulletinDate(date)}.
            {(earlier || later) && " Nearest: "}
            {earlier && <Link href={`?date=${earlier.date}`}>{formatBulletinDate(earlier.date)}</Link>}
            {earlier && later && " or "}
            {later && <Link href={`?date=${later.date}`}>{formatBulletinDate(later.date)}</Link>}
          </p>
        ))}
    </section>
  );
}

export default async function BulletinAdmin({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  const requested = (await searchParams).date;
  const findDate = requested && isBulletinDate(requested) ? requested : undefined;
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

        <div className="admin-stack">
          <section className="admin-panel">
            <h2>Recent bulletins</h2>
            {uploads instanceof Error ? (
              <p className="admin-error">
                Couldn’t load the list of bulletins from storage. {describeStorageError(uploads)}
              </p>
            ) : uploads.length === 0 ? (
              <p className="admin-muted">No bulletins have been uploaded here yet.</p>
            ) : (
              <ul className="admin-list">
                {uploads.slice(0, RECENT_COUNT).map((b, i) => (
                  <BulletinRow key={b.path} bulletin={b} live={i === 0} />
                ))}
              </ul>
            )}
          </section>
          {!(uploads instanceof Error) && uploads.length > RECENT_COUNT && (
            <FindBulletin uploads={uploads} date={findDate} />
          )}
        </div>
      </div>
    </>
  );
}
