import Link from "next/link";
import { site } from "@/lib/content";

// The website privacy notice (/privacy/). Keep "Last updated" current when it changes.
export default function PrivacyNotice() {
  return (
    <section className="section">
      <div className="container narrow prose privacy">
        <p className="privacy-updated">Last updated: November 2026</p>

        <h2>Who we are</h2>
        <p>
          This website is run by Smithton &amp; Culloden Free Church (known as Smithton Church), {site.address_lines.join(", ")}.
          We are a Scottish Charity (SC012271) and a congregation of the Free Church of Scotland. We are responsible for
          the personal information collected through this website.
        </p>
        <p>
          If you have any questions about this notice or how we use your information, please contact the church office
          at <a href={`mailto:${site.email}`}>{site.email}</a> or on <a href={`tel:${site.phone_link}`}>{site.phone}</a>.
        </p>

        <h2>What we collect</h2>
        <p>
          You can browse this website without telling us who you are. We only collect personal information when you
          choose to send us a message using the contact form on the website. The form asks for:
        </p>
        <ul>
          <li>your first and last name</li>
          <li>your email address</li>
          <li>the subject and content of your message</li>
        </ul>
        <p>
          Please don’t include sensitive personal information (for example about your health) in a message unless you
          need to. If you do, we will treat it with particular care and only use it to respond to you.
        </p>

        <h2>How we use it</h2>
        <p>
          We use the details you send only to read and reply to your message, and to follow up your enquiry (for example
          about booking the conferencing venue). We will not add you to a mailing list, and we never sell or share your
          information for marketing.
        </p>
        <p>
          Our lawful basis for this is our legitimate interest in responding to people who contact us. Where your
          message tells us about your religious beliefs, we process this as a not-for-profit religious body, only in
          connection with our work and in replying to you.
        </p>

        <h2>Who can see it</h2>
        <p>
          Your message is stored securely and can only be read by the church office staff and others who help run the
          church and have a login to the website’s admin area. A copy is also sent by email to the people responsible
          for answering messages.
        </p>
        <p>We use trusted service providers to run the website, who handle information on our behalf:</p>
        <ul>
          <li><strong>Vercel</strong>, which hosts the website</li>
          <li><strong>Supabase</strong>, which stores contact form messages and website files</li>
          <li><strong>Resend</strong>, which sends the email notifications of new messages</li>
        </ul>
        <p>
          Some of these providers may store or process information outside the UK. Where they do, appropriate
          safeguards are in place, such as the UK’s approved data protection contract terms.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep messages only for as long as we need them to deal with your enquiry. We review them regularly and
          delete them when they are no longer needed.
        </p>

        <h2>Cookies</h2>
        <p>
          This website does not use advertising or tracking cookies, and we don’t use analytics that follow you around
          the web. The only cookie the website sets itself is a sign-in cookie for people who look after the website,
          used in its admin area.
        </p>
        <p>Some pages include content from other services, which may set their own cookies or collect information:</p>
        <ul>
          <li>
            <strong>YouTube</strong>: sermon videos use YouTube’s privacy-enhanced mode, and the video only loads when
            you press play. Video preview pictures are loaded from YouTube.
          </li>
          <li>
            <strong>Google Maps</strong>: the map on the home page is provided by Google.
          </li>
          <li>
            <strong>Our live stream</strong>: the player on the <Link href="/live/">Live Services</Link> page is
            provided by our streaming service.
          </li>
        </ul>
        <p>
          Links to other websites, such as ChurchSuite, our online giving page and the Free Church of Scotland, are
          covered by those websites’ own privacy notices.
        </p>

        <h2>Your rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>ask for a copy of the personal information we hold about you</li>
          <li>ask us to correct anything that is wrong</li>
          <li>ask us to delete your information</li>
          <li>object to how we use it, or ask us to limit how we use it</li>
        </ul>
        <p>
          To do any of these, contact the church office at <a href={`mailto:${site.email}`}>{site.email}</a>. We will
          reply within one month.
        </p>
        <p>
          If you are unhappy with how we have handled your information, please talk to us first. You also have the
          right to complain to the Information Commissioner’s Office (ICO) at{" "}
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">
            ico.org.uk<span className="visually-hidden"> (opens in a new tab)</span>
          </a>{" "}
          or on 0303 123 1113.
        </p>

        <h2>Changes to this notice</h2>
        <p>We may update this notice from time to time. The date at the top shows when it was last changed.</p>
      </div>
    </section>
  );
}
