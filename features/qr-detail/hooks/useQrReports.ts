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

  // Refs to hold latest values for use inside subscription callbacks
  const latestCounts = useRef<Record<string, number>>({});
  const latestWeighted = useRef<Record<string, number>>({});
  const latestCollusion = useRef(collusionFlags);

  // Authoritative ref for the user's report — always in sync with Firestore.
  // Used in handleReport so a stale closure never reads the wrong value.
  const userReportRef = useRef<string | null>(null);
  // True once the initial getUserQrReport fetch has resolved.
  const userReportLoadedRef = useRef(false);

  useEffect(() => {
    latestCollusion.current = collusionFlags;
  }, [collusionFlags]);

  // Load the user's existing report from Firestore on mount so the
  // selected card is highlighted and toggle-off works correctly.
  useEffect(() => {
    userReportRef.current = null;
    userReportLoadedRef.current = false;
    setUserReport(null);

    if (!userId || offlineMode) {
      userReportLoadedRef.current = true;
      return;
    }
    getUserQrReport(id, userId)
      .then((report) => {
        userReportRef.current = report;
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

  async function handleReport(type: string) {
    if (!userId) { router.push("/(auth)/login"); return; }
    if (isQrOwner) {
      const { Alert } = await import("react-native");
      Alert.alert("Not Allowed", "You cannot rate your own QR code.");
      return;
    }
    // Prevent double-tap while a report is in flight
    if (reportLoading !== null) return;
    // Wait until we know the real server state before acting
    if (!userReportLoadedRef.current) return;

    // Always read from the authoritative ref so we never use stale state
    const prevReport = userReportRef.current;
    const isToggleOff = prevReport === type;

    // Optimistic update — update both state and ref together
    const nextReport = isToggleOff ? null : type;
    userReportRef.current = nextReport;
    setReportLoading(type);
    setUserReport(nextReport);
    setReportCounts((prev) => {
      const next = { ...prev };
      if (isToggleOff) {
        next[type] = Math.max(0, (next[type] || 0) - 1);
      } else {
        if (prevReport) {
          next[prevReport] = Math.max(0, (next[prevReport] || 0) - 1);
        }
        next[type] = (next[type] || 0) + 1;
      }
      setTrustScore(calculateTrustScore(next, latestWeighted.current, latestCollusion.current));
      return next;
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await reportQrCode(id, userId, type, emailVerified);
      // Confirm the ref matches what we optimistically set
      userReportRef.current = nextReport;
      invalidateQrCache(id);
    } catch (e: any) {
      console.error("[Report] Error submitting report:", e?.message, e);
      // Rollback optimistic update
      userReportRef.current = prevReport;
      setUserReport(prevReport);
      setReportCounts((prev) => {
        const next = { ...prev };
        if (isToggleOff) {
          next[type] = (next[type] || 0) + 1;
        } else {
          next[type] = Math.max(0, (next[type] || 0) - 1);
          if (prevReport) {
            next[prevReport] = (next[prevReport] || 0) + 1;
          }
        }
        return next;
      });
    } finally {
      setReportLoading(null);
    }
  }

  return { reportCounts, trustScore, userReport, setUserReport, setTrustScore, reportLoading, handleReport };
}
