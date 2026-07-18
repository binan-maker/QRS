/**
 * Marketing layout — wraps public-facing pages (landing, pricing, about, etc.)
 * No authentication required.
 * Renders shared header and footer when those components exist.
 */

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* TODO: <MarketingHeader /> */}
      <main className="flex-1">{children}</main>
      {/* TODO: <MarketingFooter /> */}
    </div>
  );
}
