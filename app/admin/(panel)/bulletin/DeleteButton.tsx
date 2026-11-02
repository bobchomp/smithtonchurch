"use client";

export default function DeleteButton({ label }: { label: string }) {
  return (
    <button
      className="admin-link-button"
      type="submit"
      onClick={(event) => {
        if (!confirm(`Delete the bulletin for ${label}?`)) event.preventDefault();
      }}
    >
      Delete
    </button>
  );
}
