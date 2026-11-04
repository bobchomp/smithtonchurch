"use client";

import { useState } from "react";
import { DOCUMENT_TYPES, MONTH_NAMES, formatDocumentDate, type DocumentKind, type PublicDocument } from "@/lib/document-types";
import DocumentCard from "./DocumentCard";

// Find a past document. Everything happens in the browser, from the list the page was built
// with, so the page itself can stay cached.
export default function DocumentFinder({ kind, archive }: { kind: DocumentKind; archive: PublicDocument[] }) {
  return DOCUMENT_TYPES[kind].precision === "day" ? (
    <DayFinder kind={kind} archive={archive} />
  ) : (
    <MonthFinder kind={kind} archive={archive} />
  );
}

function Result({ kind, doc }: { kind: DocumentKind; doc: PublicDocument }) {
  return (
    <div className="bulletin-grid bulletin-grid-single">
      <DocumentCard kind={kind} doc={doc} />
    </div>
  );
}

// Weekly documents: pick any date; if there's nothing for it, offer the nearest either side.
function DayFinder({ kind, archive }: { kind: DocumentKind; archive: PublicDocument[] }) {
  const { singular } = DOCUMENT_TYPES[kind];
  const [date, setDate] = useState("");
  const found = archive.find((d) => d.date === date);
  // archive is newest first, so the nearest earlier/later ones are either side of the date.
  const earlier = date ? archive.find((d) => d.date < date) : undefined;
  const later = date ? [...archive].reverse().find((d) => d.date > date) : undefined;

  return (
    <div className="bulletin-finder">
      <label>
        Choose a Sunday
        <input
          type="date"
          value={date}
          min={archive[archive.length - 1]?.date}
          max={archive[0]?.date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <div className="bulletin-finder-result" aria-live="polite">
        {found ? (
          <Result kind={kind} doc={found} />
        ) : (
          date && (
            <p>
              There’s no {singular} for {formatDocumentDate(kind, date)}.
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

// Monthly documents: a year dropdown and a month dropdown, offering only months that have one.
function MonthFinder({ kind, archive }: { kind: DocumentKind; archive: PublicDocument[] }) {
  const years = [...new Set(archive.map((d) => d.date.slice(0, 4)))];
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const months = archive.filter((d) => d.date.startsWith(`${year}-`)).map((d) => d.date.slice(5, 7)).sort();
  const found = archive.find((d) => d.date === `${year}-${month}`);

  return (
    <div className="bulletin-finder">
      <div className="bulletin-finder-selects">
        <label>
          Year
          <select
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setMonth("");
            }}
          >
            <option value="">Choose…</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Month
          <select value={month} onChange={(event) => setMonth(event.target.value)} disabled={!year}>
            <option value="">Choose…</option>
            {months.map((m) => (
              <option key={m} value={m}>{MONTH_NAMES[Number(m) - 1]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="bulletin-finder-result" aria-live="polite">
        {found && <Result kind={kind} doc={found} />}
      </div>
    </div>
  );
}
