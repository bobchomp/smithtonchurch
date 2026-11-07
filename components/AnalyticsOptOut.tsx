"use client";

import { useEffect, useState } from "react";

// On the privacy notice: lets a visitor stop (or restart) the website counting their visits.
export default function AnalyticsOptOut() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null);
  useEffect(() => setOptedOut(/(?:^|;\s*)sc_consent=no(?:;|$)/.test(document.cookie)), []);
  if (optedOut === null) return null;

  const set = (value: "ok" | "no") => {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `sc_consent=${value}; Max-Age=${365 * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
    if (value === "no") {
      document.cookie = "sc_v=; Max-Age=0; Path=/";
      document.cookie = "sc_s=; Max-Age=0; Path=/";
    }
    setOptedOut(value === "no");
  };

  return (
    <div className="privacy-optout" role="status">
      {optedOut ? (
        <>
          <p>Your visits are <strong>not</strong> being counted on this device.</p>
          <button type="button" className="button button-outline" onClick={() => set("ok")}>Count my visits again</button>
        </>
      ) : (
        <>
          <p>Your visits to this website are counted in our statistics on this device.</p>
          <button type="button" className="button" onClick={() => set("no")}>Don’t count me</button>
        </>
      )}
    </div>
  );
}
