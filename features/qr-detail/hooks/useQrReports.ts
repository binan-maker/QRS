import { useState, useEffect, useRef, useCallback } from "react";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import {
  subscribeToQrReports,
  getUserQrReport,
  reportQrCode,
} from "@/services/report-service";
import { calculateTrustScore } from "@/services/trust-service";
import { invalidateQrCache } from "@/services/cache/qr-cache";
import { db } from "@/lib/db/client";

export function useQrReports(
  id: string,
  userId: string | null,
  offlineMode: boolean,
  isQrOwner: boolean | null
) {
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [weightedCounts, setWeightedCounts] = useState<Record<string, number>>({});
  const [userReport, setUserReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [collusionFlags, setCollusionFlags] = useState<{
    suspicious: boolean;
    safeWeightMultiplier?: number;
    negativeWeightMultiplier?: number;
  } | null>(null);

  const committedReportRef  = useRef<string | null>(null);
  // Ref-based in-flight guard — updated synchronously so concurrent calls
  // within the same JS tick are blocked even before React re-renders.
  const reportInFlightRef   = useRef(false);

  // Load initial user report and collusion flags
  useEffect(() => {
    if (!id || !userId || offlineMode) return;
    let cancelled = false;

    getUserQrReport(id, userId)
      .then((report) => {
        if (cancelled) return;
        committedReportRef.current = report;
        setUserReport(report);
      })
      .catch(() => {});

    db.get(["qrCodes", id])
      .then((doc) => {
        if (cancelled || !doc?.suspiciousVoteFlag) return;
        setCollusionFlags({
          suspicious: true,
          safeWeightMultiplier: doc.suspiciousSafeMultiplier ?? 1,
          negativeWeightMultiplier: doc.suspiciousNegMultiplier ?? 1,
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [id, userId, offlineMode]);

  // Live subscription to report counts
  useEffect(() => {
    if (!id || offlineMode) return;
    const unsub = subscribeToQrReports(id, (counts, weighted) => {
      setReportCounts(counts);
      setWeightedCounts(weighted);
    });
    return unsub;
  }, [id, offlineMode]);

  const trustScore = (() => {
    const flags = collusionFlags ?? undefined;
    const ts = calculateTrustScore(reportCounts, weightedCounts, flags ?? undefined);
    return ts.score < 0 ? null : ts;
  })();

  const handleReport = useCallback(
    (type: string): boolean => {
      if (!userId) {
        router.push("/(auth)/login");
        return false;
      }
      if (isQrOwner) return false;
      // Use ref guard (synchronous) so concurrent calls within the same JS
      // tick — e.g. onPressIn re-firing during a re-render — are blocked even
      // before React has committed the new reportLoading state.
      if (reportInFlightRef.current) return false;

      reportInFlightRef.current = true;
      setReportError(null);

      // Optimistic update
      const prev = userReport;
      const isRemoving = prev === type;
      setUserReport(isRemoving ? null : type);
      setReportCounts((counts) => {
        const next = { ...counts };
        if (prev) next[prev] = Math.max(0, (next[prev] ?? 1) - 1);
        if (!isRemoving) next[type] = (next[type] ?? 0) + 1;
        return next;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setReportLoading(true);
      reportQrCode(id, userId, type)
        .then(() => {
          committedReportRef.current = isRemoving ? null : type;
          invalidateQrCache(id);
        })
        .catch((err: unknown) => {
          // Roll back optimistic update
          setUserReport(committedReportRef.current);
          setReportCounts((counts) => {
            const next = { ...counts };
            if (!isRemoving && next[type]) next[type] = Math.max(0, next[type] - 1);
            if (prev) next[prev] = (next[prev] ?? 0) + 1;
            return next;
          });
          // Surface the error so the screen can show a toast
          const msg =
            err instanceof Error
              ? err.message
              : "Could not submit your vote. Please try again.";
          setReportError(msg);
        })
        .finally(() => {
          reportInFlightRef.current = false;
          setReportLoading(false);
        });

      return true;
    },
    [id, userId, isQrOwner, userReport]
  );

  return {
    reportCounts,
    userReport,
    trustScore,
    reportLoading,
    reportError,
    handleReport,
  };
}
