import Link from "next/link";

// The "page not found" (404) message: a short poem whose lines appear one after another.
const POEM = [
  "This page is lost, but there’s a way,",
  "A truth and life for every day.",
  "Not found here? Don’t lose sight,",
  "Jesus is the Way, the Truth, the Light.",
];

export default function LostPage() {
  return (
    <section className="lost">
      <div className="container lost-inner">
        <p className="lost-code" aria-hidden="true">404</p>
        <h1 className="lost-title">Page not found</h1>
        <p className="lost-poem">
          {POEM.map((line, i) => (
            <span key={line} className="lost-line" style={{ animationDelay: `${0.6 + i * 1.1}s` }}>
              {line}
            </span>
          ))}
        </p>
        <div className="lost-after" style={{ animationDelay: `${0.6 + POEM.length * 1.1 + 0.2}s` }}>
          <p>Sorry, we couldn’t find the page you were looking for. It may have moved when the website was updated.</p>
          <p className="actions">
            <Link className="button" href="/">Go to the home page</Link>
            <Link className="button button-outline" href="/about-us/#what-we-believe">What we believe</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
