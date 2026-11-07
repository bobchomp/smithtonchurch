"use client";

import { useRef, type ReactNode } from "react";

// A button that opens a popup with every uploaded document (the list itself is drawn on the server).
export default function AllDocuments({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="button button-outline admin-all-docs-button" onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={dialog}
        className="admin-dialog admin-all-docs"
        aria-labelledby="all-docs-title"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="admin-all-docs-head">
          <h2 id="all-docs-title">{title}</h2>
          <button type="button" className="admin-dialog-close" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </div>
        <div className="admin-all-docs-body">{children}</div>
      </dialog>
    </>
  );
}
