/**
 * Auth layout — login, signup, forgot-password.
 * Centred single-column card layout; no nav chrome.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* TODO: BinRo logo */}
        {children}
      </div>
    </div>
  );
}
