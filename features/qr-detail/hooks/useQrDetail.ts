import { useState, useCallback } from "react";
import { Alert, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrData, type QrDetail } from "./useQrData";
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
  const reports = useQrReports(id, userId, data.offlineMode);
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
    const total = (reportCounts.safe || 0) + (reportCounts.scam || 0) + (reportCounts.fake || 0) + (reportCounts.spam || 0);
    if (total === 0) return { score: -1, label: "No Reports", color: colors.textMuted, manipulationWarning: false };
    const safeRatio = (reportCounts.safe || 0) / total;
    if (safeRatio >= 0.7) return { score: safeRatio * 100, label: "Trusted", color: colors.safe, manipulationWarning: false };
    if (safeRatio >= 0.4) return { score: safeRatio * 100, label: "Caution", color: colors.warning, manipulationWarning: false };
    return { score: safeRatio * 100, label: "Dangerous", color: colors.danger, manipulationWarning: false };
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
    if (instantVerdict.level === "safe") {
      return { level: "safe" as const, label: "SAFE", reason: "No threats detected", color: colors.safe };
    }

    return { level: "unknown" as const, label: "UNKNOWN", reason: "Analysis in progress", color: colors.textMuted };
  }

  async function handleOpenPayment(rawContent: string) {
    const linksToTry: string[] = [];
    const lower = rawContent.toLowerCase();
    const { parsedPayment } = safety;
    if (parsedPayment) {
      const cat = parsedPayment.appCategory;
      if (cat === "upi_india") {
        if (lower.startsWith("upi://")) {
          linksToTry.push(rawContent);
        } else if (lower.startsWith("tez://upi/") || lower.startsWith("gpay://upi/")) {
          linksToTry.push("upi://" + rawContent.split("upi/")[1], rawContent);
        } else {
          linksToTry.push(rawContent);
          if (rawContent.includes("?")) linksToTry.push("upi://pay?" + rawContent.split("?")[1]);
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
