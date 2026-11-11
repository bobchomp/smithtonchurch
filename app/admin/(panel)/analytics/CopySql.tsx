"use client";

import { useState } from "react";

export default function CopySql({ sql, label = "Copy the setup script" }: { sql: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="analytics-sql">
      <button
        type="button"
        className="button"
        onClick={() => {
          navigator.clipboard.writeText(sql).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          });
        }}
      >
        {copied ? "Copied" : label}
      </button>
      <details>
        <summary>Show it</summary>
        <pre>{sql}</pre>
      </details>
    </div>
  );
}
