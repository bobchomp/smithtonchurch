export default function PageBanner({ title }: { title: string }) {
  return (
    <section className="page-banner">
      <div className="container">
        <h1>{title}</h1>
      </div>
    </section>
  );
}
