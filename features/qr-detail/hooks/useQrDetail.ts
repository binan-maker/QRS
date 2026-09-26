import { useState, useRef, useMemo, useCallback } from "react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { smartOpenContent } from "@/shared/utils/smart-open";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useQrData, type QrDetail } from "./useQrData";
import { useQrReports } from "./useQrReports";
import { useQrComments, type CommentItem } from "./useQrComments";
import type { AppColors } from "@/shared/constants/colors";
import { parseAnyPaymentQr } from "@/services/analysis";
import { normalizeQrDetailContentType } from "../content-types";

export type { QrDetail, CommentItem };

// ── Trust helpers (local fallback — overridden by server score when available) ─
// Pure functions at module level so they are never recreated.

function calculateTrustScore(reportCounts: Record<string, number>): { score: number; label: string } {
  const total = Object.values(reportCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return { score: -1, label: "No Reports" };
  const safe = (reportCounts["safe"] ?? 0) + (reportCounts["likely_safe"] ?? 0);
  const score = Math.round((safe / total) * 100);
  const label = score >= 75 ? "Trusted" : score >= 50 ? "Likely Safe" : score >= 30 ? "Caution" : "Dangerous";
  return { score, label };
}

function getTrustColor(label: string, colors: AppColors): string {
  switch (label) {
    case "Trusted": case "Likely Safe": return colors.safe;
    case "Caution": case "Uncertain": return colors.warning;
    case "Dangerous": case "Suspicious": return colors.danger;
    default: return colors.textMuted;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useQrDetail(id: string, hint?: { content: string; contentType: string }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const userId = user?.id ?? null;

  const data = useQrData(id, userId, hint);
  const content = data.qrCode?.content || data.offlineContent;
  const contentType = normalizeQrDetailContentType(data.qrCode?.contentType || data.offlineContentType);

  const parsedPayment = useMemo(
    () =>
      content &&
      contentType === "payment"
        ? parseAnyPaymentQr(content)
        : null,
    [content, contentType],
  );
  const reports = useQrReports(id, userId, data.offlineMode);
  const comments = useQrComments(id, userId, data.offlineMode);
  const initialDataReady =
    !data.loading &&
    reports.reportsReady;

  // ── Trust score ─────────────────────────────────────────────────────────────
  const trustInfo = useMemo(() => {
    const { trustScore, reportCounts } = reports;
    if (trustScore && trustScore.score >= 0) {
      return {
        score: trustScore.score,
        label: trustScore.label,
        color: getTrustColor(trustScore.label ?? "", colors),
        manipulationWarning: trustScore.manipulationWarning ?? false,
      };
    }
    const fallback = calculateTrustScore(reportCounts);
    if (fallback.score < 0) {
      return { score: -1, label: "No Reports", color: colors.textMuted, manipulationWarning: false };
    }
    return {
      score: fallback.score,
      label: fallback.label,
      color: getTrustColor(fallback.label ?? "", colors),
      manipulationWarning: false,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports.trustScore, reports.reportCounts, colors]);

  // ── Other handlers ───────────────────────────────────────────────────────────

  const handleOpenContent = useCallback(async () => {
    if (!content) return;
    if (contentType === "payment") {
      // Copy UPI ID / payment link to clipboard instead of deep-linking into payment apps,
      // which causes broken redirects across GPay, PhonePe, Paytm, BHIM etc.
      const copyValue =
        parsedPayment?.vpa ||
        (parsedPayment?.recipientId?.includes("@") ? parsedPayment.recipientId : null) ||
        content;
      await Clipboard.setStringAsync(copyValue);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    await smartOpenContent(content, contentType, data.qrCode?.templateKey ?? undefined);
  }, [content, contentType, parsedPayment, data.qrCode?.templateKey]);

  const handleSubmitComment = useCallback(() => {
    return comments.handleSubmitComment();
  }, [comments.handleSubmitComment]);

  return {
    user,
    ...data,
    parsedPayment,
    ...reports,
    ...comments,
    initialDataReady,
    trustInfo,
    handleOpenContent,
    handleSubmitComment,
  };
}
