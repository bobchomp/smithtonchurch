import Link from "next/link";
import PageBanner from "@/components/PageBanner";

export default function NotFound() {
  return (
    <>
      <PageBanner title="Page not found" />
      <section className="section">
        <div className="container narrow center prose">
          <p>Sorry, we couldn’t find that page. It may have moved when the website was updated.</p>
          <p>
            <Link className="button" href="/">Go to the home page</Link>
          </p>
        </div>
      </section>
    </>
  );
}
