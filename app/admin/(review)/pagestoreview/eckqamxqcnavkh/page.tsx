// Draft of the privacy notice page, for review in Admin → Pages to Review.
import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";
import PrivacyNotice from "@/components/PrivacyNotice";

export const metadata: Metadata = { title: "Privacy notice (draft)", robots: { index: false, follow: false } };

export default function PrivacyDraft() {
  return (
    <>
      <PageBanner title="Privacy Notice" />
      <PrivacyNotice />
    </>
  );
}
