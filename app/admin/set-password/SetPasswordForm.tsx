"use client";

import { useActionState } from "react";
import { setPasswordFromLink, type FormState } from "../actions";

export default function SetPasswordForm({ token, type }: { token: string; type: "invite" | "recovery" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setPasswordFromLink, {});
  return (
    <form className="admin-login-form" action={action}>
      {type === "invite" && <p className="admin-login-help">Choose a password for your admin login. You’ll use it with your email address to sign in.</p>}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="type" value={type} />
      <label>
        New password
        <input type="password" name="password" autoComplete="new-password" minLength={10} required autoFocus />
        <span className="admin-muted">At least 10 characters.</span>
      </label>
      <label>
        Type it again
        <input type="password" name="confirm" autoComplete="new-password" minLength={10} required />
      </label>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save and sign in"}</button>
    </form>
  );
}
