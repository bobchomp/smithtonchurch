import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { loadNotices, noticeImageUrl } from "@/lib/live-notices";
import NoticeForm from "../NoticeForm";

export const metadata: Metadata = { title: "Edit live notice" };

export default async function EditNotice({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = (await params).id;
  const notice = (await loadNotices()).find((n) => n.id === id);
  if (!notice) notFound();
  return (
    <>
      <h1>Edit notice</h1>
      <section className="admin-panel admin-panel-narrow">
        <NoticeForm notice={notice} imageUrl={notice.image ? noticeImageUrl(notice.image.path) : undefined} />
      </section>
    </>
  );
}
