"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setNoticeOn } from "./actions";

// On/off switch for a notice. Off = never shows, whatever its times.
export default function NoticeSwitch({ id, on, label }: { id: string; on: boolean; label: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(on);
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      className="admin-switch"
      aria-checked={checked}
      aria-label={`Show “${label}”`}
      disabled={pending}
      onClick={() => {
        const next = !checked;
        setChecked(next);
        startTransition(async () => {
          const result = await setNoticeOn(id, next);
          if (result.error) {
            setChecked(!next);
            alert(result.error);
          }
          router.refresh();
        });
      }}
    >
      <span className="admin-switch-track" aria-hidden="true" />
      {checked ? "On" : "Off"}
    </button>
  );
}
