import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import NoticeForm from "../NoticeForm";

export const metadata: Metadata = { title: "Add a live notice" };

export default async function NewNotice() {
  await requireAdmin();
  return (
    <>
      <p className="admin-breadcrumb">
        <Link href="/admin/">Dashboard</Link> / <Link href="/admin/live-notices/">Live Notices</Link> / Add
      </p>
      <h1>Add a notice</h1>
      <section className="admin-panel admin-panel-narrow">
        <NoticeForm />
      </section>
    </>
  );
}
