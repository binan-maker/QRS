import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import {
  subscribeToQrReports,
  getQrReportData,
  getUserQrReport,
  reportQrCode,
  type QrReportMeta,
} from "@/services/moderation/report-service";
import { calculateTrustScore } from "@/services/trust/trust-service";
import { invalidateQrCache } from "@/services/cache/qr-cache";
import { queryClient } from "@/lib/query-client";
import { db } from "@/lib/db/client";
import { COLLECTIONS } from "@/shared/constants/collections";

const DEBOUNCE_MS = 400;

export function useQrReports(
  id: string,
  userId: string | null,
  offlineMode: boolean,
  emailVerified: boolean = false,
  qrMeta?: QrReportMeta
) {
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [weightedCounts, setWeightedCounts] = useState<Record<string, number>>({});
  const [userReport, setUserReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportsReadyForId, setReportsReadyForId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [collusionFlags, setCollusionFlags] = useState<{
    suspicious: boolean;
    safeWeightMultiplier?: number;
    negativeWeightMultiplier?: number;
  } | null>(null);

  const committedReportRef = useRef<string | null>(null);
  const targetReportRef = useRef<string | null>(null);
  const serverCountsRef = useRef<Record<string, number>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportInFlightRef = useRef(false);
  const hasInteractedRef = useRef(false);
  const hasFlushedRef = useRef(false);
  const qrMetaRef = useRef<QrReportMeta | undefined>(qrMeta);
  qrMetaRef.current = qrMeta;

  useEffect(() => {
    committedReportRef.current = null;
    targetReportRef.current = null;
    serverCountsRef.current = {};
    reportInFlightRef.current = false;
    hasInteractedRef.current = false;
    hasFlushedRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setReportCounts({});
    setWeightedCounts({});
    setUserReport(null);
    setReportsReadyForId(null);
    setReportError(null);
  }, [id]);

  const applyOptimisticDelta = useCallback((base: Record<string, number>): Record<string, number> => {
    const committed = committedReportRef.current;
    const target = targetReportRef.current;
    if (committed === target) return base;
    const adj = { ...base };
    if (committed) adj[committed] = Math.max(0, (adj[committed] ?? 1) - 1);
    if (target) adj[target] = (adj[target] ?? 0) + 1;
    return adj;
  }, []);

  const flushToServer = useCallback(() => {
    const target = targetReportRef.current;
    const committed = committedReportRef.current;
    if (target === committed || reportInFlightRef.current) return;

    reportInFlightRef.current = true;
    setReportLoading(true);
    setReportError(null);

    const sentTarget = target;
    const prevCommitted = committed;
    const typeToSend = target ?? committed!;

    reportQrCode(id, userId!, typeToSend, emailVerified, qrMetaRef.current)
      .then(async () => {
        hasFlushedRef.current = true;
        const updated = { ...serverCountsRef.current };
        if (prevCommitted) updated[prevCommitted] = Math.max(0, (updated[prevCommitted] ?? 1) - 1);
        if (sentTarget) updated[sentTarget] = (updated[sentTarget] ?? 0) + 1;
        serverCountsRef.current = updated;
        committedReportRef.current = sentTarget;
        setReportCounts(applyOptimisticDelta(serverCountsRef.current));

        try {
          const fresh = await getQrReportData(id);
          serverCountsRef.current = fresh.counts;
          setWeightedCounts(fresh.weighted);
          setReportCounts(applyOptimisticDelta(fresh.counts));
        } catch {}

        invalidateQrCache(id);
        queryClient.invalidateQueries({ queryKey: ["qr-detail", id] });
      })
      .catch((err: any) => {
        if (targetReportRef.current === sentTarget) {
          targetReportRef.current = committedReportRef.current;
          setUserReport(committedReportRef.current);
          setReportCounts({ ...serverCountsRef.current });
        }
        const raw = err?.message || "";
        setReportError(raw.includes("limit") || raw.includes("Please wait") ? raw : "Could not submit your vote. Please try again.");
      })
      .finally(() => {
        reportInFlightRef.current = false;
        setReportLoading(false);
        if (targetReportRef.current !== committedReportRef.current) {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            flushToServer();
          }, DEBOUNCE_MS);
        }
      });
  }, [id, userId, emailVerified, applyOptimisticDelta]);

  useEffect(() => {
    setReportsReadyForId(offlineMode ? id : null);
    if (offlineMode) return;

    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setReportsReadyForId((c) => c || id);
    }, 1500);

    const unsub = subscribeToQrReports(id, (counts, weighted) => {
      if (cancelled) return;
      serverCountsRef.current = counts;
      setWeightedCounts(weighted);
      setReportsReadyForId(id);
      if (!reportInFlightRef.current) {
        setReportCounts(applyOptimisticDelta(counts));
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      unsub();
    };
  }, [id, offlineMode, applyOptimisticDelta]);

  useEffect(() => {
    if (!id || !userId || offlineMode) return;
    let cancelled = false;

    getUserQrReport(id, userId)
      .then((report) => {
        if (cancelled) return;
        if (!hasFlushedRef.current && !reportInFlightRef.current) committedReportRef.current = report;
        if (!hasInteractedRef.current) {
          targetReportRef.current = report;
          setUserReport(report);
        }
        setReportCounts(applyOptimisticDelta(serverCountsRef.current));
      })
      .catch(() => {});

    db.get([COLLECTIONS.QR_CODES, id])
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
  }, [id, userId, offlineMode, applyOptimisticDelta]);

  const trustScore = useMemo(() => {
    const ts = calculateTrustScore(reportCounts, weightedCounts, collusionFlags ?? undefined);
    return ts.score < 0 ? null : ts;
  }, [reportCounts, weightedCounts, collusionFlags]);

  const handleReport = useCallback((type: string): boolean => {
    if (!userId) {
      router.push("/(auth)/login");
      return false;
    }
    hasInteractedRef.current = true;
    const newTarget = targetReportRef.current === type ? null : type;
    targetReportRef.current = newTarget;
    setUserReport(newTarget);
    setReportCounts(applyOptimisticDelta(serverCountsRef.current));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      flushToServer();
    }, DEBOUNCE_MS);
    return true;
  }, [userId, applyOptimisticDelta, flushToServer]);

  const refreshReports = useCallback(async () => {
    if (!id || offlineMode) return;
    try {
      const [freshData, freshUserReport] = await Promise.all([
        getQrReportData(id),
        userId ? getUserQrReport(id, userId) : Promise.resolve(null),
      ]);
      serverCountsRef.current = freshData.counts;
      setWeightedCounts(freshData.weighted);
      if (!reportInFlightRef.current && !debounceTimerRef.current) {
        committedReportRef.current = freshUserReport;
        targetReportRef.current = freshUserReport;
        setUserReport(freshUserReport);
      }
      setReportCounts(applyOptimisticDelta(freshData.counts));
    } catch {}
  }, [id, userId, offlineMode, applyOptimisticDelta]);

  return {
    reportCounts,
    userReport,
    reportsReady: offlineMode || reportsReadyForId === id,
    trustScore,
    reportLoading,
    reportError,
    handleReport,
    refreshReports,
  };
}
