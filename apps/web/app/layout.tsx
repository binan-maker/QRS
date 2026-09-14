import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BinRo — Know before you open",
  description: "A calm, public safety check for QR links shared through BinRo.",
  openGraph: {
    title: "BinRo — Know before you open",
    description: "See where a QR code leads before you open it.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}