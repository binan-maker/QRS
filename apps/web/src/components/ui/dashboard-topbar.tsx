"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":     "Overview",
  "/qr":            "My QR Codes",
  "/analytics":     "Analytics",
  "/friends":       "Friends",
  "/notifications": "Notifications",
  "/profile":       "Profile",
  "/settings":      "Settings",
};

export function DashboardTopbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const title = Object.entries(PAGE_TITLES).find(([prefix]) =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  )?.[1] ?? "Dashboard";

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <Link
          href="/notifications"
          className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </Link>

        {/* Avatar */}
        <Link href="/profile" className="flex items-center gap-2">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName ?? "avatar"}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold">
              {user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="hidden sm:block text-sm text-gray-700 max-w-[140px] truncate">
            {user?.displayName ?? user?.email ?? ""}
          </span>
        </Link>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
