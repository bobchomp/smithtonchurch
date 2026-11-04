import { site } from "@/lib/content";
import ContactFormFields from "./ContactFormFields";

// A contact form section. Messages are saved in the admin panel (Messages) and emailed to the people
// chosen there. `source` says which form a message came from.
export default function ContactForm({
  heading = "Contact Form",
  intro = "Please fill in this form and it will be sent to the church office. We will get back to you as soon as we can.",
  source = "home",
}: {
  heading?: string;
  intro?: string;
  source?: "home" | "venue";
}) {
  return (
    <section className="section contact-section" id="contact">
      <div className="container narrow">
        <h2 className="section-title">{heading}</h2>
        <p className="section-intro">{intro}</p>
        <ContactFormFields source={source} />
        <p className="contact-alternative">
          Or call the church office on <a href={`tel:${site.phone_link}`}>{site.phone}</a>, or email{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </div>
    </section>
  );
}
