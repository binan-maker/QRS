import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AvatarProvider } from "@/lib/avatar-context";
import { ThemeProvider } from "@/lib/theme-context";
import { DesktopNavbar } from "@/components/navigation/DesktopNavbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BinRo",
  description: "A calm, public safety check for QR links shared through BinRo.",
  openGraph: {
    title: "BinRo",
    description: "A calm, public safety check for QR links shared through BinRo.",
    type: "website",
  },
};

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
      data-scroll-behavior="smooth"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className={inter.className} suppressHydrationWarning>
        <script
          id="binro-theme-init"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <AuthProvider>
          <AvatarProvider>
            <ThemeProvider>
              <DesktopNavbar />
              {children}
            </ThemeProvider>
          </AvatarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
