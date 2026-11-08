import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import CopySql from "../analytics/CopySql";

// The panel asking an owner to run (or re-run) supabase/setup.sql in Supabase's SQL editor.
export default function DatabaseSetup({ title, children, details }: { title: string; children: ReactNode; details?: string }) {
  let sql = "";
  try {
    sql = readFileSync(join(process.cwd(), "supabase/setup.sql"), "utf8");
  } catch {
    sql = "-- The setup script (supabase/setup.sql) couldn’t be read.";
  }
  return (
    <section className="admin-panel admin-panel-narrow analytics-setup">
      <h2>{title}</h2>
      {children}
      <ol>
        <li>Press <strong>Copy the setup script</strong> below.</li>
        <li>In the Supabase dashboard, open your project, then <strong>SQL Editor</strong> → <strong>New query</strong>.</li>
        <li>Paste the script and press <strong>Run</strong>. It should say “Success. No rows returned”.</li>
        <li>Come back here and reload this page.</li>
      </ol>
      <p className="admin-muted">Running it again later is always safe: it only adds what’s missing and keeps everything already saved.</p>
      <CopySql sql={sql} />
      {details ? <p className="admin-muted analytics-setup-error">Details: {details}</p> : null}
    </section>
  );
}
