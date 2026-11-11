import type { ReactNode } from "react";
import { describePart, missingSetup, setupScript } from "@/lib/db-setup";
import CopySql from "../analytics/CopySql";

// The panel asking an owner to run SQL in Supabase's SQL editor: just the parts of supabase/setup.sql
// the database is missing, or the whole script if that can't be worked out.
export default async function DatabaseSetup({ title, children, details }: { title: string; children: ReactNode; details?: string }) {
  const missing = await missingSetup();
  let sql: string;
  let whole = false;
  if (missing && missing.parts.length) {
    sql = missing.sql;
  } else {
    whole = true;
    try {
      sql = setupScript();
    } catch {
      sql = "-- The setup script (supabase/setup.sql) couldn’t be read.";
    }
  }
  const label = whole ? "the setup script" : "the SQL";
  return (
    <section className="admin-panel admin-panel-narrow analytics-setup">
      <h2>{title}</h2>
      {children}
      {!whole && missing && (
        <>
          <p>Your database is missing {missing.parts.length === 1 ? "one part" : `${missing.parts.length} parts`}:</p>
          <ul className="analytics-setup-parts">
            {missing.parts.map((p) => (
              <li key={`${p.kind}:${p.name}`}>{describePart(p)}</li>
            ))}
          </ul>
        </>
      )}
      <ol>
        <li>Press <strong>Copy {label}</strong> below.</li>
        <li>In the Supabase dashboard, open your project, then <strong>SQL Editor</strong> → <strong>New query</strong>.</li>
        <li>Paste it and press <strong>Run</strong>. It should say “Success. No rows returned”.</li>
        <li>Come back here and reload this page.</li>
      </ol>
      <p className="admin-muted">Running it again later is always safe: it only adds what’s missing and keeps everything already saved.</p>
      <CopySql sql={sql} label={`Copy ${label}`} />
      {details ? <p className="admin-muted analytics-setup-error">Details: {details}</p> : null}
    </section>
  );
}
