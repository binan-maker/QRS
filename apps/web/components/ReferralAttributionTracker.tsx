"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { savePendingReferralCode } from "@services/rewards";

function AttributionHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const refCode =
      searchParams.get("ref") ||
      searchParams.get("r") ||
      searchParams.get("referrer") ||
      searchParams.get("invite");

    if (refCode) {
      const clean = refCode.trim().replace(/^@/, "").toLowerCase();
      if (clean) {
        savePendingReferralCode(clean).catch(() => {});
        try {
          if (typeof document !== "undefined") {
            // 30-day attribution cookie (Zerodha/Upstox standard)
            document.cookie = `binro_ref=${encodeURIComponent(clean)}; path=/; max-age=2592000; SameSite=Lax`;
          }
        } catch {}
      }
    }
  }, [searchParams]);

  return null;
}

export function ReferralAttributionTracker() {
  return (
    <Suspense fallback={null}>
      <AttributionHandler />
    </Suspense>
  );
}
