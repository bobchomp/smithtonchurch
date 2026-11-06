import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LostPage from "@/components/LostPage";
import { navigation, site } from "@/lib/content";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Shown for any address that doesn't exist. It sits outside the (site) layout,
// so it adds the header and footer itself.
export default function NotFound() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header navigation={navigation} churchsuiteLink={site.churchsuite_link} />
      <main id="main">
        <LostPage />
      </main>
      <Footer />
    </>
  );
}
