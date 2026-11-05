import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import PageBanner from "@/components/PageBanner";
import { site } from "@/lib/content";

export const metadata: Metadata = pageMetadata("/giving/", {
  title: "Giving",
  description:
    "Ways to give to the ministry of Smithton Church, Inverness – online, by bank transfer, card, cheque or phone.",
});

export default function Giving() {
  return (
    <>
      <PageBanner title="Serving & Giving" />
      <section className="section">
        <div className="container giving">
          <div className="prose">
            <h2>Why we give</h2>
            <p>
              Thank you for giving to the ministry of Smithton Church. We consider each gift an important expression of
              worship. Whether you give online, or during a Sunday service, we appreciate the generous way you support
              God’s work and we are committed to being faithful stewards of God’s resources.
            </p>
            <p>
              With online giving, you can give to Smithton Church with recurring or one-time gifts. Online contributions
              are accepted through bank account, debit card, or credit card.
            </p>
            <div className="callout">
              <h3>Give online</h3>
              <p>
                You can make an online payment directly to the church. This also allows Gift Aid to be included where
                applicable, and supports the General Fund of the church.
              </p>
              <p>
                <a className="button" href={site.donate_link}>Make a donation</a>
              </p>
            </div>
          </div>
          <Image className="giving-image" src="/images/handtree.png" alt="" width={500} height={400} />
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Ways to give</h2>
          <div className="card-grid card-grid-4">
            <div className="card card-text">
              <h3>Bank transfer</h3>
              <p>
                Electronic fund transfer from your bank account. This requires your bank name, account type, account
                number and sort code.
              </p>
            </div>
            <div className="card card-text">
              <h3>Credit card</h3>
              <p>
                You will need to provide your card number, expiry date, security code, billing address and card holder’s
                full name.
              </p>
            </div>
            <div className="card card-text">
              <h3>Cheque</h3>
              <p>
                Make cheques payable to Smithton Church and post to: Smithton Church, Murray Road, Smithton, Inverness,
                IV2 7YU.
              </p>
            </div>
            <div className="card card-text">
              <h3>Phone or email</h3>
              <p>
                Telephone the church office on <a href={`tel:${site.phone_link}`}>{site.phone}</a> or email{" "}
                <a href={`mailto:${site.treasurer_email}`}>{site.treasurer_email}</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
