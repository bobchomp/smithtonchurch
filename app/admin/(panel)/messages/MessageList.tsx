"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContactMessage } from "@/lib/messages";
import { deleteSelectedMessages } from "./actions";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

export default function MessageList({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allSelected = messages.length > 0 && selected.size === messages.length;

  async function remove() {
    if (!confirm(`Delete ${selected.size} message${selected.size === 1 ? "" : "s"}? This can’t be undone.`)) return;
    setBusy(true);
    const result = await deleteSelectedMessages([...selected]);
    setBusy(false);
    if (result.error) return setError(result.error);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <>
      <div className="admin-bulk-bar">
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(box) => {
              if (box) box.indeterminate = selected.size > 0 && !allSelected;
            }}
            onChange={() => setSelected(allSelected ? new Set() : new Set(messages.map((m) => m.id)))}
          />
          {allSelected ? "Deselect all" : "Select all"}
        </label>
        <button className="button button-danger" type="button" disabled={busy || selected.size === 0} onClick={remove}>
          {busy ? "Deleting…" : `Delete ${selected.size || ""} selected`.replace("  ", " ")}
        </button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <ul className="admin-list admin-messages">
        {messages.map((m) => (
          <li key={m.id} className={m.read ? "" : "is-unread"}>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                aria-label={`Select the message from ${m.name}`}
                onChange={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(m.id)) next.delete(m.id);
                    else next.add(m.id);
                    return next;
                  })
                }
              />
            </label>
            <Link className="admin-message-row" href={`/admin/messages/${m.id}/`}>
              <span className="admin-message-from">
                {!m.read && <span className="admin-dot" aria-label="Unread" />}
                {m.name}
              </span>
              <span className="admin-message-subject">
                {m.subject || "(no subject)"} <span className="admin-muted">– {m.message.slice(0, 90)}{m.message.length > 90 ? "…" : ""}</span>
              </span>
              <span className="admin-muted admin-message-meta">
                {when(m.receivedAt)} · {m.source}
                {m.emailed === false && <span className="admin-error"> · email not sent</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
