"use client";

import { useActionState } from "react";
import { changeName, changePassword, type AccountState } from "./actions";

function Message({ state }: { state: AccountState }) {
  if (state.error) return <p className="admin-error" role="alert">{state.error}</p>;
  if (state.done) return <p className="admin-success" role="status">{state.done}</p>;
  return null;
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(changeName, {});
  return (
    <form className="admin-form" action={action}>
      <label>
        Your name
        <input type="text" name="name" defaultValue={name} maxLength={80} required />
      </label>
      <Message state={state} />
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save name"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  return (
    <form className="admin-form" action={action}>
      <label>
        Current password
        <input type="password" name="current" autoComplete="current-password" required />
      </label>
      <label>
        New password <span className="admin-optional">(at least 10 characters)</span>
        <input type="password" name="password" autoComplete="new-password" minLength={10} required />
      </label>
      <label>
        Type the new password again
        <input type="password" name="confirm" autoComplete="new-password" minLength={10} required />
      </label>
      <Message state={state} />
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
