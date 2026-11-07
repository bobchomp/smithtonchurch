"use client";

import { useActionState, useState } from "react";
import type { AdminRole } from "@/lib/admin-auth";
import type { AdminTool } from "@/lib/admin-tools";
import ToolChecklist from "../users/ToolChecklist";
import { savePermissions, type PermissionsState } from "./actions";

export default function PermissionsForm({ id, role: savedRole, tools, lastOwner }: { id: string; role: AdminRole; tools: AdminTool[]; lastOwner: boolean }) {
  const [state, action, pending] = useActionState<PermissionsState, FormData>(savePermissions, {});
  const [role, setRole] = useState<AdminRole>(savedRole);
  return (
    <form className="admin-form" action={action}>
      <input type="hidden" name="id" value={id} />
      <label>
        What can they do?
        <select name="role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)} disabled={lastOwner}>
          <option value="admin">Admin: use the tools you choose</option>
          <option value="owner">Owner: every tool, and manage logins</option>
        </select>
      </label>
      {lastOwner && <input type="hidden" name="role" value="owner" />}
      {role === "admin" ? (
        <ToolChecklist selected={tools} />
      ) : (
        <p className="admin-muted">
          Owners can use every tool and manage logins.{lastOwner && " This is the only owner, so it can’t be changed to an admin."}
        </p>
      )}
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.done && <p className="admin-success" role="status">{state.done}</p>}
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
