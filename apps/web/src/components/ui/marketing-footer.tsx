import Link from "next/link";

const LINKS = {
  Product: [
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing",      label: "Pricing"      },
    { href: "/about",        label: "About"         },
  ],
  Legal: [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms",          label: "Terms of Service" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
                B
              </span>
              <span className="font-bold text-gray-900">BinRo</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 max-w-[200px]">
              India&apos;s trusted QR code security platform.
            </p>
            <p className="mt-3 text-xs text-gray-400">
              Supported by Kerala Startup Mission
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group}
              </h3>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} BinRo. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Made with ❤️ in Kerala, India
          </p>
        </div>
      </div>
    </footer>
  );
}
