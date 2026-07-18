import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerApiClient } from "@/lib/api-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value ?? "";
  const api = createServerApiClient(session);

  const result = await api.unifiedQr.getById(id);
  if (!result.ok) return { title: "QR Code — BinRo" };
  const title = result.data.title ?? result.data.destination;
  return { title: `${title} — BinRo Dashboard` };
}

export default async function QrDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value ?? "";
  const api = createServerApiClient(session);

  const [qrResult, analyticsResult] = await Promise.all([
    api.unifiedQr.getById(id),
    api.unifiedQr.getAnalytics(id),
  ]);

  if (!qrResult.ok) notFound();
  const qr = qrResult.data as any;
  const analytics = analyticsResult.ok ? (analyticsResult.data as any) : null;

  const isExpired = qr.expiryDate && new Date(qr.expiryDate).getTime() < Date.now();
  const isLimitHit = qr.scanLimit !== null && qr.scanCount >= qr.scanLimit;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/qr" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
        ← My QR Codes
      </Link>

      {/* Info card */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg truncate">
              {qr.title ?? qr.destination}
            </h2>
            <p className="text-sm text-gray-400 mt-1 truncate">{qr.destination}</p>
          </div>
          <span className={`ml-4 flex-shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            qr.status === "active" && !isExpired && !isLimitHit
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {isExpired ? "Expired" : isLimitHit ? "Limit reached" : qr.status}
          </span>
        </div>

        {/* Details grid */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400">Type</dt>
            <dd className="font-medium text-gray-900 capitalize">{qr.qrType}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Content</dt>
            <dd className="font-medium text-gray-900 capitalize">{qr.contentType}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Total scans</dt>
            <dd className="font-bold text-gray-900">{(qr.scanCount ?? 0).toLocaleString("en-IN")}</dd>
          </div>
          {qr.scanLimit && (
            <div>
              <dt className="text-xs text-gray-400">Scan limit</dt>
              <dd className="font-medium text-gray-900">{qr.scanLimit.toLocaleString("en-IN")}</dd>
            </div>
          )}
          {qr.expiryDate && (
            <div>
              <dt className="text-xs text-gray-400">Expires</dt>
              <dd className={`font-medium ${isExpired ? "text-red-600" : "text-gray-900"}`}>
                {new Date(qr.expiryDate).toLocaleDateString("en-IN")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-400">Trust link</dt>
            <dd>
              <a
                href={`/q/${qr.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                binro.in/q/{qr.id}
              </a>
            </dd>
          </div>
        </dl>

        {/* Actions */}
        <div className="mt-5 flex gap-3 flex-wrap">
          <Link
            href={`/qr/${qr.id}/edit`}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
          <a
            href={`/api/v1/unified-qr/${qr.id}/qr.png`}
            download
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Download QR
          </a>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Scan analytics</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total scans",   value: analytics.totalScans   ?? 0, colour: "text-blue-600"    },
              { label: "Unique IPs",    value: analytics.uniqueIps    ?? 0, colour: "text-violet-600"  },
              { label: "Avg / day",     value: analytics.avgPerDay    ?? 0, colour: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.colour}`}>
                  {Number(s.value).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-red-50 p-6">
        <h3 className="font-semibold text-red-700 mb-2">Danger zone</h3>
        <p className="text-sm text-red-600 mb-4">
          Deleting this QR code will deactivate its public trust page. This action cannot be undone.
        </p>
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">
          Delete QR code
        </button>
      </div>
    </div>
  );
}
