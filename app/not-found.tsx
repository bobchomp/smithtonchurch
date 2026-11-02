import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageBanner from "@/components/PageBanner";
import { navigation } from "@/lib/content";

// Shown for any address that doesn't exist. It sits outside the (site) layout,
// so it adds the header and footer itself.
export default function NotFound() {
  return (
    <>
      <Header navigation={navigation} />
      <main id="main">
        <PageBanner title="Page not found" />
        <section className="section">
          <div className="container narrow center prose">
            <p>Sorry, we couldn’t find that page. It may have moved when the website was updated.</p>
            <p>
              <Link className="button" href="/">Go to the home page</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
