import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { navigation } from "@/lib/content";

// Header and footer for the public website pages.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header navigation={navigation} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
