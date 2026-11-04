import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { streamSlot } from "@/lib/livestream-match";
import { loadLivestreams } from "@/lib/livestreams";
import { r2IsConfigured } from "@/lib/r2";
import { loadSermons } from "@/lib/sermons";
import SermonForm from "../SermonForm";
import { lastSunday, namesByUse } from "../shared";

export const metadata: Metadata = { title: "Add a sermon" };

export default async function NewSermon({ searchParams }: { searchParams: Promise<{ video?: string }> }) {
  await requireAdmin();
  const [sermons, { streams }] = await Promise.all([loadSermons().catch(() => []), loadLivestreams()]);
  // "Create sermon" from a livestream fills in its date, service, title and video.
  const videoId = (await searchParams).video;
  const stream = streams.find((s) => s.id === videoId);
  const prefill = stream && { title: stream.title, ...streamSlot(stream), video: stream.id };
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
          streams={streams}
          prefill={prefill}
        />
      </section>
    </>
  );
}
