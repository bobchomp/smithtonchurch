import Link from "next/link";
import AnalyticsOptOut from "@/components/AnalyticsOptOut";
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
          You can browse this website without telling us who you are. We collect two kinds of information: anonymous
          statistics about how the website is used (see <a href="#statistics">Website statistics</a> below), and the
          details you give us if you choose to send us a message using the contact form. The form asks for:
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
          Your message is stored securely and can only be read by the church office staff.
        </p>
        <p>We use trusted service providers to run the website, who handle information on our behalf:</p>
        <ul>
          <li><strong>Vercel</strong>, which hosts the website</li>
          <li><strong>Supabase</strong>, which stores contact form messages, website statistics and website files</li>
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
        <p>
          Website statistics don’t identify you, so we keep them to see how the website is used over the years.
        </p>

        <h2 id="statistics">Website statistics</h2>
        <p>
          To understand how the website is used, so that we can improve it, the website keeps its own statistics. We
          record which pages are visited, how long people spend on them and how far down they scroll, which links and
          buttons are pressed and where on the page people click or tap, whether a message was sent with the contact
          form (the message itself is kept separately, as described above), which sermons are played and how far through, what is searched for in the sermon archive,
          addresses that couldn’t be found, the website or link that brought someone here, the type of device, browser and screen
          size, and the approximate town and country (worked out from the internet connection when the page is
          requested; we don’t store IP addresses).
        </p>
        <p>
          We don’t use these statistics to find out who you are, we don’t combine them with other information about
          you, and we never share or sell them. They are kept by us, not by an advertising or analytics company. We use
          them on the basis of our legitimate interest in running and improving the website.
        </p>
        <p>
          You can choose not to be counted at any time with the button below. It applies to the browser and device
          you’re using, so press it on each one you use.
        </p>
        <AnalyticsOptOut />

        <h2>Cookies</h2>
        <p>
          This website does not use advertising cookies or anything that follows you around other websites. The website
          sets these cookies itself:
        </p>
        <ul>
          <li>
            <strong>sc_v</strong> (1 year): a random number so our statistics can tell a returning visitor from a new
            one. It doesn’t contain anything about you.
          </li>
          <li>
            <strong>sc_s</strong> (30 minutes): groups the pages you look at in one visit.
          </li>
          <li>
            <strong>sc_consent</strong> (1 year): remembers that you’ve asked not to be counted.
          </li>
          <li>
            <strong>sc_admin</strong> and a sign-in cookie: only for people who look after the website, so their own
            visits aren’t counted and they can use its admin area.
          </li>
        </ul>
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
            provided by our streaming service, whose privacy policy can be found here:{" "}
            <a href="https://stream.rossmackenzie.co.uk/privacy.html" target="_blank" rel="noopener noreferrer">
              stream.rossmackenzie.co.uk/privacy.html<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            .
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
          You can also complain to the Information Commissioner’s Office (
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">
            ico.org.uk<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          ).
        </p>

        <h2>Changes to this notice</h2>
        <p>We may update this notice from time to time. The date at the top shows when it was last changed.</p>
      </div>
    </section>
  );
}
