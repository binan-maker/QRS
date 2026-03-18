import { useState, useCallback } from "react";
import { Alert, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
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
      case "Trusted": case "Likely Safe": return Colors.dark.safe;
      case "Caution": case "Uncertain": return Colors.dark.warning;
      case "Dangerous": case "Suspicious": return Colors.dark.danger;
      default: return Colors.dark.textMuted;
    }
  }

  function getTrustInfo() {
    const { trustScore, reportCounts } = reports;
    if (trustScore && trustScore.score >= 0) {
      return { score: trustScore.score, label: trustScore.label, color: getTrustColor(trustScore.label) };
    }
    const total = (reportCounts.safe || 0) + (reportCounts.scam || 0) + (reportCounts.fake || 0) + (reportCounts.spam || 0);
    if (total === 0) return { score: -1, label: "No Reports", color: Colors.dark.textMuted };
    const safeRatio = (reportCounts.safe || 0) / total;
    if (safeRatio >= 0.7) return { score: safeRatio * 100, label: "Trusted", color: Colors.dark.safe };
    if (safeRatio >= 0.4) return { score: safeRatio * 100, label: "Caution", color: Colors.dark.warning };
    return { score: safeRatio * 100, label: "Dangerous", color: Colors.dark.danger };
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
    if (contentType === "url") {
      Linking.openURL(content).catch(() => Alert.alert("Error", "Could not open link"));
    } else if (contentType === "payment") {
      handleOpenPayment(content);
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
    handleOpenContent,
    handleCopyContent,
    handleToggleFavorite,
    handleToggleFollow,
    handleSubmitComment,
  };
}
