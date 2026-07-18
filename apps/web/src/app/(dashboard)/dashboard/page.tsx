import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

/** /dashboard — overview / home for authenticated users */
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      {/* TODO: Stats cards (total QRs, total scans, flagged reports) */}
      {/* TODO: Recent QR codes */}
      {/* TODO: Recent scan activity */}
    </div>
  );
}
