import type { Metadata } from "next";
import { requireTool } from "@/lib/admin-auth";
import NoticeForm from "../NoticeForm";

export const metadata: Metadata = { title: "Add a live notice" };

export default async function NewNotice() {
  await requireTool("live-notices");
  return (
    <>
      <h1>Add a notice</h1>
      <section className="admin-panel admin-panel-narrow">
        <NoticeForm />
      </section>
    </>
  );
}
