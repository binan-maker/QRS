import { useState, useCallback } from "react";
import { Alert, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrData, type QrDetail } from "./useQrData";
import { calculateTrustScore } from "@/lib/services/trust-service";
import { useQrSafety } from "./useQrSafety";
import { useQrReports } from "./useQrReports";
import { useQrFollow } from "./useQrFollow";
import { useQrFavorite } from "./useQrFavorite";
import { useQrComments, type CommentItem } from "./useQrComments";
import { useQrOwner } from "./useQrOwner";

export type { QrDetail, CommentItem };

export function useQrDetail(id: string) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const userId = user?.id ?? null;
  const [copied, setCopied] = useState(false);

  const data = useQrData(id, userId);
  const content = data.qrCode?.content || data.offlineContent;
  const contentType = data.qrCode?.contentType || data.offlineContentType;

  const safety = useQrSafety(content, contentType);
  const reports = useQrReports(id, userId, data.offlineMode, data.isQrOwner);
  const follow = useQrFollow(id, userId, user?.displayName ?? null);
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
    return { score: fallback.score, label: fallback.label, color: getTrustColor(fallback.label), manipulationWarning: false };
  }

  function getCombinedVerdict() {
    const { offlineBlacklistMatch, paymentSafety, urlSafety, instantVerdict } = safety;
    const trust = getTrustInfo();

    if (offlineBlacklistMatch.matched) {
      return { level: "dangerous" as const, label: "DANGEROUS", reason: offlineBlacklistMatch.reason ?? "Known scam pattern", color: colors.danger };
    }

    const isCommunityAvailable = trust.score >= 0;

    if (isCommunityAvailable) {
      if (trust.label === "Trusted" || trust.label === "Likely Safe") {
        if (paymentSafety?.isSuspicious || urlSafety?.isSuspicious) {
          return { level: "caution" as const, label: "CAUTION", reason: "Community trusts it, but local analysis found risks", color: colors.warning };
        }
        return { level: "safe" as const, label: "SAFE", reason: `${Math.round(trust.score)}% community trust`, color: colors.safe };
      }
      if (trust.label === "Caution" || trust.label === "Uncertain") {
        return { level: "caution" as const, label: "CAUTION", reason: "Mixed community reports", color: colors.warning };
      }
      if (trust.label === "Dangerous" || trust.label === "Suspicious") {
        return { level: "dangerous" as const, label: "DANGEROUS", reason: "Flagged by the community", color: colors.danger };
      }
    }

    if (instantVerdict.level === "dangerous") {
      return { level: "dangerous" as const, label: "DANGEROUS", reason: instantVerdict.reason ?? "Threat detected", color: colors.danger };
    }
    if (instantVerdict.level === "caution") {
      return { level: "caution" as const, label: "CAUTION", reason: instantVerdict.reason ?? "Proceed carefully", color: colors.warning };
    }
    // Default: local analysis found no threats — show SAFE immediately.
    // Community data will silently update this verdict when it arrives.
    return { level: "safe" as const, label: "SAFE", reason: "No threats detected", color: colors.safe };
  }

  function buildUpiUrl(parsedPayment: NonNullable<typeof safety.parsedPayment>): string | null {
    const { vpa, recipientName, amount, currency } = parsedPayment;
    if (!vpa) return null;
    let url = `upi://pay?pa=${encodeURIComponent(vpa)}`;
    if (recipientName) url += `&pn=${encodeURIComponent(recipientName)}`;
    if (amount && parseFloat(amount) > 0) url += `&am=${amount}&cu=${currency || "INR"}`;
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

  function handleOpenContent() {
    if (!content) return;
    const lower = content.toLowerCase();

    if (contentType === "payment") {
      handleOpenPayment(content);
    } else if (contentType === "url") {
      const url = lower.startsWith("http") ? content : `https://${content}`;
      Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link"));
    } else if (contentType === "location") {
      let mapsUrl = content;
      if (lower.startsWith("geo:")) {
        const afterGeo = content.slice(4);
        const coords = afterGeo.split("?")[0];
        const qParam = afterGeo.includes("q=") ? afterGeo.split("q=")[1]?.split("&")[0] : "";
        mapsUrl = qParam
          ? `https://maps.google.com/?q=${encodeURIComponent(qParam)}`
          : `https://maps.google.com/?q=${coords}`;
      } else if (lower.startsWith("comgooglemaps://")) {
        mapsUrl = content.replace("comgooglemaps://", "https://maps.google.com/");
      } else if (!lower.startsWith("http")) {
        mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(content)}`;
      }
      Linking.openURL(mapsUrl).catch(() =>
        Alert.alert("Error", "Could not open Maps. Make sure a maps app is installed.")
      );
    } else if (contentType === "phone") {
      const cleaned = content.replace(/^(tel:|callto:|facetime:)/i, "");
      Linking.openURL(`tel:${cleaned}`).catch(() => Alert.alert("Error", "Could not make call"));
    } else if (contentType === "email") {
      const emailUrl = lower.startsWith("mailto:") ? content : `mailto:${content}`;
      Linking.openURL(emailUrl).catch(() => Alert.alert("Error", "Could not open email app"));
    } else if (contentType === "sms") {
      const smsUrl = lower.startsWith("sms:") || lower.startsWith("smsto:") ? content : `sms:${content}`;
      Linking.openURL(smsUrl).catch(() => Alert.alert("Error", "Could not open SMS app"));
    } else if (contentType === "social") {
      const isHttpUrl = lower.startsWith("http://") || lower.startsWith("https://");
      const isDeepLink = !isHttpUrl && content.includes("://");
      if (isDeepLink) {
        Linking.openURL(content).catch(() => {
          const httpFallback = `https://${content.split("://").slice(1).join("://")}`;
          Linking.openURL(httpFallback).catch(() =>
            Alert.alert("App Not Found", "Could not open this social profile. Make sure the app is installed.")
          );
        });
      } else {
        const socialUrl = isHttpUrl ? content : `https://${content}`;
        Linking.openURL(socialUrl).catch(() => Alert.alert("Error", "Could not open social profile"));
      }
    } else if (contentType === "app" || contentType === "otp") {
      Linking.openURL(content).catch(() => Alert.alert("App Not Found", "Could not open the link. Make sure the required app is installed."));
    } else if (contentType === "media" || contentType === "document") {
      const mediaUrl = lower.startsWith("http") ? content : `https://${content}`;
      Linking.openURL(mediaUrl).catch(() => Alert.alert("Error", "Could not open link"));
    } else {
      if (lower.startsWith("http://") || lower.startsWith("https://")) {
        Linking.openURL(content).catch(() => Alert.alert("Error", "Could not open link"));
      }
    }
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
    return comments.handleSubmitComment(user?.displayName || "User");
  }

  return {
    user,
    ...data,
    ...safety,
    ...reports,
    ...follow,
    ...favorite,
    ...comments,
    ...owner,
    copied,
    getTrustInfo,
    getCombinedVerdict,
    handleOpenContent,
    handleCopyContent,
    handleToggleFavorite,
    handleToggleFollow,
    handleSubmitComment,
  };
}
