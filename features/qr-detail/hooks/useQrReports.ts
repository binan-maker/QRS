import { useEffect, useState, useRef } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { authAdapter } from "@/lib/auth";
import { subscribeToQrReports, getUserQrReport } from "@/lib/firestore-service";
import { calculateTrustScore } from "@/services/qr-detail-service";
import { invalidateQrCache } from "@/services/cache/qr-cache";
import { db } from "@/lib/db";

// Strip any port from EXPO_PUBLIC_DOMAIN — Replit proxies HTTPS on 443, not 5000
const SERVER_BASE_URL = (() => {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;
  if (raw) {
    const host = raw.split(":")[0];
    return host ? `https://${host}` : "";
  }
  return __DEV__ ? "http://localhost:5000" : "";
})();

async function submitReportViaApi(
  qrId: string,
  reportType: string,
  getToken: () => Promise<string>
): Promise<{ action: "created" | "updated" | "removed" }> {
  const token = await getToken();
  const res = await fetch(`${SERVER_BASE_URL}/api/v1/qr/${qrId}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reportType }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

const DEBOUNCE_MS = 600;

export function useQrReports(id: string, userId: string | null, offlineMode: boolean, isQrOwner: boolean = false) {
  const { user } = useAuth();

  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [trustScore, setTrustScore] = useState<any>(null);
  const [userReport, setUserReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState<string | null>(null);

  const [collusionFlags, setCollusionFlags] = useState<{
    suspicious: boolean;
    safeWeightMultiplier?: number;
    negativeWeightMultiplier?: number;
  }>({ suspicious: false });

  const latestCounts = useRef<Record<string, number>>({});
  const latestWeighted = useRef<Record<string, number>>({});
  const latestCollusion = useRef(collusionFlags);

  // Authoritative server-confirmed report
  const committedReportRef = useRef<string | null>(null);
  // The last desired state from the user (pending debounce)
  const pendingReportRef = useRef<string | null>(null);
  // True once initial fetch has resolved
  const userReportLoadedRef = useRef(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCommittingRef = useRef(false);

  useEffect(() => {
    latestCollusion.current = collusionFlags;
  }, [collusionFlags]);

  useEffect(() => {
    committedReportRef.current = null;
    pendingReportRef.current = null;
    userReportLoadedRef.current = false;
    setUserReport(null);

    if (!userId || offlineMode) {
      userReportLoadedRef.current = true;
      return;
    }
    getUserQrReport(id, userId)
      .then((report) => {
        committedReportRef.current = report;
        pendingReportRef.current = report;
        userReportLoadedRef.current = true;
        setUserReport(report);
      })
      .catch(() => {
        userReportLoadedRef.current = true;
      });
  }, [id, userId, offlineMode]);

  useEffect(() => {
    if (offlineMode) return;

    const unsubQr = db.onDoc(["qrCodes", id], (data) => {
      if (data) {
        const flags = {
          suspicious: data.suspiciousVoteFlag || false,
          safeWeightMultiplier: data.suspiciousSafeMultiplier,
          negativeWeightMultiplier: data.suspiciousNegMultiplier,
        };
        latestCollusion.current = flags;
        setCollusionFlags(flags);
        if (Object.keys(latestCounts.current).length > 0) {
          setTrustScore(calculateTrustScore(latestCounts.current, latestWeighted.current, flags));
        }
      }
    });

    const unsubReports = subscribeToQrReports(id, (counts, weightedCounts) => {
      latestCounts.current = counts;
      latestWeighted.current = weightedCounts;
      // Only apply Firestore snapshot to UI if there's no pending local action.
      // While the user has an optimistic update in-flight we must not overwrite
      // the local state — doing so causes duplicate/disappearing votes.
      const hasPendingAction =
        pendingReportRef.current !== committedReportRef.current || isCommittingRef.current;
      if (!hasPendingAction) {
        setReportCounts(counts);
        setTrustScore(calculateTrustScore(counts, weightedCounts, latestCollusion.current));
      }
    });

    return () => {
      unsubQr();
      unsubReports();
    };
  }, [id, offlineMode]);

  async function commitReport() {
    if (!userId) return;
    if (isCommittingRef.current) return;

    const desired = pendingReportRef.current;
    if (desired === committedReportRef.current) return;

    isCommittingRef.current = true;
    setReportLoading(desired);

    const prevCommitted = committedReportRef.current;

    // When desired is null (toggle-off), pass the previously committed type so
    // the server can match existingReport === reportType and mark it removed.
    const reportTypeToSend = desired ?? prevCommitted ?? "remove";

    try {
      if (!user) throw new Error("Not signed in");
      const firebaseUser = authAdapter.getCurrentUser();
      if (!firebaseUser) throw new Error("Not signed in");
      await submitReportViaApi(id, reportTypeToSend, () => firebaseUser.getIdToken());
      committedReportRef.current = desired;
      if (pendingReportRef.current !== desired) {
        // User tapped again while we were in flight — run again
        isCommittingRef.current = false;
        setReportLoading(null);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(commitReport, DEBOUNCE_MS);
        return;
      }
      // Commit settled. Leave optimistic counts in place — the Firestore
      // subscription will apply the authoritative snapshot on next tick
      // (hasPendingAction is now false so it won't be blocked).
      // Force-applying latestCounts.current here would briefly restore the
      // pre-removal snapshot and cause a visible flicker loop.
      invalidateQrCache(id);
    } catch (e: any) {
      console.error("[Report] Error submitting report:", e?.message, e);
      // Rollback to last confirmed server state
      committedReportRef.current = prevCommitted;
      pendingReportRef.current = prevCommitted;
      setUserReport(prevCommitted);
      // Use the latest Firestore snapshot as the ground truth (avoids stale count math)
      const fallbackCounts = Object.keys(latestCounts.current).length > 0
        ? latestCounts.current
        : (() => {
            const next = { ...latestCounts.current };
            if (desired && desired !== prevCommitted) {
              next[desired] = Math.max(0, (next[desired] || 0) - 1);
            }
            if (prevCommitted && prevCommitted !== desired) {
              next[prevCommitted] = (next[prevCommitted] || 0) + 1;
            }
            return next;
          })();
      setReportCounts(fallbackCounts);
      setTrustScore(calculateTrustScore(fallbackCounts, latestWeighted.current, latestCollusion.current));
    } finally {
      isCommittingRef.current = false;
      setReportLoading(null);
    }
  }

  function handleReport(type: string): boolean {
    if (!userId) { router.push("/(auth)/login"); return false; }
    if (isQrOwner) {
      Alert.alert("Not Allowed", "You cannot rate your own QR code.");
      return false;
    }
    if (!userReportLoadedRef.current) return false;

    // Determine next desired state
    const isToggleOff = pendingReportRef.current === type;
    const nextReport = isToggleOff ? null : type;
    const prevPending = pendingReportRef.current;

    pendingReportRef.current = nextReport;

    // Update UI immediately — no waiting
    setUserReport(nextReport);
    setReportCounts((prev) => {
      const next = { ...prev };
      if (isToggleOff) {
        next[type] = Math.max(0, (next[type] || 0) - 1);
      } else {
        if (prevPending) {
          next[prevPending] = Math.max(0, (next[prevPending] || 0) - 1);
        }
        next[type] = (next[type] || 0) + 1;
      }
      setTrustScore(calculateTrustScore(next, latestWeighted.current, latestCollusion.current));
      return next;
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Debounce the actual API call so rapid taps only fire once
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(commitReport, DEBOUNCE_MS);
    return true;
  }

  return { reportCounts, trustScore, userReport, setUserReport, setTrustScore, reportLoading, handleReport };
}
