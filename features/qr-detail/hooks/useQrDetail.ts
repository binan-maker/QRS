import { useState, useCallback } from "react";
import { Alert, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { smartOpenContent } from "@/shared/utils/smart-open";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useQrData, type QrDetail } from "./useQrData";
import { calculateTrustScore } from "@/services/trust-service";
import { useQrSafety } from "./useQrSafety";
import { useQrReports } from "./useQrReports";
import { useQrFollow } from "./useQrFollow";
import { useQrFavorite } from "./useQrFavorite";
import { useQrComments, type CommentItem } from "./useQrComments";
import { useQrOwner } from "./useQrOwner";
import { useCreatorFollow } from "./useCreatorFollow";

export type { QrDetail, CommentItem };

export function useQrDetail(id: string) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const userId = user?.id ?? null;
  const [copied, setCopied] = useState(false);

  const data = useQrData(id, userId);
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
    // QR Guard verified = current user owns it, OR owner has branded flag set
    // (either from ownerInfo async fetch OR from the qrCode document itself).
    const isQrGuardVerified =
      data.isQrOwner === true ||
      data.ownerInfo?.isBranded === true ||
      (data.qrCode as any)?.isBranded === true;

    if (offlineBlacklistMatch.matched) {
      return { level: "caution" as const, label: "CAUTION ADVISED", reason: offlineBlacklistMatch.reason ?? "Potential scam pattern detected", color: colors.warning };
    }

    // Owner viewing their own QR — skip community/threat checks and confirm ownership.
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
          return { level: "safe" as const, label: "SAFE", reason: `${Math.round(trust.score)}% community trust · QR Guard Verified`, color: colors.safe };
        }
        return { level: "caution" as const, label: "UNVERIFIED QR", reason: `${Math.round(trust.score)}% community trust · Owner not verified by QR Guard`, color: colors.warning };
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
    // Default fallback: for external/unverified QRs we cannot guarantee safety.
    if (!isQrGuardVerified) {
      return { level: "caution" as const, label: "UNVERIFIED QR", reason: "Unverified source · Proceed with caution", color: colors.warning };
    }
    return { level: "safe" as const, label: "SAFE", reason: "No threats detected", color: colors.safe };
  }

  function buildUpiUrl(parsedPayment: NonNullable<typeof safety.parsedPayment>): string | null {
    const { vpa, recipientName, amount, currency } = parsedPayment;
    if (!vpa) return null;
    // Validate VPA format before building the link — prevents malformed deep links
    const vpaRegex = /^[a-zA-Z0-9._\-]+@[a-zA-Z0-9]+$/;
    if (!vpaRegex.test(vpa.trim())) return null;
    // mode=02 forces payee name resolution from NPCI; mc=0000 is standard merchant code
    let url = `upi://pay?pa=${encodeURIComponent(vpa.trim())}&mc=0000&mode=02`;
    if (recipientName) url += `&pn=${encodeURIComponent(recipientName.trim())}`;
    const parsedAmount = amount ? parseFloat(amount) : 0;
    if (parsedAmount > 0) url += `&am=${parsedAmount.toFixed(2)}`;
    // cu=INR always present — some UPI apps reject links without it
    url += `&cu=${currency || "INR"}`;
    return url;
  }

  async function handleOpenPayment(rawContent: string) {
    const linksToTry: string[] = [];
    const lower = rawContent.toLowerCase();
    const { parsedPayment } = safety;

    if (parsedPayment?.isEmv) {
      const { vpa, recipientName, extraFields } = parsedPayment;
      if (vpa) {
        const upiUrl = buildUpiUrl(parsedPayment);
        if (upiUrl) linksToTry.push(upiUrl);
      } else {
        const acct = extraFields?.accountNumber;
        const ifsc = extraFields?.ifsc;
        const bankName = extraFields?.bankName || parsedPayment.appDisplayName || "your bank";
        const name = recipientName || "this merchant";
        const msg = acct && ifsc
          ? `Open your bank app and use these details:\n\nAccount: ${acct}\nIFSC: ${ifsc}\nBeneficiary: ${name}`
          : `To pay ${name}, open your bank app (${bankName}) and use the scan/transfer feature.`;
        Alert.alert("Open Your Bank App", msg, [{ text: "OK" }]);
        return;
      }
    } else if (parsedPayment) {
      const cat = parsedPayment.appCategory;
      if (cat === "upi_india" || cat === "india_wallet") {
        if (lower.startsWith("upi://")) {
          linksToTry.push(rawContent);
        } else if (lower.startsWith("tez://upi/") || lower.startsWith("gpay://upi/")) {
          linksToTry.push("upi://" + rawContent.split("upi/")[1], rawContent);
        } else {
          linksToTry.push(rawContent);
          if (rawContent.includes("?")) linksToTry.push("upi://pay?" + rawContent.split("?")[1]);
          const upiUrl = buildUpiUrl(parsedPayment);
          if (upiUrl) linksToTry.push(upiUrl);
        }
      } else if (cat === "crypto") {
        linksToTry.push(rawContent);
      } else {
        linksToTry.push(rawContent);
        if (!lower.startsWith("http") && !lower.startsWith("https")) {
          try { new URL("https://" + rawContent); linksToTry.push("https://" + rawContent); } catch {}
        }
      }
    } else {
      linksToTry.push(rawContent);
    }

    for (const link of linksToTry) {
      try {
        const canOpen = await Linking.canOpenURL(link);
        if (canOpen) { await Linking.openURL(link); return; }
      } catch {}
    }
    if (linksToTry.length > 0) {
      Linking.openURL(linksToTry[0]).catch(() => {
        const appName = parsedPayment?.appDisplayName ?? "payment app";
        Alert.alert("App Not Found", `Could not open ${appName}. Make sure the app is installed on your device.`);
      });
    }
  }

  async function handleOpenContent() {
    if (!content) return;
    // Payment types have complex UPI/EMV routing that depends on parsedPayment
    // state — keep that handler here; route everything else through smartOpenContent.
    if (contentType === "payment") {
      handleOpenPayment(content);
      return;
    }
    await smartOpenContent(content, contentType, data.qrCode?.templateKey);
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
