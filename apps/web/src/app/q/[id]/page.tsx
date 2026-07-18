import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/api-client";

/**
 * /q/[id] — Public QR trust page.
 *
 * Shown when someone scans a BinRo QR code or lands on a shareable link.
 * Renders the trust score, report count, and owner info.
 * No authentication required.
 *
 * Rendering: SSR with revalidate (data may change as reports come in).
 */

export const revalidate = 60; // ISR: revalidate every 60 s

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // TODO: fetch QR title for dynamic OG tags
  return {
    title: `QR Code ${id} — BinRo`,
    description: "Check the trust score and safety of this QR code.",
  };
}

export default async function QrPublicPage({ params }: Props) {
  const { id } = await params;

  // Unauthenticated server fetch — public QR data
  const api = createServerApiClient();
  const result = await api.unifiedQr.getById(id);

  if (!result.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-5xl">🔍</p>
        <h1 className="text-xl font-semibold text-gray-900">QR code not found</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          This QR code may have been deleted or the link is incorrect.
        </p>
      </main>
    );
  }

  const qr = result.data;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg space-y-4">
        {/* TODO: Trust badge (safe / flagged / caution) */}
        {/* TODO: QR owner info card */}
        {/* TODO: Scan stats */}
        {/* TODO: Report button */}
        {/* TODO: Comments list */}
      </div>
    </main>
  );
}
