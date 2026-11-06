// Draft of the new "page not found" (404) page, for review in Admin → Pages to Review.
import type { Metadata } from "next";
import LostPage from "@/components/LostPage";

export const metadata: Metadata = { title: "Page not found (draft)", robots: { index: false, follow: false } };

export default function LostPageDraft() {
  return <LostPage />;
}
