import { site } from "@/lib/content";

// Sends messages to the church office through Formspree once formspree_id is set in
// content/site.yml. Until then it shows the office phone number and email instead.
export default function ContactForm({
  heading = "Contact Form",
  intro = "Please fill in this form and it will be sent to the church office. We will get back to you as soon as we can.",
  subject = "Website enquiry",
}: {
  heading?: string;
  intro?: string;
  subject?: string;
}) {
  return (
    <section className="section contact-section" id="contact">
      <div className="container narrow">
        <h2 className="section-title">{heading}</h2>
        <p className="section-intro">{intro}</p>
        {site.formspree_id ? (
          <form className="contact-form" action={`https://formspree.io/f/${site.formspree_id}`} method="post">
            <input type="hidden" name="_subject" value={subject} />
            <div className="form-row">
              <label>
                Name <input type="text" name="name" autoComplete="name" required maxLength={400} />
              </label>
              <label>
                Email <input type="email" name="email" autoComplete="email" required maxLength={400} />
              </label>
            </div>
            <label>
              Subject <input type="text" name="subject" maxLength={400} />
            </label>
            <label>
              Message <textarea name="message" rows={7} required maxLength={2000} />
            </label>
            <input type="text" name="_gotcha" className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <button className="button" type="submit">Send</button>
          </form>
        ) : (
          <div className="contact-fallback">
            <p>
              Call the church office on <a href={`tel:${site.phone_link}`}>{site.phone}</a> or email{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
