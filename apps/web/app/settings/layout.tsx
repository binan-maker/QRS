import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — BinRo",
  description: "Account settings, preferences, and documentation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
