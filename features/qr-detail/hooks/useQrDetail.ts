import { useState, useRef, useMemo, useCallback } from "react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { smartOpenContent } from "@/shared/utils/smart-open";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useQrData, type QrDetail } from "./useQrData";
import { useQrReports } from "./useQrReports";
import { useQrFollow } from "./useQrFollow";
import { useQrFavorite } from "./useQrFavorite";
import { useQrComments, type CommentItem } from "./useQrComments";
import { useQrOwner } from "./useQrOwner";
import { useCreatorFollow } from "./useCreatorFollow";
import type { AppColors } from "@/shared/constants/colors";
import { parseAnyPaymentQr } from "@/services/analysis";

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
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const data = useQrData(id, userId, hint);
  const rawContent = data.qrCode?.content || data.offlineContent;
  const content = (data.qrCode as any)?.displayDestination || rawContent;
  const contentType = data.qrCode?.contentType || data.offlineContentType;

  const creatorId = data.ownerInfo?.ownerId ?? null;
  const creatorName = data.ownerInfo?.businessName || data.ownerInfo?.ownerName || null;

  const parsedPayment = useMemo(
    () =>
      content &&
      (contentType === "payment" ||
        contentType === "upi" ||
        contentType === "paymentlink" ||
        contentType === "scantopay" ||
        contentType === "bharatqr")
        ? parseAnyPaymentQr(content)
        : null,
    [content, contentType],
  );
  const reports = useQrReports(id, userId, data.offlineMode, data.isQrOwner);
  const follow = useQrFollow(id, userId, user?.displayName ?? null);
  const creatorFollow = useCreatorFollow(creatorId, userId, user?.displayName ?? null, creatorName);
  const favorite = useQrFavorite(id, userId);
  const comments = useQrComments(id, userId, data.offlineMode);
  const owner = useQrOwner(id, userId, user?.displayName ?? null, data.isQrOwner, data.ownerInfo);
  const initialDataReady =
    !data.loading &&
    (data.offlineMode || data.ownerDataReady) &&
    reports.reportsReady;

  // ── Trust / verdict ──────────────────────────────────────────────────────────
  // Memoized so child components receiving these as props don't re-render
  // when unrelated state changes (e.g. copied, toastState, scroll position).

  const trustInfo = useMemo(() => {
    const { trustScore, reportCounts } = reports;
    if (trustScore && trustScore.score >= 0) {
      return {
        score: trustScore.score,
        label: trustScore.label,
        color: getTrustColor(trustScore.label, colors),
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

  const combinedVerdict = useMemo(() => {
    const trust = trustInfo;

    if (data.isQrOwner === true) {
      return { level: "safe" as const, label: "YOUR QR", reason: "You created this QR code", color: colors.safe };
    }

    const isCommunityAvailable = trust.score >= 0;

    if (isCommunityAvailable) {
      if (trust.label === "Trusted" || trust.label === "Likely Safe") {
        return { level: "safe" as const, label: "COMMUNITY TRUSTED", reason: `${Math.round(trust.score)}% community trust`, color: colors.safe };
      }
      if (trust.label === "Caution" || trust.label === "Uncertain") {
        return { level: "caution" as const, label: "CAUTION", reason: "Mixed community reports", color: colors.warning };
      }
      if (trust.label === "Dangerous" || trust.label === "Suspicious") {
        return { level: "caution" as const, label: "CAUTION ADVISED", reason: "Low community trust score", color: colors.warning };
      }
    }

    return { level: "caution" as const, label: "UNRATED", reason: "No community ratings yet", color: colors.textMuted };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.isQrOwner,
    trustInfo,
    colors,
  ]);

  // Stable function wrappers so callers using the function API continue to work
  // (e.g. VerdictBanner type-checks against the function signature).
  const getTrustInfo = useCallback(() => trustInfo, [trustInfo]);
  const getCombinedVerdict = useCallback(() => combinedVerdict, [combinedVerdict]);

  // ── Other handlers ───────────────────────────────────────────────────────────

  const handleOpenContent = useCallback(async () => {
    if (!content) return;
    if (
      contentType === "payment" ||
      contentType === "upi" ||
      contentType === "paymentlink" ||
      contentType === "scantopay" ||
      contentType === "bharatqr"
    ) {
      // Copy UPI ID / payment link to clipboard instead of deep-linking into payment apps,
      // which causes broken redirects across GPay, PhonePe, Paytm, BHIM etc.
      const copyValue =
        parsedPayment?.vpa ||
        (parsedPayment?.recipientId?.includes("@") ? parsedPayment.recipientId : null) ||
        content;
      await Clipboard.setStringAsync(copyValue);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
      return;
    }
    await smartOpenContent(content, contentType, data.qrCode?.templateKey ?? undefined);
  }, [content, contentType, parsedPayment, data.qrCode?.templateKey]);

  const handleCopyContent = useCallback(async () => {
    if (!content) return;
    await Clipboard.setStringAsync(content);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleToggleFavorite = useCallback(() => {
    if (!content) return;
    return favorite.handleToggleFavorite(content, contentType || "text");
  }, [content, contentType, favorite.handleToggleFavorite]);

  const handleToggleFollow = useCallback(() => {
    if (!content) return;
    return follow.handleToggleFollow(content, contentType || "text");
  }, [content, contentType, follow.handleToggleFollow]);

  const handleSubmitComment = useCallback(() => {
    return comments.handleSubmitComment();
  }, [comments.handleSubmitComment]);

  return {
    user,
    ...data,
    parsedPayment,
    ...reports,
    ...follow,
    ...creatorFollow,
    ...favorite,
    ...comments,
    ...owner,
    initialDataReady,
    copied,
    creatorId,
    creatorName,
    trustInfo,
    combinedVerdict,
    getTrustInfo,
    getCombinedVerdict,
    handleOpenContent,
    handleCopyContent,
    handleToggleFavorite,
    handleToggleFollow,
    handleSubmitComment,
  };
}
