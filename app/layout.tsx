import type { Metadata } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { site } from "@/lib/content";
import { HIDE_FROM_SEARCH_ENGINES } from "@/lib/domains";
import "./globals.css";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.title}, Inverness`,
    template: `%s | ${site.title}`,
  },
  description: site.description,
  icons: { icon: "/images/favicon.png" },
  robots: HIDE_FROM_SEARCH_ENGINES ? { index: false, follow: false } : undefined,
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
    <html lang="en-GB" className={`${openSans.variable} ${poppins.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
