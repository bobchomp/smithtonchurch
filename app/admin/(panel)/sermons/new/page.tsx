import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { r2IsConfigured } from "@/lib/r2";
import { loadSermons } from "@/lib/sermons";
import SermonForm from "../SermonForm";
import { lastSunday, namesByUse } from "../shared";

export const metadata: Metadata = { title: "Add a sermon" };

export default async function NewSermon() {
  await requireAdmin();
  const sermons = await loadSermons().catch(() => []);
  return (
    <>
      <p className="admin-breadcrumb">
        <Link href="/admin/">Dashboard</Link> / <Link href="/admin/sermons/">Sermons</Link> / Add
      </p>
      <h1>Add a sermon</h1>
      <section className="admin-panel admin-panel-narrow">
        <SermonForm
          preachers={namesByUse(sermons, (s) => s.preacher)}
          seriesNames={namesByUse(sermons, (s) => s.series)}
          audioReady={r2IsConfigured()}
          defaultDate={lastSunday()}
        />
      </section>
    </>
  );
}
