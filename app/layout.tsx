import type { Metadata } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { navigation, site } from "@/lib/content";
import "./globals.css";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.title} Inverness – Sunday Services, Live Services, Community`,
    template: `%s | ${site.title} Inverness`,
  },
  description: site.description,
  icons: { icon: "/images/favicon.png" },
  openGraph: {
    siteName: site.title,
    type: "website",
    locale: "en_GB",
    images: ["/images/hero.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${openSans.variable} ${poppins.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Header navigation={navigation} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
