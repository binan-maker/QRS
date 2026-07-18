import { MarketingHeader } from "@/components/ui/marketing-header";
import { MarketingFooter } from "@/components/ui/marketing-footer";

/**
 * Marketing layout — wraps all public-facing pages.
 * No authentication required.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
