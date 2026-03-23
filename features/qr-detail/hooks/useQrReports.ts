import { useEffect, useState, useRef } from "react";
import { Alert } from "react-native";
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
        // Recalculate trust score immediately with new flags
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
    const prevReport = userReport;
    setUserReport(type);
    setReportCounts((prev) => {
      const next = { ...prev };
      if (prevReport && prevReport !== type) {
        next[prevReport] = Math.max(0, (next[prevReport] || 0) - 1);
      }
      if (prevReport !== type) {
        next[type] = (next[type] || 0) + 1;
      }
      return next;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await reportQrCode(id, userId, type, emailVerified);
      invalidateQrCache(id);
    } catch (e: any) {
      setUserReport(prevReport);
      setReportCounts((prev) => {
        const next = { ...prev };
        if (prevReport && prevReport !== type) {
          next[prevReport] = (next[prevReport] || 0) + 1;
        }
        if (prevReport !== type) {
          next[type] = Math.max(0, (next[type] || 0) - 1);
        }
        return next;
      });
      Alert.alert("Cannot Submit Report", e.message);
    }
  }

  return { reportCounts, trustScore, userReport, setUserReport, setTrustScore, reportLoading, handleReport };
}
