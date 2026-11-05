"use client";

import { useState } from "react";
import { MONTH_NAMES } from "@/lib/document-types";

// Our own calendar, so it looks and works the same on every phone and computer (the browser's
// built-in date box is awkward on iPhones). Only the dates in `available` can be chosen.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function longDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).replace(",", "");
}

export default function DatePicker({
  label,
  value,
  onChange,
  available,
}: {
  label: string;
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  available: string[]; // YYYY-MM-DD, any order
}) {
  const sorted = [...available].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const start = value || last || new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)) - 1); // 0-11
  const allowed = new Set(available);

  const firstYear = Number((first ?? start).slice(0, 4));
  const lastYear = Number((last ?? start).slice(0, 4));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i);
  const monthKey = year * 12 + month;
  const canGoBack = first ? monthKey > Number(first.slice(0, 4)) * 12 + Number(first.slice(5, 7)) - 1 : false;
  const canGoOn = last ? monthKey < Number(last.slice(0, 4)) * 12 + Number(last.slice(5, 7)) - 1 : false;

  function show(y: number, m: number) {
    const key = Math.min(Math.max(y * 12 + m, firstYear * 12), lastYear * 12 + 11);
    setYear(Math.floor(key / 12));
    setMonth(key % 12);
  }

  // The month's days, with blanks before the 1st so weeks start on Monday.
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const blanks = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array<null>(blanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const inMonth = sorted.filter((d) => d.startsWith(`${year}-${pad(month + 1)}-`)).length;

  return (
    <div className="date-picker">
      <span className="date-picker-label">{label}</span>
      <button
        type="button"
        className="date-picker-field"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value ? longDate(value) : "Choose a date"}</span>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 7v10H5V9h14Z"
          />
        </svg>
      </button>

      {open && (
        <div className="date-picker-panel">
          <div className="date-picker-head">
            <button type="button" className="date-picker-nav" onClick={() => show(year, month - 1)} disabled={!canGoBack} aria-label="Previous month">
              ‹
            </button>
            <select value={month} onChange={(e) => show(year, Number(e.target.value))} aria-label="Month">
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => show(Number(e.target.value), month)} aria-label="Year">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" className="date-picker-nav" onClick={() => show(year, month + 1)} disabled={!canGoOn} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="date-picker-grid" role="grid">
            {WEEKDAYS.map((d) => (
              <span key={d} className="date-picker-weekday" aria-hidden="true">{d.slice(0, 1)}</span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} />;
              const date = iso(year, month, day);
              const ok = allowed.has(date);
              return (
                <button
                  key={date}
                  type="button"
                  className={`date-picker-day${ok ? " is-available" : ""}${date === value ? " is-selected" : ""}`}
                  disabled={!ok}
                  aria-pressed={date === value}
                  aria-label={longDate(date)}
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="date-picker-note">{inMonth ? "Highlighted dates can be chosen." : "Nothing this month. Try another month."}</p>
        </div>
      )}
    </div>
  );
}
