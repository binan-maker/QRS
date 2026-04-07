import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToQrReports,
  reportQrCode,
  calculateTrustScore,
  getUserQrReport,
} from "@/lib/firestore-service";
import { invalidateQrCache } from "@/lib/cache/qr-cache";
import { db } from "@/lib/db";

const DEBOUNCE_MS = 600;

export function useQrReports(id: string, userId: string | null, offlineMode: boolean, isQrOwner: boolean = false) {
  const { user } = useAuth();
  const emailVerified = user?.emailVerified ?? false;

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
      setReportCounts(counts);
      setTrustScore(calculateTrustScore(counts, weightedCounts, latestCollusion.current));
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

    try {
      await reportQrCode(id, userId, desired ?? "remove", emailVerified);
      committedReportRef.current = desired;
      if (pendingReportRef.current !== desired) {
        // User tapped again while we were in flight — run again
        isCommittingRef.current = false;
        setReportLoading(null);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(commitReport, DEBOUNCE_MS);
        return;
      }
      invalidateQrCache(id);
    } catch (e: any) {
      console.error("[Report] Error submitting report:", e?.message, e);
      // Rollback: restore counts and UI to committed state
      committedReportRef.current = prevCommitted;
      pendingReportRef.current = prevCommitted;
      setUserReport(prevCommitted);
      setReportCounts((prev) => {
        const next = { ...prev };
        // Undo the optimistic add of desired
        if (desired && desired !== prevCommitted) {
          next[desired] = Math.max(0, (next[desired] || 0) - 1);
        }
        // Undo the optimistic remove of prevCommitted
        if (prevCommitted && prevCommitted !== desired) {
          next[prevCommitted] = (next[prevCommitted] || 0) + 1;
        }
        // Toggle-off rollback
        if (desired === null && prevCommitted) {
          next[prevCommitted] = (next[prevCommitted] || 0) + 1;
        }
        setTrustScore(calculateTrustScore(next, latestWeighted.current, latestCollusion.current));
        return next;
      });
    } finally {
      isCommittingRef.current = false;
      setReportLoading(null);
    }
  }

  function handleReport(type: string) {
    if (!userId) { router.push("/(auth)/login"); return; }
    if (isQrOwner) {
      import("react-native").then(({ Alert }) => {
        Alert.alert("Not Allowed", "You cannot rate your own QR code.");
      });
      return;
    }
    if (!userReportLoadedRef.current) return;

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
  }

  return { reportCounts, trustScore, userReport, setUserReport, setTrustScore, reportLoading, handleReport };
}
