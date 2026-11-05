import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Find out about Smithton Church in Inverness – what we believe, our Quiet Room, children's ministry and support for those with additional needs.",
};

// Documents and websites about what the Free Church believes (they open in a new tab).
const beliefLinks = [
  { label: "Free Church of Scotland", href: "https://freechurch.org" },
  { label: "Westminster Confession of Faith", href: "https://freechurch.org/wp-content/uploads/2024/07/Westminster_Confession_of_Faith.pdf" },
  { label: "Westminster Shorter Catechism", href: "https://freechurch.org/wp-content/uploads/2024/07/Westminster_Shorter_Catechism.pdf" },
  { label: "Westminster Larger Catechism", href: "https://freechurch.org/wp-content/uploads/2024/07/Westminster_Larger_Catechism.pdf" },
];

export default function AboutUs() {
  return (
    <>
      <PageBanner title="About Smithton Church" />
      <section className="section">
        <div className="container narrow prose">
          <h2 className="section-title">We’re all different!</h2>
          <p>
            At Smithton Church, we know that larger gatherings can sometimes feel overwhelming. To help everyone feel
            comfortable, we offer a dedicated Quiet Room where you can still be part of the service via a live TV feed.
          </p>
          <p>
            You’ll find the Quiet Room on the right-hand side as you enter the auditorium. If you need any assistance,
            just speak to a member of our Welcome Team – they’ll be happy to help.
          </p>
          <p>
            We’re so glad you’re here. Our aim is to support you in whatever way you need, so you can feel relaxed and
            fully able to take part.
          </p>
          <p>
            We also have a thriving children’s ministry and do our best to support those with additional needs. Please
            don’t hesitate to talk to us – we’re here for you.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container narrow prose">
          <h2 className="section-title">What we believe</h2>
          <p>
            We believe that the Bible clearly teaches us about God’s plan for the world, about the root cause of all of
            the problems and challenges in life (sin), and that God sent his son Jesus to the world with a message of
            forgiveness, and a promise that He has done all that is necessary to save us from sin and its consequences.
          </p>
          <p>Smithton Church is part of the Free Church of Scotland, which believes three main truths:</p>
          <ol className="beliefs">
            <li>
              <strong>Firstly,</strong> we believe there is only one God who is at the same time three Persons: Father,
              Son and Holy Spirit. All three are equal, yet remain one God.
            </li>
            <li>
              <strong>Secondly,</strong> we believe that Jesus Christ was and is the eternal Son of God; that, as God and
              man, he was born into this world to die for our sins; that he rose again after three days, ascended to
              heaven and will one day return to raise the dead and judge the world.
            </li>
            <li>
              <strong>Thirdly,</strong> we believe the Bible to be the perfect and true Word of God and relevant in every
              age. The message we teach is that, by God’s grace and power, through trusting in and submitting to Jesus as
              Lord, all our wrongdoing is forgiven and we receive the gift of new and everlasting life.
            </li>
          </ol>
          <p>
            As a Church, our beliefs are summarised in the Westminster Confession of Faith. Written in the 1640s, the
            Confession sets out what the Bible teaches in a clear summary, and the Shorter and Larger Catechisms put the
            same teaching into questions and answers, making it easier to learn.
          </p>
          <h3 className="useful-links-title">Useful Links:</h3>
          <p className="actions">
            <Link className="button button-outline" href="/our-vision/">Our Vision</Link>
            {beliefLinks.map((link) => (
              <a className="button button-outline" href={link.href} target="_blank" rel="noopener noreferrer" key={link.href}>
                {link.label}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ))}
          </p>
        </div>
      </section>
    </>
  );
}
