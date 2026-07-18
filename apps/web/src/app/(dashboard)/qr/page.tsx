import type { Metadata } from "next";

export const metadata: Metadata = { title: "My QR Codes" };

/** /qr — QR code management list */
export default function QrListPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My QR Codes</h1>
        {/* TODO: <CreateQrButton /> */}
      </div>
      {/* TODO: filters (status, type, date) */}
      {/* TODO: <QrCodeGrid /> */}
    </div>
  );
}
