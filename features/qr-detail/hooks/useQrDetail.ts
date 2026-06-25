import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { smartOpenContent } from "@/shared/utils/smart-open";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useQrData, type QrDetail } from "./useQrData";
import { useQrSafety } from "./useQrSafety";
import { useQrReports } from "./useQrReports";
import { useQrFollow } from "./useQrFollow";
import { useQrFavorite } from "./useQrFavorite";
import { useQrComments, type CommentItem } from "./useQrComments";
import { useQrOwner } from "./useQrOwner";
import { useCreatorFollow } from "./useCreatorFollow";

export type { QrDetail, CommentItem };

// ── Trust helpers (local fallback — overridden by server score when available) ─

function calculateTrustScore(reportCounts: Record<string, number>): { score: number; label: string } {
  const total = Object.values(reportCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return { score: -1, label: "No Reports" };
  const safe = (reportCounts["safe"] ?? 0) + (reportCounts["likely_safe"] ?? 0);
  const score = Math.round((safe / total) * 100);
  const label = score >= 75 ? "Trusted" : score >= 50 ? "Likely Safe" : score >= 30 ? "Caution" : "Dangerous";
  return { score, label };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useQrDetail(id: string, hint?: { content: string; contentType: string }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const userId = user?.id ?? null;
  const [copied, setCopied] = useState(false);

  const data = useQrData(id, userId, hint);
  const rawContent = data.qrCode?.content || data.offlineContent;
  const content = (data.qrCode as any)?.displayDestination || rawContent;
  const contentType = data.qrCode?.contentType || data.offlineContentType;

  const creatorId = data.ownerInfo?.ownerId ?? null;
  const creatorName = data.ownerInfo?.businessName || data.ownerInfo?.ownerName || null;

  const safety = useQrSafety(content, contentType);
  const reports = useQrReports(id, userId, data.offlineMode, data.isQrOwner);
  const follow = useQrFollow(id, userId, user?.displayName ?? null);
  const creatorFollow = useCreatorFollow(creatorId, userId, user?.displayName ?? null, creatorName);
  const favorite = useQrFavorite(id, userId);
  const comments = useQrComments(id, userId, data.offlineMode);
  const owner = useQrOwner(id, userId, user?.displayName ?? null, data.isQrOwner, data.ownerInfo);

  // ── Trust / verdict ──────────────────────────────────────────────────────────

  function getTrustColor(label: string) {
    switch (label) {
      case "Trusted": case "Likely Safe": return colors.safe;
      case "Caution": case "Uncertain": return colors.warning;
      case "Dangerous": case "Suspicious": return colors.danger;
      default: return colors.textMuted;
    }
  }

  function getTrustInfo() {
    const { trustScore, reportCounts } = reports;
    if (trustScore && trustScore.score >= 0) {
      return {
        score: trustScore.score,
        label: trustScore.label,
        color: getTrustColor(trustScore.label),
        manipulationWarning: trustScore.manipulationWarning ?? false,
      };
    }
    const fallback = calculateTrustScore(reportCounts);
    if (fallback.score < 0) return { score: -1, label: "No Reports", color: colors.textMuted, manipulationWarning: false };
    return { score: fallback.score, label: fallback.label, color: getTrustColor(fallback.label ?? ""), manipulationWarning: false };
  }

  function getCombinedVerdict() {
    const { offlineBlacklistMatch, paymentSafety, urlSafety, instantVerdict } = safety;
    const trust = getTrustInfo();
    const isQrGuardVerified =
      data.isQrOwner === true ||
      data.ownerInfo?.isBranded === true ||
      (data.qrCode as any)?.isBranded === true;

    if (offlineBlacklistMatch.matched) {
      return { level: "caution" as const, label: "CAUTION ADVISED", reason: offlineBlacklistMatch.reason ?? "Potential scam pattern detected", color: colors.warning };
    }

    if (data.isQrOwner === true) {
      if (paymentSafety?.isSuspicious || urlSafety?.isSuspicious) {
        return { level: "caution" as const, label: "CAUTION", reason: "Local analysis detected a potential risk in this QR", color: colors.warning };
      }
      return { level: "safe" as const, label: "YOUR QR", reason: "You created this QR code", color: colors.safe };
    }

    const isCommunityAvailable = trust.score >= 0;

    if (isCommunityAvailable) {
      if (trust.label === "Trusted" || trust.label === "Likely Safe") {
        if (paymentSafety?.isSuspicious || urlSafety?.isSuspicious) {
          return { level: "caution" as const, label: "CAUTION", reason: "Community trusts it, but local analysis found risks", color: colors.warning };
        }
        if (isQrGuardVerified) {
          return { level: "safe" as const, label: "SAFE", reason: `${Math.round(trust.score)}% community trust · BinRo Verified`, color: colors.safe };
        }
        return { level: "caution" as const, label: "UNVERIFIED QR", reason: `${Math.round(trust.score)}% community trust · Owner not verified by BinRo`, color: colors.warning };
      }
      if (trust.label === "Caution" || trust.label === "Uncertain") {
        return { level: "caution" as const, label: "CAUTION", reason: "Mixed community reports", color: colors.warning };
      }
      if (trust.label === "Dangerous" || trust.label === "Suspicious") {
        return { level: "caution" as const, label: "CAUTION ADVISED", reason: "Low community trust score", color: colors.warning };
      }
    }

    if (instantVerdict.level === "dangerous") {
      return { level: "caution" as const, label: "CAUTION ADVISED", reason: instantVerdict.reason ?? "Review recommended", color: colors.warning };
    }
    if (instantVerdict.level === "caution") {
      return { level: "caution" as const, label: "CAUTION", reason: instantVerdict.reason ?? "Proceed carefully", color: colors.warning };
    }
    if (!isQrGuardVerified) {
      return { level: "caution" as const, label: "UNVERIFIED QR", reason: "Unverified source · Proceed with caution", color: colors.warning };
    }
    return { level: "safe" as const, label: "SAFE", reason: "No threats detected", color: colors.safe };
  }

  // ── Other handlers ───────────────────────────────────────────────────────────

  async function handleOpenContent() {
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
      const { parsedPayment } = safety;
      const copyValue =
        parsedPayment?.vpa ||
        (parsedPayment?.recipientId?.includes("@") ? parsedPayment.recipientId : null) ||
        content;
      await Clipboard.setStringAsync(copyValue);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    await smartOpenContent(content, contentType, data.qrCode?.templateKey ?? undefined);
  }

  async function handleCopyContent() {
    if (!content) return;
    await Clipboard.setStringAsync(content);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleToggleFavorite() {
    if (!content) return;
    return favorite.handleToggleFavorite(content, contentType || "text");
  }

  function handleToggleFollow() {
    if (!content) return;
    return follow.handleToggleFollow(content, contentType || "text");
  }

  function handleSubmitComment() {
    return comments.handleSubmitComment();
  }

  return {
    user,
    ...data,
    ...safety,
    ...reports,
    ...follow,
    ...creatorFollow,
    ...favorite,
    ...comments,
    ...owner,
    copied,
    creatorId,
    creatorName,
    getTrustInfo,
    getCombinedVerdict,
    handleOpenContent,
    handleCopyContent,
    handleToggleFavorite,
    handleToggleFollow,
    handleSubmitComment,
  };
}
