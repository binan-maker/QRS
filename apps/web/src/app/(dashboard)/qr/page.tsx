import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerApiClient } from "@/lib/api-client";

export const metadata: Metadata = { title: "My QR Codes — BinRo" };

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:       { label: "Active",       className: "bg-emerald-50 text-emerald-700" },
  inactive:     { label: "Inactive",     className: "bg-gray-100 text-gray-500"      },
  limit_reached:{ label: "Limit reached",className: "bg-amber-50  text-amber-700"    },
  paused:       { label: "Paused",       className: "bg-yellow-50 text-yellow-700"   },
};

export default async function QrListPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value ?? "";
  const api = createServerApiClient(session);

  const result = await api.unifiedQr.list({ limit: 50 });
  const qrs: any[] = result.ok ? result.data : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">My QR Codes ({qrs.length})</h2>
        <Link
          href="/qr/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + New QR
        </Link>
      </div>

      {/* Empty state */}
      {qrs.length === 0 && (
        <div className="rounded-xl bg-white py-14 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-5xl mb-4">⬛</p>
          <p className="font-medium text-gray-900">No QR codes yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Create your first dynamic QR — update the destination any time.
          </p>
          <Link
            href="/qr/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Create QR
          </Link>
        </div>
      )}

      {/* Grid */}
      {qrs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {qrs.map((qr) => {
            const badge = STATUS_BADGE[qr.status ?? "active"] ?? STATUS_BADGE.active!;
            return (
              <Link
                key={qr.id}
                href={`/qr/${qr.id}`}
                className="group rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:ring-blue-200 hover:shadow-md transition-all"
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{qr.qrType}</span>
                </div>

                {/* Title / destination */}
                <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {qr.title ?? qr.destination}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{qr.contentType}</p>

                {/* Stats */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    <strong className="text-gray-900 font-semibold">
                      {(qr.scanCount ?? 0).toLocaleString("en-IN")}
                    </strong>{" "}
                    scans
                  </span>
                  {qr.scanLimit && (
                    <span>/ {qr.scanLimit.toLocaleString("en-IN")} limit</span>
                  )}
                  {qr.expiryDate && (
                    <span>Expires {new Date(qr.expiryDate).toLocaleDateString("en-IN")}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
