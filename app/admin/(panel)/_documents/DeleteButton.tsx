"use client";

// A delete button that asks for confirmation first, e.g. "Delete the bulletin for Sunday 8 November 2026?"
export default function DeleteButton({ question, label = "Delete" }: { question: string; label?: string }) {
  return (
    <button
      className="admin-link-button"
      type="submit"
      onClick={(event) => {
        if (!confirm(question)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
