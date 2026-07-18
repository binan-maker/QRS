import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerApiClient } from "@/lib/api-client";

export const metadata: Metadata = { title: "Analytics — BinRo" };

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value ?? "";
  const api = createServerApiClient(session);

  const qrsResult = await api.unifiedQr.list({ limit: 20 });
  const qrs = qrsResult.ok ? qrsResult.data : [];

  const totalScans   = qrs.reduce((s: number, q: any) => s + (q.scanCount ?? 0), 0);
  const totalQrs     = qrs.length;
  const topQr        = qrs.sort((a: any, b: any) => (b.scanCount ?? 0) - (a.scanCount ?? 0))[0];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total QR Codes", value: totalQrs,   colour: "text-blue-600"    },
          { label: "Total Scans",    value: totalScans,  colour: "text-emerald-600" },
          { label: "Avg Scans / QR", value: totalQrs ? Math.round(totalScans / totalQrs) : 0, colour: "text-violet-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 text-center">
            <p className={`text-2xl font-bold ${s.colour}`}>{s.value.toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top QR */}
      {topQr && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Top performing QR code</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{topQr.title ?? topQr.destination}</p>
              <p className="text-sm text-gray-400 mt-0.5">{topQr.contentType}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-emerald-600">
                {(topQr.scanCount ?? 0).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-400">total scans</p>
            </div>
          </div>
        </div>
      )}

      {/* All QRs table */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All QR codes by scan count</h2>
        </div>
        {qrs.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400">No QR codes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-right">Scans</th>
                <th className="px-6 py-3 text-right">Downloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {qrs.map((qr: any) => (
                <tr key={qr.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                    {qr.title ?? qr.destination}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{qr.contentType}</td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">
                    {(qr.scanCount ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500">
                    {(qr.downloads ?? 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Per-scan time-series analytics coming in Phase 4.7
      </p>
    </div>
  );
}
