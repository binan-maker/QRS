"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href:  string;
  label: string;
  icon:  string;
}

const NAV: NavItem[] = [
  { href: "/dashboard",       label: "Overview",       icon: "🏠" },
  { href: "/qr",              label: "My QR Codes",    icon: "⬛" },
  { href: "/analytics",       label: "Analytics",      icon: "📊" },
  { href: "/friends",         label: "Friends",        icon: "👥" },
  { href: "/notifications",   label: "Notifications",  icon: "🔔" },
  { href: "/profile",         label: "Profile",        icon: "👤" },
  { href: "/settings",        label: "Settings",       icon: "⚙️" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-gray-100 bg-white h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs select-none">
          B
        </span>
        <span className="font-bold text-gray-900">BinRo</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to home
        </Link>
      </div>
    </aside>
  );
}
