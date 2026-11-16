import type { Metadata } from "next";
import LostPage from "@/components/LostPage";

export const metadata: Metadata = { title: "Page not found" };

// "Page not found" inside the admin panel (with the admin bar, not the public website's header and footer).
export default function AdminNotFound() {
  return <LostPage admin />;
}
