"use client";

import { useActionState, useEffect, useRef } from "react";
import { invite, type UserFormState } from "./actions";

export default function InviteForm() {
  const [state, action, pending] = useActionState<UserFormState, FormData>(invite, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} className="admin-form" action={action}>
      <div className="admin-month-year admin-pair">
        <label>
          Name
          <input type="text" name="name" maxLength={80} required autoComplete="off" />
        </label>
        <label>
          Email
          <input type="email" name="email" required autoComplete="off" />
        </label>
      </div>
      <label>
        What can they do?
        <select name="role" defaultValue="admin">
          <option value="admin">Admin: use all the admin tools</option>
          <option value="owner">Owner: also add and remove logins</option>
        </select>
      </label>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.done && <p className="admin-success" role="status">{state.done}</p>}
      <button className="button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send invitation"}</button>
    </form>
  );
}
