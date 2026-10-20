import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://domainburnedchecker.com";
const TITLE = "Is My Domain Burned? — Free Cold Email Deliverability Checker";
const DESCRIPTION =
  "Check SPF, DKIM, DMARC and blacklist status of any domain in seconds. Get the exact DNS records to copy-paste and fix your email deliverability for free.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Domain Burned Checker",
  },
  description: DESCRIPTION,
  keywords: [
    "cold email",
    "deliverability",
    "SPF check",
    "DKIM check",
    "DMARC check",
    "email blacklist checker",
    "domain reputation",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Domain Burned Checker",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Domain Burned Checker",
  url: SITE_URL,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (web)",
  description: DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free domain deliverability check",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
