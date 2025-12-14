import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OpenMeet - Enterprise Meeting Intelligence | Self-Hosted",
    template: "%s | OpenMeet"
  },
  description: "The only AI meeting platform with self-hosted deployment. Transcribe, analyze, and coach with complete data sovereignty. Built for healthcare, legal, finance, and security-conscious enterprises. HIPAA, SOC2, GDPR compliant.",
  keywords: [
    "meeting intelligence",
    "self-hosted meeting transcription",
    "enterprise meeting assistant",
    "HIPAA compliant meeting recording",
    "SOC2 meeting platform",
    "revenue intelligence",
    "conversation intelligence",
    "AI meeting notes",
    "on-premise meeting transcription",
    "private cloud meeting AI"
  ],
  authors: [{ name: "OpenMeet" }],
  creator: "OpenMeet",
  publisher: "OpenMeet, Inc.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://openmeet.com",
    siteName: "OpenMeet",
    title: "OpenMeet - Enterprise Meeting Intelligence | Self-Hosted",
    description: "The only AI meeting platform with self-hosted deployment. Complete data sovereignty for healthcare, legal, finance, and government.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenMeet - Enterprise Meeting Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenMeet - Enterprise Meeting Intelligence | Self-Hosted",
    description: "The only AI meeting platform with self-hosted deployment. Complete data sovereignty.",
    images: ["/og-image.png"],
    creator: "@nebulaai",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://openmeet.com",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "OpenMeet",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web, Docker, Kubernetes",
              "description": "Enterprise meeting intelligence platform with self-hosted deployment option",
              "offers": {
                "@type": "Offer",
                "price": "12",
                "priceCurrency": "USD",
                "priceValidUntil": "2026-12-31"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "150"
              },
              "featureList": [
                "Self-Hosted Deployment",
                "Multi-Provider AI",
                "HIPAA Compliance",
                "SOC2 Compliance",
                "Revenue Intelligence",
                "White-Label Solution"
              ]
            })
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
