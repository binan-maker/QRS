import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerApiClient } from "@/lib/api-client";

export const metadata: Metadata = { title: "Dashboard — BinRo" };

const STAT_CARDS = [
  { label: "Total QR Codes",  key: "qrCount",   icon: "⬛", colour: "text-blue-600"   },
  { label: "Total Scans",     key: "scanCount",  icon: "📊", colour: "text-emerald-600"},
  { label: "Active Reports",  key: "reports",    icon: "🚨", colour: "text-red-500"    },
  { label: "Followers",       key: "followers",  icon: "👥", colour: "text-violet-600" },
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value ?? "";
  const api = createServerApiClient(session);

  // Fetch own profile for stats
  const profileResult = await api.user.getMe();
  const profile = profileResult.ok ? profileResult.data : null;

  // Fetch recent QRs
  const qrsResult = await api.unifiedQr.list({ limit: 6 });
  const qrs = qrsResult.ok ? qrsResult.data : [];

  const stats = {
    qrCount:   profile?.scanCount ?? 0,   // placeholder — real count from QR list
    scanCount:  profile?.scanCount ?? 0,
    reports:    0,
    followers:  profile?.followingCount ?? 0,
  };

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{card.label}</p>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${card.colour}`}>
              {(stats[card.key as keyof typeof stats] ?? 0).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      {/* Recent QR codes */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Recent QR Codes</h2>
          <Link href="/qr" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>

        {qrs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">⬛</p>
            <p className="text-sm font-medium text-gray-900">No QR codes yet</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">Create your first dynamic QR code</p>
            <Link
              href="/qr/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Create QR
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {qrs.map((qr: any) => (
              <Link
                key={qr.id}
                href={`/qr/${qr.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {qr.title ?? qr.destination}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{qr.contentType}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-semibold text-gray-900">{(qr.scanCount ?? 0).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">scans</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: "/qr/create",    label: "New QR",      icon: "+" },
          { href: "/analytics",    label: "Analytics",   icon: "📊" },
          { href: "/profile",      label: "Edit Profile",icon: "👤" },
          { href: "/settings",     label: "Settings",    icon: "⚙️" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 text-center hover:border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">{a.icon}</span>
            <span className="text-xs font-medium text-gray-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
