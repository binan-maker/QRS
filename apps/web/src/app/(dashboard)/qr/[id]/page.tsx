import type { Metadata } from "next";

export const metadata: Metadata = { title: "QR Code Details" };

/** /qr/[id] — single QR detail + analytics + settings */
export default function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      {/* TODO: QR preview card */}
      {/* TODO: Analytics charts (uses QrAnalytics type from @/types/api) */}
      {/* TODO: Danger zone (delete, deactivate) */}
    </div>
  );
}
