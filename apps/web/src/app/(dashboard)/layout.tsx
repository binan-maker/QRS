/**
 * Dashboard layout — authenticated area.
 *
 * Server Component: validates the session cookie with firebase-admin.
 * If invalid/missing the middleware has already redirected to /login,
 * so by the time this renders we can trust the session.
 *
 * Renders the persistent sidebar + topbar shell.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/firebase-admin";
import { LOGIN_REDIRECT } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full server-side session validation (middleware only checks cookie presence)
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
      {/* TODO: <DashboardSidebar uid={decoded.uid} /> */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TODO: <DashboardTopbar uid={decoded.uid} /> */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
