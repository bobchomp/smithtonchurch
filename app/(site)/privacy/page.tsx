import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";
import PrivacyNotice from "@/components/PrivacyNotice";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/privacy/", {
  title: "Privacy Notice",
  description:
    "How Smithton Church uses the information collected through this website: contact form messages, website statistics and cookies, and your rights.",
});

export default function Privacy() {
  return (
    <>
      <PageBanner title="Privacy Notice" />
      <PrivacyNotice />
    </>
  );
}
