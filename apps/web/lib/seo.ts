import type { Metadata } from "next";
import { BINRO_SITE_URL } from "./qr-share";

export const SITE_URL = BINRO_SITE_URL;
export const SITE_NAME = "BinRo";
export const DEFAULT_TITLE =
  "BinRo — Safe QR Code Scanner, Link Checker & Community Trust Scores";
export const DEFAULT_DESCRIPTION =
  "Scan any QR code safely with BinRo. Preview hidden links before opening, check real-time community trust scores, and protect yourself from QR code scams and phishing.";

export const SEO_KEYWORDS = [
  "BinRo",
  "binro.in",
  "QR code scanner",
  "safe QR scanner",
  "QR link checker",
  "check QR code safety",
  "QR code scam detector",
  "QR phishing protection",
  "quishing protection",
  "QR trust score",
  "online QR code reader",
  "verify QR code before opening",
  "UPI payment QR verification",
];

/**
 * Helper to generate consistent per-page Next.js Metadata
 * for Sitelinks and Rich Search Snippets.
 */
export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const canonicalUrl = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: canonicalUrl,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };
}

/**
 * Generates Schema.org JSON-LD (@graph) for Google Search:
 * - Organization (with official 512x512 & 192x192 Logo so Google shows logo next to URL)
 * - WebSite (so Google shows "BinRo" as the official Site Name at the top of search results)
 * - SoftwareApplication / WebApplication (rich app details)
 * - SiteNavigationElement (explicit Sitelink signals for top sub-pages like YouTube/major brands)
 */
export function buildRootStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: ["BinRo QR Safety", "BinRo App", "binro.in", "www.binro.in"],
        url: SITE_URL,
        sameAs: ["https://binro.in", "https://www.binro.in"],
        description: DEFAULT_DESCRIPTION,
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: `${SITE_URL}/web-app-manifest-512x512.png`,
          contentUrl: `${SITE_URL}/web-app-manifest-512x512.png`,
          width: 512,
          height: 512,
          caption: "BinRo Official Logo",
        },
        image: [
          `${SITE_URL}/web-app-manifest-512x512.png`,
          `${SITE_URL}/web-app-manifest-192x192.png`,
          `${SITE_URL}/favicon-96x96.png`,
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: ["BinRo — Safe QR Code Scanner", "binro.in"],
        description: DEFAULT_DESCRIPTION,
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        inLanguage: "en-US",
      },
      {
        "@type": ["WebApplication", "SoftwareApplication"],
        "@id": `${SITE_URL}/#application`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web, Android, iOS",
        description: DEFAULT_DESCRIPTION,
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Instant QR code link preview before opening",
          "Real-time community trust scores and scam reports",
          "Malicious link and quishing detection",
          "Payment QR verification and owner identity signals",
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#navigation`,
        name: "BinRo Main Navigation",
        itemListElement: [
          {
            "@type": "SiteNavigationElement",
            position: 1,
            name: "QR Code Scanner",
            description:
              "Scan any QR code using your camera or upload an image to inspect the destination link safely before opening.",
            url: `${SITE_URL}/scanner`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 2,
            name: "Download BinRo App",
            description:
              "Download the official BinRo mobile app for Android and iOS for instant QR protection everywhere.",
            url: `${SITE_URL}/download`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 3,
            name: "Trust Scores & Safety Signals",
            description:
              "Learn how BinRo calculates real-time community trust scores and detects dangerous QR codes.",
            url: `${SITE_URL}/trust-scores`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 4,
            name: "Safety Guide & Manual",
            description:
              "Step-by-step guide on how to spot fake QR stickers, quishing attacks, and inspect QR links with BinRo.",
            url: `${SITE_URL}/guide`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 5,
            name: "Sign In",
            description:
              "Sign in to your BinRo account to sync scan history, vote on QR trust scores, and post community warnings.",
            url: `${SITE_URL}/login`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 6,
            name: "Create Account",
            description:
              "Join the BinRo community for free to help report scam QR codes and protect others.",
            url: `${SITE_URL}/register`,
          },
        ],
      },
    ],
  };
}
