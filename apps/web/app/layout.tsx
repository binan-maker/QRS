import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BinRo | Check this QR safely",
  description: "A public safety check for QR links shared through BinRo."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}