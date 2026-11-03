"use client";

import { useState } from "react";
import type { PublicBulletin } from "@/lib/bulletins";
import BulletinCard from "./BulletinCard";

// Pick a date to find a past bulletin. Everything happens in the browser, from the list the page
// was built with, so the page itself can stay cached.
export default function BulletinFinder({ archive }: { archive: PublicBulletin[] }) {
  const [date, setDate] = useState("");
  const found = archive.find((b) => b.date === date);
  // archive is newest first, so the nearest earlier/later Sundays are either side of the date.
  const earlier = date ? archive.find((b) => b.date < date) : undefined;
  const later = date ? [...archive].reverse().find((b) => b.date > date) : undefined;
  const oldest = archive[archive.length - 1]?.date;
  const newest = archive[0]?.date;
  const chosenLabel = date
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).replace(",", "")
    : "";

  return (
    <div className="bulletin-finder">
      <label>
        Choose a Sunday
        <input type="date" value={date} min={oldest} max={newest} onChange={(event) => setDate(event.target.value)} />
      </label>
      <div className="bulletin-finder-result" aria-live="polite">
        {found ? (
          <div className="bulletin-grid bulletin-grid-single">
            <BulletinCard bulletin={found} />
          </div>
        ) : (
          date && (
            <p>
              There’s no bulletin for {chosenLabel}.
              {(earlier || later) && " The nearest: "}
              {earlier && (
                <button type="button" className="link-button" onClick={() => setDate(earlier.date)}>
                  {earlier.label}
                </button>
              )}
              {earlier && later && " or "}
              {later && (
                <button type="button" className="link-button" onClick={() => setDate(later.date)}>
                  {later.label}
                </button>
              )}
            </p>
          )
        )}
      </div>
    </div>
  );
}
