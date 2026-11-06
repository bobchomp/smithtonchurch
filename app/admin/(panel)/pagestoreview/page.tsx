import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { REVIEW_PAGES } from "../../(review)/pagestoreview/_shared/options";

export const metadata: Metadata = { title: "Pages to Review" };

export default async function PagesToReview() {
  await requireAdmin();
  return (
    <>
      <h1>Pages to Review</h1>
      <p className="admin-intro">
        Draft designs to look over before anything changes on the website. Each opens in a new tab, exactly as it would
        look on the site, with the real sermons and bulletins. Only people signed in to the admin panel can see them.
      </p>
      {REVIEW_PAGES.length === 0 && (
        <section className="admin-panel">
          <p className="admin-muted">There are no pages to review at the moment.</p>
        </section>
      )}
      <div className="admin-tools">
        {REVIEW_PAGES.map((p) => (
          <a key={p.slug} className="admin-tool" href={`/admin/pagestoreview/${p.slug}/`} target="_blank" rel="noopener noreferrer">
            <h2>{p.title}</h2>
            <p>{p.summary}</p>
            <p className="admin-review-open">Open in a new tab ↗</p>
          </a>
        ))}
      </div>
    </>
  );
}
