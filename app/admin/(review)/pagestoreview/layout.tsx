import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { requireAdmin } from "@/lib/admin-auth";
import { navigation, site } from "@/lib/content";

// Draft pages for review (Admin → Pages to Review): shown exactly as the public site would show
// them, with its header and footer, but only to people signed in to the admin panel. Their
// addresses are random so they can't be guessed.
export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="review-page">
      <Header navigation={navigation} churchsuiteLink={site.churchsuite_link} />
      <main id="main">{children}</main>
      <Footer />
      <Link className="review-badge" href="/admin/pagestoreview/">
        Draft for review · not live
      </Link>
    </div>
  );
}
