import type { Metadata } from "next";
import Image from "next/image";
import PageBanner from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "Our Vision",
  description: "The vision of Smithton Church, Inverness – knowing Jesus, making Jesus known.",
};

export default function OurVision() {
  return (
    <>
      <PageBanner title="Our Vision" />
      <section className="section">
        <div className="container narrow center">
          <Image
            className="vision-image"
            src="/images/vision.png"
            alt="Our vision: knowing Jesus, making Jesus known"
            width={500}
            height={500}
          />
        </div>
      </section>
    </>
  );
}
