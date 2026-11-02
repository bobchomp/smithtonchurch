import type { Metadata } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { site } from "@/lib/content";
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
    images: ["/images/hero-aerial.jpg"],
  },
};

// Shared by the public website and the admin panel. Each has its own layout inside this one.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${openSans.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
