import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteButton from "../../_documents/DeleteButton";
import { requireAdmin } from "@/lib/admin-auth";
import { getMessage, updateMessage } from "@/lib/messages";
import { deleteOneMessage, setMessageRead } from "../actions";

export const metadata: Metadata = { title: "Message" };

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const message = await getMessage((await params).id);
  if (!message) notFound();
  // Opening a message marks it as read.
  if (!message.read) await updateMessage({ ...message, read: true }).catch(() => undefined);

  const reply = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject || "Your message to Smithton Church"}`)}`;
  return (
    <>
      <p className="admin-breadcrumb">
        <Link href="/admin/">Dashboard</Link> / <Link href="/admin/messages/">Messages</Link> / Message
      </p>
      <h1>{message.subject || "(no subject)"}</h1>
      <section className="admin-panel admin-message">
        <dl className="admin-message-details">
          <div>
            <dt>From</dt>
            <dd>
              {message.name} &lt;<a href={`mailto:${message.email}`}>{message.email}</a>&gt;
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>{new Date(message.receivedAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" })}</dd>
          </div>
          <div>
            <dt>Sent from</dt>
            <dd>{message.source}</dd>
          </div>
          <div>
            <dt>Email notification</dt>
            <dd>{message.emailed ? "Sent" : <span className="admin-error">Not sent{message.emailError ? `: ${message.emailError}` : ""}</span>}</dd>
          </div>
        </dl>
        <div className="admin-message-body">{message.message}</div>
        <div className="admin-message-actions">
          <a className="button" href={reply}>Reply by email</a>
          <form action={setMessageRead}>
            <input type="hidden" name="id" value={message.id} />
            <input type="hidden" name="read" value="false" />
            <button className="button button-outline" type="submit">Mark as unread</button>
          </form>
          <form action={deleteOneMessage}>
            <input type="hidden" name="id" value={message.id} />
            <DeleteButton question={`Delete this message from ${message.name}? This can’t be undone.`} />
          </form>
        </div>
      </section>
    </>
  );
}
