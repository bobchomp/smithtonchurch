import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Page not found" };

// Any admin address that doesn't exist: the admin panel's own "page not found" (after signing in,
// so it doesn't reveal anything to people who aren't).
export default async function MissingAdminPage() {
  await requireAdmin();
  notFound();
}
