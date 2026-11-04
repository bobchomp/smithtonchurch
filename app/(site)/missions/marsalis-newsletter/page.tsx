import type { Metadata } from "next";
import Link from "next/link";
import DocumentShowcase from "@/components/DocumentShowcase";
import PageBanner from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "Marsali’s Newsletter",
  description: "Read the newsletter from Marsali Campbell, Smithton Church’s missionary.",
};

// Refreshed straight away when a newsletter is uploaded in the admin panel, and hourly as a fallback.
export const revalidate = 3600;

export default function MarsalisNewsletter() {
  return (
    <>
      <PageBanner title="Marsali’s Newsletter" />
      <DocumentShowcase
        kind="newsletter"
        eyebrow="Latest newsletter"
        intro={
          <>
            <p>
              News and prayer points from Marsali Campbell, known as ‘Smithton’s missionary’. Find out more about
              Marsali on our <Link href="/missions/#marsali-campbell">Missions page</Link>.
            </p>
            <p>
              To receive Marsali’s newsletter by email, contact her at{" "}
              <a href="mailto:hebrides88@gmail.com">hebrides88@gmail.com</a>.
            </p>
          </>
        }
        readLabel="Read the newsletter (PDF)"
      />
    </>
  );
}
