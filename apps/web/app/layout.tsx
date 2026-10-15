import type { Metadata, Viewport } from "next";
import { AuthProvider, AvatarProvider, ThemeProvider } from "@/contexts";
import { DesktopNavbar } from "@/components/navigation/DesktopNavbar";
import { ReferralAttributionTracker } from "@/components/referral/ReferralAttributionTracker";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  SEO_KEYWORDS,
  FOUNDER_X_HANDLE,
  buildRootStructuredData,
} from "@/lib/seo";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0052CC",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Security",
  verification: {
    google: "nLYBPcv7892YCD9CW459f_VeJ9J7aeeceBf6XOCMAmo",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    site: FOUNDER_X_HANDLE,
    creator: FOUNDER_X_HANDLE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const structuredDataJson = JSON.stringify(buildRootStructuredData());

const themeScript = `(function() {
  try {
    var mode = localStorage.getItem('binro_theme_mode') || localStorage.getItem('qrguard_theme_mode') || 'system';
    var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme-mode', mode);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <script
          id="binro-schema-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson }}
        />
        <script
          id="binro-theme-init"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <AuthProvider>
          <AvatarProvider>
            <ThemeProvider>
              <DesktopNavbar />
              <ReferralAttributionTracker />
              {children}
            </ThemeProvider>
          </AvatarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
