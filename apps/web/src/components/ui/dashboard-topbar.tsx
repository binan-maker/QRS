"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":     "Overview",
  "/qr":            "My QR Codes",
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
