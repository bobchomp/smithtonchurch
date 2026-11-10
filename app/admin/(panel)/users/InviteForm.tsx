"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DEFAULT_TOOLS } from "@/lib/admin-tools";
import ToolChecklist from "./ToolChecklist";
import { invite, type UserFormState } from "./actions";

export default function InviteForm() {
  const [state, action, pending] = useActionState<UserFormState, FormData>(invite, {});
  const form = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState("admin");
  useEffect(() => {
    if (state.done) {
      form.current?.reset();
      setRole("admin");
    }
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
        <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">Admin: use the tools you choose</option>
          <option value="owner">Owner: also add and remove logins</option>
        </select>
      </label>
      {role === "admin" ? (
        <ToolChecklist selected={DEFAULT_TOOLS} />
      ) : (
        <p className="admin-muted">Owners can use every tool.</p>
      )}
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.done && <p className="admin-success" role="status">{state.done}</p>}
      <button className="button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send invitation"}</button>
    </form>
  );
}
