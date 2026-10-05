import type { Metadata } from "next";
import { BINRO_SITE_URL } from "./qr-share";

export const SITE_URL = BINRO_SITE_URL;
export const SITE_NAME = "BinRo";
export const DEFAULT_TITLE =
  "BinRo — Safe QR Code Scanner, Link Checker & Community Trust Scores";
export const DEFAULT_DESCRIPTION =
  "Scan any QR code safely with BinRo — the Truecaller for QR codes. Preview hidden links before opening, check real-time community trust scores, and protect yourself from QR code scams and phishing.";

export const FOUNDER_NAME = "Ahmed Sameer Binan";
export const FOUNDER_X_HANDLE = "@IAmBinan";
export const FOUNDER_PROFILES = [
  "https://www.linkedin.com/in/ahmed-sameer-binan/",
  "https://www.instagram.com/iam_binan/",
  "https://x.com/IAmBinan",
  "https://twitter.com/IAmBinan",
  "https://www.threads.com/@iam_binan",
  "https://www.threads.net/@iam_binan",
  "https://about.me/ahmedsameerbinan",
  "https://github.com/binan-maker",
  "https://www.reddit.com/user/IAmBinan/",
];

export const SEO_KEYWORDS = [
  "BinRo",
  "What is BinRo",
  "binro.in",
  "BinRo app",
  "BinRo QR scanner",
  "Know Before You Scan",
  "Pehle BinRo Phir Scan",
  "Truecaller for QR codes",
  "Ahmed Sameer Binan",
  "Binan",
  "iam_binan",
  "Ahmed Sameer Binan age",
  "Ahmed Sameer Binan Kasaragod",
  "Ahmed Sameer Binan Kerala",
  "Ahmed Sameer Binan BinRo",
  "BinRo founder",
  "Who founded BinRo",
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
      site: FOUNDER_X_HANDLE,
      creator: FOUNDER_X_HANDLE,
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
 * Rich Schema.org Person entity for Ahmed Sameer Binan (Founder of BinRo).
 * Powers Google Knowledge Graph Panel & Person search results.
 */
export function buildFounderPersonEntity() {
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/#founder`,
    name: FOUNDER_NAME,
    alternateName: ["Binan", "iam_binan", "IAmBinan", "Ahmed Sameer"],
    givenName: "Ahmed Sameer",
    familyName: "Binan",
    gender: "Male",
    birthDate: "2005",
    jobTitle: "Founder & Creator of BinRo",
    description:
      "Ahmed Sameer Binan (born 2005, age 20) is an Indian tech entrepreneur, mobile engineer, and cybersecurity builder from Kasaragod, Kerala, India. He is the founder of BinRo, a QR code safety and trust intelligence platform often described as the 'Truecaller for QR codes' with the mission 'Know Before You Scan' ('Pehle BinRo. Phir Scan').",
    url: `${SITE_URL}/founder`,
    mainEntityOfPage: `${SITE_URL}/founder`,
    image: `${SITE_URL}/web-app-manifest-512x512.png`,
    nationality: {
      "@type": "Country",
      name: "India",
    },
    homeLocation: {
      "@type": "Place",
      name: "Kasaragod, Kerala, India",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kasaragod",
        addressRegion: "Kerala",
        addressCountry: "IN",
      },
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kasaragod",
      addressRegion: "Kerala",
      addressCountry: "India",
    },
    worksFor: {
      "@id": `${SITE_URL}/#organization`,
    },
    founderOf: {
      "@id": `${SITE_URL}/#organization`,
    },
    knowsAbout: [
      "QR Code Security",
      "Cybersecurity",
      "Quishing Prevention",
      "Mobile Application Development",
      "React Native",
      "Next.js",
      "Cryptography",
      "ECDSA Digital Signatures",
      "Offline-First Architecture",
      "Artificial Intelligence",
      "Robotics",
      "Startup Entrepreneurship",
    ],
    sameAs: [
      `${SITE_URL}/founder`,
      ...FOUNDER_PROFILES,
    ],
  };
}

/**
 * Generates Schema.org JSON-LD (@graph) for Google Search:
 * - Organization (with official 512x512 & 192x192 Logo so Google shows logo next to URL)
 * - Person (Ahmed Sameer Binan — Founder Knowledge Graph entity)
 * - WebSite (so Google shows "BinRo" as the official Site Name at the top of search results)
 * - SoftwareApplication / WebApplication (rich app details)
 * - SiteNavigationElement (explicit Sitelink signals for top sub-pages like YouTube/major brands)
 * - FAQPage (answers "What is BinRo?" and "Who is Ahmed Sameer Binan?" for Google Featured Snippets)
 */
export function buildRootStructuredData() {
  const founderEntity = buildFounderPersonEntity();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: [
          "BinRo QR Safety",
          "BinRo App",
          "BinRo QR",
          "binro.in",
          "www.binro.in",
        ],
        slogan: "Know Before You Scan — Pehle BinRo. Phir Scan.",
        url: SITE_URL,
        sameAs: [
          "https://binro.in",
          "https://www.binro.in",
          ...FOUNDER_PROFILES,
        ],
        description: DEFAULT_DESCRIPTION,
        foundingDate: "2025",
        foundingLocation: {
          "@type": "Place",
          name: "Kasaragod, Kerala, India",
        },
        founder: {
          "@id": `${SITE_URL}/#founder`,
        },
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
      founderEntity,
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
        creator: {
          "@id": `${SITE_URL}/#founder`,
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
        author: {
          "@id": `${SITE_URL}/#founder`,
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
              "Step-by-step guide on What is BinRo, how to spot fake QR stickers, and how to inspect QR links safely.",
            url: `${SITE_URL}/guide`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 5,
            name: "Founder — Ahmed Sameer Binan",
            description:
              "Meet Ahmed Sameer Binan, the 20-year-old founder of BinRo from Kasaragod, Kerala, India.",
            url: `${SITE_URL}/founder`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 6,
            name: "Sign In",
            description:
              "Sign in to your BinRo account to sync scan history, vote on QR trust scores, and post community warnings.",
            url: `${SITE_URL}/login`,
          },
          {
            "@type": "SiteNavigationElement",
            position: 7,
            name: "Create Account",
            description:
              "Join the BinRo community for free to help report scam QR codes and protect others.",
            url: `${SITE_URL}/register`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is BinRo?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BinRo is a free QR code safety scanner, link checker, and community trust platform for Web, Android, and iOS — built as the 'Truecaller for QR codes' with the mission 'Know Before You Scan' ('Pehle BinRo. Phir Scan'). Instead of opening unknown links blindly, BinRo previews what is inside any QR code, verifies payment recipient details, and shows real-time community trust scores and scam warnings before you open it.",
            },
          },
          {
            "@type": "Question",
            name: "Who is Ahmed Sameer Binan?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ahmed Sameer Binan (also known as Binan / @iam_binan) is a 20-year-old tech entrepreneur, mobile developer, and AI & Robotics student from Kasaragod, Kerala, India. He is the founder and creator of BinRo (binro.in) and Status Saver.",
            },
          },
          {
            "@type": "Question",
            name: "How old is Ahmed Sameer Binan and where is he from?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ahmed Sameer Binan is 20 years old (born 2005) and is from Kasaragod, Kerala, India.",
            },
          },
          {
            "@type": "Question",
            name: "How does BinRo protect you from QR code scams?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "When you scan a QR code or upload a QR image on BinRo, it holds the link in a safe inspection view. BinRo checks the destination URL against security heuristics, displays a 0–100 Trust Score, and shows community votes and comments so you can spot fake QR stickers and phishing links immediately.",
            },
          },
          {
            "@type": "Question",
            name: "Is BinRo free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, BinRo is completely free to use on the web at binro.in and on Android and iOS mobile devices.",
            },
          },
        ],
      },
    ],
  };
}

/**
 * Dedicated ProfilePage Schema.org JSON-LD for /founder (https://binro.in/founder)
 * Follows Google's ProfilePage + Person structured data specification.
 */
export function buildFounderPageStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${SITE_URL}/founder#profilepage`,
    url: `${SITE_URL}/founder`,
    name: "Ahmed Sameer Binan — Founder of BinRo",
    description:
      "Official founder profile of Ahmed Sameer Binan (20 years old, from Kasaragod, Kerala, India), Founder & Creator of BinRo — the Truecaller for QR codes.",
    mainEntity: buildFounderPersonEntity(),
  };
}
