import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Find out about Smithton Church in Inverness – what we believe, our Quiet Room, children's ministry and support for those with additional needs.",
};

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
          <p>
            Many people wonder what church is like and what sort of people might go there. The simple answer is that
            all kinds of people of different ages and backgrounds attend church.
          </p>
          <p className="actions">
            <Link className="button" href="/our-vision/">Our Vision</Link>
            <Link className="button button-outline" href="/team/">Meet The Team</Link>
          </p>
        </div>
      </section>
    </>
  );
}
