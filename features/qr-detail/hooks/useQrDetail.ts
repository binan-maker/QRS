import { useState } from "react";
import { Alert, Linking } from "react-native";
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

// ── VPA validation ────────────────────────────────────────────────────────────

const SERVER_BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : __DEV__ ? "http://localhost:5000" : "";

async function validateVpa(
  vpa: string
): Promise<{ valid: boolean | null; customerName: string | null; reason?: string }> {
  try {
    const res = await fetch(`${SERVER_BASE_URL}/api/v1/qr/validate-vpa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vpa }),
    });
    if (!res.ok) return { valid: null, customerName: null };
    return await res.json();
  } catch {
    return { valid: null, customerName: null };
  }
}

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
  const [paymentValidating, setPaymentValidating] = useState(false);

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

  // ── UPI payment helpers ──────────────────────────────────────────────────────

  function buildUpiUrl(parsedPayment: NonNullable<typeof safety.parsedPayment>): string | null {
    const { vpa, recipientName, amount, currency } = parsedPayment;
    if (!vpa) return null;
    const vpaRegex = /^[a-zA-Z0-9._\-]+@[a-zA-Z0-9]+$/;
    if (!vpaRegex.test(vpa.trim())) return null;
    let url = `upi://pay?pa=${encodeURIComponent(vpa.trim())}&mc=0000&mode=02`;
    if (recipientName) url += `&pn=${encodeURIComponent(recipientName.trim())}`;
    const parsedAmount = amount ? parseFloat(amount) : 0;
    if (parsedAmount > 0) url += `&am=${parsedAmount.toFixed(2)}`;
    url += `&cu=${currency || "INR"}`;
    return url;
  }

  /** Extracts the canonical VPA from either the parsed payment data or raw UPI URL. */
  function extractVpa(rawContent: string): string | null {
    const { parsedPayment } = safety;
    if (parsedPayment?.vpa) return parsedPayment.vpa.trim().toLowerCase();
    try {
      const lower = rawContent.toLowerCase();
      let uriStr = rawContent;
      if (lower.startsWith("tez://upi/") || lower.startsWith("gpay://upi/")) {
        uriStr = "upi://" + rawContent.split("upi/")[1];
      }
      if (uriStr.toLowerCase().startsWith("upi://") || uriStr.includes("?")) {
        const queryStr = uriStr.includes("?") ? uriStr.split("?")[1] : "";
        const params = new URLSearchParams(queryStr);
        const pa = params.get("pa");
        if (pa) return pa.trim().toLowerCase();
      }
    } catch {}
    return null;
  }

  async function handleOpenPayment(rawContent: string) {
    const linksToTry: string[] = [];
    const lower = rawContent.toLowerCase();
    const { parsedPayment } = safety;

    // ── VPA validation before redirect ───────────────────────────────────────
    const isUpi =
      parsedPayment?.appCategory === "upi_india" ||
      parsedPayment?.appCategory === "india_wallet" ||
      parsedPayment?.isEmv;

    if (isUpi) {
      const vpa = extractVpa(rawContent);
      if (vpa) {
        setPaymentValidating(true);
        try {
          const check = await validateVpa(vpa);
          if (check.valid === false) {
            // Confirmed invalid — show clear error and stop
            Alert.alert(
              "UPI ID Not Accepting Payments",
              `The UPI ID "${vpa}" is not registered or is not currently accepting payments.\n\nThis QR code may be outdated. Please ask the merchant for an updated payment QR or try a different payment method.`,
              [{ text: "OK" }]
            );
            return;
          }
          // valid === true: show merchant name as a trust signal if it differs from QR data
          if (check.valid === true && check.customerName) {
            const qrName = parsedPayment?.recipientName?.trim() ?? "";
            const resolvedName = check.customerName.trim();
            // Names differ significantly — warn but still allow
            if (
              qrName &&
              resolvedName &&
              resolvedName.toLowerCase() !== qrName.toLowerCase() &&
              !resolvedName.toLowerCase().includes(qrName.toLowerCase().slice(0, 4))
            ) {
              await new Promise<void>((resolve) => {
                Alert.alert(
                  "Merchant Name Mismatch",
                  `QR shows: "${qrName}"\nUPI registered as: "${resolvedName}"\n\nVerify with the merchant before paying.`,
                  [
                    { text: "Cancel", style: "cancel", onPress: () => resolve() },
                    { text: "Continue Anyway", onPress: () => resolve() },
                  ]
                );
              });
            }
          }
          // valid === null: validation unavailable — proceed silently
        } finally {
          setPaymentValidating(false);
        }
      }
    }

    // ── Build links and open payment app ─────────────────────────────────────
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

  // ── Other handlers ───────────────────────────────────────────────────────────

  async function handleOpenContent() {
    if (!content) return;
    if (contentType === "payment") {
      handleOpenPayment(content);
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
    paymentValidating,
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
