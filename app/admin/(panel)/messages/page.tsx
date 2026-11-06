import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { emailIsConfigured } from "@/lib/email";
import { getRecipients, listMessages, messagesAreConfigured } from "@/lib/messages";
import { describeStorageError } from "@/lib/supabase";
import MessageList from "./MessageList";
import RecipientsPanel from "./RecipientsPanel";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesAdmin() {
  await requireAdmin();
  const configured = messagesAreConfigured();
  const [messages, recipients] = configured
    ? await Promise.all([listMessages().catch((e: Error) => e), getRecipients().catch(() => [])])
    : [[], []];
  const unread = messages instanceof Error ? 0 : messages.filter((m) => !m.read).length;

  return (
    <>
      <h1>Messages</h1>
      <p className="admin-intro">
        Messages sent through the website’s contact forms.
        {!(messages instanceof Error) && messages.length > 0 && ` ${messages.length} saved, ${unread} unread.`}
      </p>

      <div className="admin-columns admin-columns-wide">
        <section className="admin-panel">
          {messages instanceof Error ? (
            <p className="admin-error">Couldn’t load the messages. {describeStorageError(messages)}</p>
          ) : messages.length === 0 ? (
            <p className="admin-muted">No messages yet.</p>
          ) : (
            <MessageList messages={messages} />
          )}
        </section>
        {configured && <RecipientsPanel recipients={recipients} emailReady={emailIsConfigured()} />}
      </div>
    </>
  );
}
