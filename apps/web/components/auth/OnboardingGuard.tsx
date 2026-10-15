"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Routes that any user (or un-onboarded user) is allowed to access without interception
const EXEMPT_ROUTES = [
  "/onboarding/username",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
  "/privacy",
  "/terms",
  "/guide",
  "/trust-scores",
  "/founder",
  "/download",
];

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const isOnboarding = pathname === "/onboarding/username" || pathname.startsWith("/onboarding/");
  const isExempt = EXEMPT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  const hasUsername = Boolean(profile?.username && profile.username.trim() !== "");
  // An authenticated user needs onboarding if profile indicates onboarding is needed or username is empty
  const needsOnboarding = Boolean(user && (profile?.needsOnboarding || !hasUsername));

  useEffect(() => {
    if (loading) return;

    // Case 1: Authenticated user without a chosen username trying to access protected routes (e.g. /, /scanner, /profile)
    if (user && needsOnboarding && !isOnboarding && !isExempt) {
      router.replace("/onboarding/username");
      return;
    }

    // Case 2: User is on /onboarding/username but already has a confirmed username
    if (user && !needsOnboarding && isOnboarding) {
      router.replace("/");
      return;
    }

    // Case 3: Unauthenticated user on onboarding checkpoint
    if (!user && isOnboarding) {
      router.replace("/login");
      return;
    }
  }, [user, profile, loading, pathname, router, needsOnboarding, isOnboarding, isExempt]);

  // Back Button Safety lock on /onboarding/username
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (pathname === "/onboarding/username") {
      window.history.pushState(null, "", window.location.href);

      const handlePop = () => {
        window.history.pushState(null, "", window.location.href);
      };

      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [pathname]);

  // Block rendering protected children (e.g. Home page) while un-onboarded user is redirected
  if (user && needsOnboarding && !isOnboarding && !isExempt) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--background, #F5F8FF)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "3px solid rgba(0, 82, 204, 0.2)",
            borderTopColor: "var(--primary, #0052cc)",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  // Block rendering onboarding page if already onboarded user is being redirected to home
  if (user && !needsOnboarding && isOnboarding) {
    return null;
  }

  return <>{children}</>;
}
