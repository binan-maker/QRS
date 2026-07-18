import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/firebase-admin";
import { LOGIN_REDIRECT } from "@/lib/auth";
import { DashboardSidebar } from "@/components/ui/dashboard-sidebar";
import { DashboardTopbar } from "@/components/ui/dashboard-topbar";

/**
 * Dashboard layout — authenticated area.
 *
 * Server Component: validates the session cookie with firebase-admin.
 * If invalid/missing the middleware has already redirected to /auth/login,
 * so by the time this renders we can trust the session.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    redirect(LOGIN_REDIRECT);
  }

  const decoded = await verifySessionCookie(sessionCookie);
  if (!decoded) {
    redirect(LOGIN_REDIRECT);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
