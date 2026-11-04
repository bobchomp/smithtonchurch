"use client";

import { useActionState, useState } from "react";
import { addRecipient, removeRecipient, sendTestEmail } from "./actions";

export default function RecipientsPanel({ recipients, emailReady }: { recipients: string[]; emailReady: boolean }) {
  const [state, formAction, pending] = useActionState(addRecipient, {});
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  return (
    <section className="admin-panel">
      <h2>Notification emails</h2>
      <p className="admin-muted">These addresses are emailed whenever someone sends a message through the website.</p>
      {recipients.length === 0 ? (
        <p className="admin-error">No one is set to receive messages yet. Messages are still saved here.</p>
      ) : (
        <ul className="admin-list">
          {recipients.map((email) => (
            <li key={email}>
              <span>{email}</span>
              <form action={removeRecipient}>
                <input type="hidden" name="email" value={email} />
                <button className="admin-link-button" type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form className="admin-find admin-add-recipient" action={formAction}>
        <label>
          Add an email address
          <input type="email" name="email" required maxLength={254} key={state.ok ? recipients.length : "input"} />
        </label>
        <button className="button" type="submit" disabled={pending}>Add</button>
      </form>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {!emailReady ? (
        <div className="admin-notice admin-notice-top">
          <p>
            <strong>Email isn’t set up yet.</strong> Add <code>RESEND_API_KEY</code> in Vercel. Until then, messages are saved
            here but not emailed.
          </p>
        </div>
      ) : (
        recipients.length > 0 && (
          <div className="admin-sync admin-notice-top">
            <button
              className="button button-outline"
              type="button"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                setTest(await sendTestEmail());
                setTesting(false);
              }}
            >
              {testing ? "Sending…" : "Send a test email"}
            </button>
            {test && <p className={test.ok ? "admin-success" : "admin-error"} role="status">{test.message}</p>}
          </div>
        )
      )}
    </section>
  );
}
