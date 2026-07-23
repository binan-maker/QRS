import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import {
  subscribeToQrReports,
  getUserQrReport,
  reportQrCode,
} from "@/services/moderation/report-service";
import { calculateTrustScore } from "@/services/trust/trust-service";
import { invalidateQrCache } from "@/services/cache/qr-cache";
import { queryClient } from "@/lib/query-client";
import { db } from "@/lib/db/client";
import { COLLECTIONS } from "@/shared/constants/collections";

// How long after the last click before we flush to the server.
// Every click updates the UI instantly; only the final intended state is sent.
const DEBOUNCE_MS = 400;

export function useQrReports(
  id: string,
  userId: string | null,
  offlineMode: boolean,
  isQrOwner: boolean | null
) {
  const [reportCounts, setReportCounts]     = useState<Record<string, number>>({});
  const [weightedCounts, setWeightedCounts] = useState<Record<string, number>>({});
  const [userReport, setUserReport]         = useState<string | null>(null);
  const [reportLoading, setReportLoading]   = useState(false);
  const [reportError, setReportError]       = useState<string | null>(null);
  const [collusionFlags, setCollusionFlags] = useState<{
    suspicious: boolean;
    safeWeightMultiplier?: number;
    negativeWeightMultiplier?: number;
  } | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  // committedReportRef  — last state confirmed by the server (rollback target)
  // targetReportRef     — what the user currently WANTS (updated on every click)
  // serverCountsRef     — raw counts from the live subscription (ground truth)
  // debounceTimerRef    — the pending server-flush timer
  // reportInFlightRef   — true while a Firestore write is in progress
  // hasInteractedRef    — true once the user has tapped any vote button;
  //                       prevents a late initial-load response from overwriting
  //                       a choice the user already made
  const committedReportRef = useRef<string | null>(null);
  const targetReportRef    = useRef<string | null>(null);
  const serverCountsRef    = useRef<Record<string, number>>({});
  const debounceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportInFlightRef  = useRef(false);
  const hasInteractedRef   = useRef(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Displayed counts = server truth + the diff between committed and target.
  // Applied on every click AND after every subscription update so the count
  // the user sees always reflects their pending intent.
  const applyOptimisticDelta = useCallback(
    (base: Record<string, number>): Record<string, number> => {
      const committed = committedReportRef.current;
      const target    = targetReportRef.current;
      if (committed === target) return base;
      const adj = { ...base };
      if (committed) adj[committed] = Math.max(0, (adj[committed] ?? 1) - 1);
      if (target)    adj[target]    = (adj[target] ?? 0) + 1;
      return adj;
    },
    []
  );

  // ── Server flush ──────────────────────────────────────────────────────────
  // Sends a single Firestore write for the current intended state.
  // Called by the debounce timer AND re-scheduled in .finally() whenever
  // the user clicked again during the in-flight window (so no intent is lost).
  const flushToServer = useCallback(() => {
    const target    = targetReportRef.current;
    const committed = committedReportRef.current;

    if (target === committed) return;   // no net change
    if (reportInFlightRef.current) return; // already flushing

    reportInFlightRef.current = true;
    setReportLoading(true);
    setReportError(null);

    // Snapshot the intent we are about to send so we can detect if the user
    // clicked again while this write is in flight (targetReportRef will differ).
    const sentTarget = target;

    // Translate "set-to-target" intent into the server's toggle semantics:
    //   target = null → remove current committed vote → send committed type (toggles it off)
    //   target = X    → set/change to X               → send X
    const typeToSend = target ?? committed!;

    reportQrCode(id, userId!, typeToSend)
      .then(() => {
        committedReportRef.current = sentTarget;
        // The Firestore subscription almost always fires BEFORE this .then()
        // callback runs, because snapshot listeners are delivered first in the
        // microtask queue.  At that point committedRef was still the OLD value,
        // so applyOptimisticDelta added an extra +1 (or left a stale –1).
        // Now that committed is correct, recompute and correct the display.
        setReportCounts(applyOptimisticDelta(serverCountsRef.current));
        invalidateQrCache(id);
        // Mark the TanStack Query cache stale so active observers receive fresh
        // QR data (owner info, scan counts, etc.) after the vote is committed.
        queryClient.invalidateQueries({ queryKey: ["qr-detail", id] });
      })
      .catch((err: unknown) => {
        // Only rollback UI if the user has NOT clicked again since this flush
        // started. If they have, their newer intent is still in targetReportRef
        // and .finally() will reschedule a flush for it — don't clobber it.
        if (targetReportRef.current === sentTarget) {
          targetReportRef.current = committedReportRef.current;
          setUserReport(committedReportRef.current);
          setReportCounts({ ...serverCountsRef.current }); // drop optimistic delta
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Could not submit your vote. Please try again.";
        setReportError(msg);
      })
      .finally(() => {
        reportInFlightRef.current = false;
        setReportLoading(false);
        // If the user clicked again while this write was in flight, their intent
        // is still stored in targetReportRef but no timer remains to send it.
        // Schedule a fresh flush so nothing is silently dropped.
        if (targetReportRef.current !== committedReportRef.current) {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            flushToServer();
          }, DEBOUNCE_MS);
        }
      });
  }, [id, userId, applyOptimisticDelta]);

  // ── Initial user report + collusion flags ─────────────────────────────────
  useEffect(() => {
    if (!id || !userId || offlineMode) return;
    let cancelled = false;

    getUserQrReport(id, userId)
      .then((report) => {
        if (cancelled) return;
        committedReportRef.current = report;
        // Only sync the displayed state when the user hasn't clicked yet.
        // A late response must not overwrite a choice the user already made.
        if (!hasInteractedRef.current) {
          targetReportRef.current = report;
          setUserReport(report);
          // Re-render counts without any pending delta
          setReportCounts(applyOptimisticDelta(serverCountsRef.current));
        }
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

  // ── Live subscription to report counts ────────────────────────────────────
  // After each server update, re-apply the optimistic delta so the count the
  // user sees always reflects their pending intent, not just the server truth.
  useEffect(() => {
    if (!id || offlineMode) return;
    const unsub = subscribeToQrReports(id, (counts, weighted) => {
      serverCountsRef.current = counts;
      setWeightedCounts(weighted);
      // While a write is in-flight the Firestore snapshot arrives BEFORE
      // .then() updates committedRef.  Rendering at that moment produces a
      // wrong delta (+1 ghost count).  Suppress the repaint here — .then()
      // will call setReportCounts once committedRef is correct.
      if (!reportInFlightRef.current) {
        setReportCounts(applyOptimisticDelta(counts));
      }
    });
    return unsub;
  }, [id, offlineMode, applyOptimisticDelta]);

  // ── Trust score ───────────────────────────────────────────────────────────
  // useMemo so the score object is reference-stable when counts haven't changed,
  // preventing unnecessary re-renders in consumers that receive it as a prop.
  const trustScore = useMemo(() => {
    const flags = collusionFlags ?? undefined;
    const ts = calculateTrustScore(reportCounts, weightedCounts, flags ?? undefined);
    return ts.score < 0 ? null : ts;
  }, [reportCounts, weightedCounts, collusionFlags]);

  // ── Handle vote button press ───────────────────────────────────────────────
  // Updates UI INSTANTLY on every tap with no in-flight blocking.
  // The actual Firestore write is debounced: only the final intended state
  // is written, 400 ms after the last tap.
  const handleReport = useCallback(
    (type: string): boolean => {
      if (!userId) {
        router.push("/(auth)/login");
        return false;
      }
      if (isQrOwner) return false;

      // Mark that the user has interacted so initial-load won't override them
      hasInteractedRef.current = true;

      // Toggle: tapping the currently-targeted type removes it; any other selects it
      const newTarget = targetReportRef.current === type ? null : type;
      targetReportRef.current = newTarget;
      setUserReport(newTarget);

      // Immediately recompute optimistic counts (committed → newTarget)
      setReportCounts(applyOptimisticDelta(serverCountsRef.current));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Reset the debounce window — previous timer (if any) is cancelled
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        flushToServer();
      }, DEBOUNCE_MS);

      return true;
    },
    [userId, isQrOwner, applyOptimisticDelta, flushToServer]
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
