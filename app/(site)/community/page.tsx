import type { Metadata } from "next";
import CardImage from "@/components/CardImage";
import ServiceTimesGraphic from "@/components/ServiceTimesGraphic";
import PageBanner from "@/components/PageBanner";
import { slugify, whatsOn } from "@/lib/content";

export const metadata: Metadata = {
  title: "What's On",
  description:
    "Groups and activities at Smithton Church, Inverness, through the week – from toddler groups and kids' club to Bible studies, community food night and more.",
};

export default function WhatsOn() {
  return (
    <>
      <PageBanner title="Serving In Our Community" />
      <section className="section section-tight">
        <div className="container">
          <nav className="day-links" aria-label="Jump to a day">
            {whatsOn.map((day) => (
              <a key={day.day} href={`#${slugify(day.day)}`}>{day.day}</a>
            ))}
          </nav>
        </div>
      </section>

      {whatsOn.map((day, i) => (
        <section className={`section${i % 2 ? " section-alt" : ""}`} id={slugify(day.day)} key={day.day}>
          <div className="container">
            <h2 className="section-title">{day.day}</h2>
            <div className="card-grid">
              {day.items.map((item) => (
                <article className="card" key={item.name}>
                  {item.graphic === "service-times" ? (
                    <ServiceTimesGraphic />
                  ) : (
                    item.image && <CardImage src={`/images/whats-on/${item.image}`} />
                  )}
                  <div className="card-body">
                    <h3>{item.name}</h3>
                    {item.details && <p>{item.details}</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
