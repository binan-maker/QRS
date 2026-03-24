import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToQrReports,
  reportQrCode,
  calculateTrustScore,
} from "@/lib/firestore-service";
import { invalidateQrCache } from "@/lib/cache/qr-cache";
import { db } from "@/lib/db";

export function useQrReports(id: string, userId: string | null, offlineMode: boolean) {
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

  useEffect(() => {
    latestCollusion.current = collusionFlags;
  }, [collusionFlags]);

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
    // Prevent double-tap while a report is in flight
    if (reportLoading !== null) return;

    const prevReport = userReport;
    const isToggleOff = prevReport === type;

    // Optimistic update
    setReportLoading(type);
    setUserReport(isToggleOff ? null : type);
    setReportCounts((prev) => {
      const next = { ...prev };
      if (isToggleOff) {
        // User is un-reporting — remove their vote
        next[type] = Math.max(0, (next[type] || 0) - 1);
      } else {
        // Remove old vote if switching types
        if (prevReport) {
          next[prevReport] = Math.max(0, (next[prevReport] || 0) - 1);
        }
        // Add new vote
        next[type] = (next[type] || 0) + 1;
      }
      return next;
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await reportQrCode(id, userId, type, emailVerified);
      invalidateQrCache(id);
    } catch (e: any) {
      console.error("[Report] Error submitting report:", e?.message, e);
      // Rollback optimistic update silently
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
