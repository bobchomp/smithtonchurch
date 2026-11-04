"use client";

import { useActionState, useEffect, useState } from "react";
import { sendContactMessage, type ContactState } from "@/app/contact-actions";

export default function ContactFormFields({ source }: { source: string }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendContactMessage, {});
  // When the form was shown, to spot forms filled in by robots in an instant.
  const [startedAt, setStartedAt] = useState("");
  useEffect(() => setStartedAt(String(Date.now())), []);

  if (state.ok) {
    return (
      <div className="contact-sent" role="status">
        <h3>Thank you, your message has been sent.</h3>
        <p>We’ll get back to you as soon as we can.</p>
      </div>
    );
  }

  const value = (name: string) => state.fields?.[name];
  return (
    <form className="contact-form" action={formAction}>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="startedAt" value={startedAt} />
      <div className="form-row">
        <label>
          First name <input type="text" name="firstName" autoComplete="given-name" required maxLength={50} defaultValue={value("firstName")} />
        </label>
        <label>
          Last name <input type="text" name="lastName" autoComplete="family-name" required maxLength={50} defaultValue={value("lastName")} />
        </label>
      </div>
      <label>
        Email <input type="email" name="email" autoComplete="email" required maxLength={254} defaultValue={value("email")} />
      </label>
      <label>
        Subject <input type="text" name="subject" maxLength={200} defaultValue={value("subject")} />
      </label>
      <label>
        Message <textarea name="message" rows={7} required maxLength={5000} defaultValue={value("message")} />
      </label>
      {/* Hidden from people; robots tend to fill it in. */}
      <label className="visually-hidden" aria-hidden="true">
        Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {state.error && (
        <p className="contact-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
