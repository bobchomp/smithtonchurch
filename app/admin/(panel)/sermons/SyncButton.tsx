"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { syncLivestreamsNow } from "./actions";

export default function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="admin-sync">
      <button
        className="button button-outline"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult(null);
          const outcome = await syncLivestreamsNow();
          setResult(outcome);
          setBusy(false);
          router.refresh();
        }}
      >
        {busy ? "Checking YouTube…" : "Check YouTube now"}
      </button>
      {result && <p className={result.ok ? "admin-success" : "admin-error"} role="status">{result.message}</p>}
    </div>
  );
}
