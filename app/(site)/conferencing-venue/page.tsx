import type { Metadata } from "next";
import Image from "next/image";
import CardImage from "@/components/CardImage";
import ContactForm from "@/components/ContactForm";
import PageBanner from "@/components/PageBanner";
import { site, venueRooms } from "@/lib/content";

export const metadata: Metadata = {
  title: "Conferencing Venue",
  description:
    "Hire Smithton Church in Inverness for conferences, meetings and events – an auditorium with live streaming, meeting rooms, café, kitchen, free wifi and parking for around 200 cars.",
};

const avPhotos = [
  { src: "/images/venue/mixing-desk.jpg", alt: "The sound mixing desk" },
  { src: "/images/venue/av.jpg", alt: "The audio-visual desk" },
  { src: "/images/venue/stream.jpg", alt: "Live streaming equipment" },
];

const parkingPhotos = [
  { src: "/images/venue/parking-1.jpg", alt: "The church car park" },
  { src: "/images/venue/parking-2.jpg", alt: "The church car park" },
  { src: "/images/venue/parking-3.jpg", alt: "The church car park" },
];

function PhotoStrip({ photos }: { photos: { src: string; alt: string }[] }) {
  return (
    <div className="photo-strip">
      {photos.map((photo) => (
        <Image key={photo.src} src={photo.src} alt={photo.alt} width={400} height={300} sizes="(max-width: 800px) 33vw, 180px" />
      ))}
    </div>
  );
}

export default function ConferencingVenue() {
  return (
    <>
      <PageBanner title="Conferencing Venue" />
      <section className="section">
        <div className="container venue-intro">
          <div className="prose">
            <h2>A church at the heart of the community</h2>
            <p>
              As a church at the heart of the community, we welcome community use of our conferencing facilities.
              Smithton Church is a modern building with a variety of rooms also available for hire by external
              organisations.
            </p>
            <p>
              There are additional meeting rooms of various sizes with free wifi throughout the building. We offer a
              complete solution for your event, using the very latest in digital technologies, modern catering
              facilities, and a large car park with spaces for around 200 vehicles.
            </p>
            <p>
              Costs on application from the church office. Call <a href={`tel:${site.phone_link}`}>{site.phone}</a> or{" "}
              <a href="#contact">send us a message</a>.
            </p>
          </div>
          <Image
            src="/images/venue/church.jpg"
            alt="Smithton Church building"
            width={1080}
            height={530}
            sizes="(max-width: 800px) 100vw, 540px"
          />
        </div>
      </section>

      <section className="section section-alt">
        <div className="container feature-row">
          <div>
            <h2>Audio, visual and live stream facilities</h2>
            <PhotoStrip photos={avPhotos} />
          </div>
          <div>
            <h2>Car parking</h2>
            <p>Spaces available for around 200 vehicles.</p>
            <PhotoStrip photos={parkingPhotos} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Conference rooms</h2>
          <div className="card-grid">
            {venueRooms.map((room) => (
              <article className="card" key={room.name}>
                <CardImage src={`/images/venue/${room.image}`} />
                <div className="card-body">
                  <h3>{room.name}</h3>
                  {room.details && <p>{room.details}</p>}
                  {room.capacity && (
                    <p>
                      <strong>Capacity:</strong> {room.capacity}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ContactForm
        heading="Enquire about availability"
        intro={`Send us a message using the form below, or call the church office on ${site.phone}.`}
        source="venue"
      />
    </>
  );
}
