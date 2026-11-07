"use client";

import { useState } from "react";

export default function CopySql({ sql }: { sql: string }) {
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
        {copied ? "Copied" : "Copy the setup script"}
      </button>
      <details>
        <summary>Show the script</summary>
        <pre>{sql}</pre>
      </details>
    </div>
  );
}
