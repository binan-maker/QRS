"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/contexts";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopTopBar } from "./DesktopTopBar";
import styles from "./DesktopShell.module.css";

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/onboarding",
];

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Standalone auth pages don't show the dashboard sidebar/topbar
  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className={styles.desktopContainer}>
        <DesktopSidebar />
        <div className={styles.mainColumn}>
          <DesktopTopBar />
          <div className={styles.mainContent}>{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}
