import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { DOCUMENT_TYPES, formatDocumentDate, isDocumentDate, type DocumentKind } from "@/lib/document-types";
import { getPublicDocuments, listDocuments, type UploadedDocument } from "@/lib/documents";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import { deleteDocument } from "./actions";
import DeleteButton from "./DeleteButton";
import UploadForm from "./UploadForm";

// The admin page for one kind of document (weekly bulletin, Marsali's newsletter...).

const RECENT_COUNT = 2;

function ukToday(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
}
const pad = (n: number) => String(n).padStart(2, "0");

// The coming Sunday (or today, if it's Sunday), or this month, in UK time.
function defaultDate(kind: DocumentKind): string {
  const today = ukToday();
  if (DOCUMENT_TYPES[kind].precision === "month") return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  today.setDate(today.getDate() + ((7 - today.getDay()) % 7));
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function DocumentRow({ kind, doc, live }: { kind: DocumentKind; doc: UploadedDocument; live: boolean }) {
  const label = formatDocumentDate(kind, doc.date);
  return (
    <li>
      <div className="admin-list-item">
        {doc.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="admin-thumb" src={doc.coverUrl} alt="" width={36} height={51} />
        )}
        <a href={doc.url}>{label}</a>
        {live && <span className="admin-badge">On website</span>}
        <span className="admin-muted"> · {(doc.size / 1024 / 1024).toFixed(1)} MB</span>
      </div>
      <form action={deleteDocument}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="path" value={doc.path} />
        <DeleteButton question={`Delete the ${DOCUMENT_TYPES[kind].singular} for ${label}?`} />
      </form>
    </li>
  );
}

// Older documents are found by date rather than listed, so the page doesn't grow forever.
function FindDocument({ kind, uploads, date }: { kind: DocumentKind; uploads: UploadedDocument[]; date?: string }) {
  const { precision, singular } = DOCUMENT_TYPES[kind];
  const found = date ? uploads.find((d) => d.date === date) : undefined;
  // uploads is newest first, so the nearest earlier/later ones are either side of the date.
  const earlier = date ? uploads.find((d) => d.date < date) : undefined;
  const later = date ? [...uploads].reverse().find((d) => d.date > date) : undefined;
  const dates = [...new Set(uploads.map((d) => d.date))];
  return (
    <section className="admin-panel">
      <h2>Find an older {singular}</h2>
      <form className="admin-find" method="get">
        {precision === "day" ? (
          <label>
            Sunday
            <input type="date" name="date" defaultValue={date} required />
          </label>
        ) : (
          <label>
            Month
            <select name="date" defaultValue={date}>
              {dates.map((d) => (
                <option key={d} value={d}>{formatDocumentDate(kind, d)}</option>
              ))}
            </select>
          </label>
        )}
        <button className="button" type="submit">Find</button>
      </form>
      {date &&
        (found ? (
          <ul className="admin-list admin-find-result">
            <DocumentRow kind={kind} doc={found} live={found === uploads[0]} />
          </ul>
        ) : (
          <p className="admin-muted admin-find-result">
            There’s no {singular} for {formatDocumentDate(kind, date)}.
            {(earlier || later) && " Nearest: "}
            {earlier && <Link href={`?date=${earlier.date}`}>{formatDocumentDate(kind, earlier.date)}</Link>}
            {earlier && later && " or "}
            {later && <Link href={`?date=${later.date}`}>{formatDocumentDate(kind, later.date)}</Link>}
          </p>
        ))}
    </section>
  );
}

export default async function DocumentsAdmin({ kind, findDate }: { kind: DocumentKind; findDate?: string }) {
  await requireAdmin();
  const { title, singular, precision } = DOCUMENT_TYPES[kind];
  const date = findDate && isDocumentDate(kind, findDate) ? findDate : undefined;
  const configured = supabaseIsConfigured();
  const [{ current }, uploads] = await Promise.all([
    getPublicDocuments(kind),
    configured ? listDocuments(kind).catch((error: Error) => error) : [],
  ]);

  return (
    <>
      <p className="admin-breadcrumb">
        <Link href="/admin/">Dashboard</Link> / {title}
      </p>
      <h1>{title}</h1>
      <p className="admin-intro">
        On the website now: <a href={current.url}>{current.label}</a>
      </p>

      <div className="admin-columns">
        <section className="admin-panel">
          <h2>Upload a new {singular}</h2>
          {configured ? (
            <>
              <p>
                The newest {precision === "day" ? "Sunday’s" : "month’s"} {singular} is shown on the website as soon as
                it’s uploaded.
              </p>
              <UploadForm kind={kind} defaultDate={defaultDate(kind)} />
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
            <h2>Recent {singular}s</h2>
            {uploads instanceof Error ? (
              <p className="admin-error">
                Couldn’t load the list of {singular}s from storage. {describeStorageError(uploads)}
              </p>
            ) : uploads.length === 0 ? (
              <p className="admin-muted">No {singular}s have been uploaded here yet.</p>
            ) : (
              <ul className="admin-list">
                {uploads.slice(0, RECENT_COUNT).map((d, i) => (
                  <DocumentRow key={d.path} kind={kind} doc={d} live={i === 0} />
                ))}
              </ul>
            )}
          </section>
          {!(uploads instanceof Error) && uploads.length > RECENT_COUNT && (
            <FindDocument kind={kind} uploads={uploads} date={date} />
          )}
        </div>
      </div>
    </>
  );
}
