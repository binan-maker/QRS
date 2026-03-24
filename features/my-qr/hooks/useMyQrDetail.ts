import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Platform, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserGeneratedQrs, updateQrDesign, setQrActiveState,
  subscribeToComments, addComment, ownerHideComment, softDeleteComment,
  getGuardLink, updateGuardLinkDestination,
  getQrFollowersList, getQrFollowCount,
  type GeneratedQrItem, type CommentItem, type GuardLink, type FollowerInfo,
} from "@/lib/firestore-service";

export type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export const FG_COLORS = [
  { color: "#0A0E17", label: "Dark" },
  { color: "#1e3a5f", label: "Navy" },
  { color: "#7C3AED", label: "Purple" },
  { color: "#10B981", label: "Green" },
  { color: "#EF4444", label: "Red" },
  { color: "#F59E0B", label: "Amber" },
  { color: "#000000", label: "Black" },
];

export const BG_COLORS = [
  { color: "#F8FAFC", label: "Light" },
  { color: "#FFFFFF", label: "White" },
  { color: "#E0F2FE", label: "Sky" },
  { color: "#FEF3C7", label: "Cream" },
  { color: "#F0FDF4", label: "Mint" },
];

export const LOGO_POSITIONS: { key: LogoPosition; label: string }[] = [
  { key: "center", label: "Center" },
  { key: "top-left", label: "Top Left" },
  { key: "top-right", label: "Top Right" },
  { key: "bottom-left", label: "Bot. Left" },
  { key: "bottom-right", label: "Bot. Right" },
];

export function useMyQrDetail(id: string) {
  const { user } = useAuth();
  const svgRef = useRef<any>(null);
  const commentInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<any>(null);

  const [qrItem, setQrItem] = useState<GeneratedQrItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [fgColor, setFgColor] = useState("#0A0E17");
  const [bgColor, setBgColor] = useState("#F8FAFC");
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("center");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [designDirty, setDesignDirty] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const [togglingActive, setTogglingActive] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivationMsgInput, setDeactivationMsgInput] = useState("");

  const [guardLink, setGuardLink] = useState<GuardLink | null>(null);
  const [editingDestination, setEditingDestination] = useState(false);
  const [newDestination, setNewDestination] = useState("");
  const [savingDestination, setSavingDestination] = useState(false);

  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followCount, setFollowCount] = useState(0);

  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [customColorTarget, setCustomColorTarget] = useState<"fg" | "bg">("fg");
  const [customColorInput, setCustomColorInput] = useState("");

  const [sharingQr, setSharingQr] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadQr = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const all = await getUserGeneratedQrs(user.id);
      const found = all.find((q) => q.docId === id);
      if (found) {
        setQrItem(found);
        setFgColor(found.fgColor || "#0A0E17");
        setBgColor(found.bgColor || "#F8FAFC");
        setLogoPosition((found.logoPosition as LogoPosition) || "center");
        setLogoUri(found.logoUri || null);
      }
    } catch {}
    setLoading(false);
  }, [user?.id, id]);

  useEffect(() => { loadQr(); }, [loadQr]);

  useEffect(() => {
    if (!qrItem?.qrCodeId) return;
    setCommentsLoading(true);
    const unsub = subscribeToComments(qrItem.qrCodeId, 200, (list) => {
      setComments(list);
      setCommentsLoading(false);
    });
    return unsub;
  }, [qrItem?.qrCodeId]);

  useEffect(() => {
    if (!qrItem?.guardUuid) { setGuardLink(null); return; }
    getGuardLink(qrItem.guardUuid).then((link) => {
      setGuardLink(link);
      if (link) setNewDestination(link.currentDestination);
    });
  }, [qrItem?.guardUuid]);

  useEffect(() => {
    if (!qrItem?.qrCodeId) return;
    getQrFollowCount(qrItem.qrCodeId).then(setFollowCount).catch(() => {});
  }, [qrItem?.qrCodeId]);

  async function handleLoadFollowers() {
    if (!qrItem?.qrCodeId) return;
    setFollowersLoading(true);
    try {
      const list = await getQrFollowersList(qrItem.qrCodeId);
      setFollowersList(list);
    } catch {}
    setFollowersLoading(false);
  }

  function applyCustomColor() {
    let hex = customColorInput.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      Alert.alert("Invalid color", "Please enter a valid hex color (e.g. #FF5500)");
      return;
    }
    if (customColorTarget === "fg") setFgColor(hex);
    else setBgColor(hex);
    setDesignDirty(true);
    setCustomColorOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleUpdateDestination() {
    if (!user || !qrItem?.guardUuid || !newDestination.trim()) return;
    const dest = newDestination.trim().startsWith("http") ? newDestination.trim() : `https://${newDestination.trim()}`;
    setSavingDestination(true);
    try {
      await updateGuardLinkDestination(qrItem.guardUuid, dest, user.id);
      const refreshed = await getGuardLink(qrItem.guardUuid);
      setGuardLink(refreshed);
      setNewDestination(refreshed?.currentDestination || dest);
      setEditingDestination(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Updated!", "Destination changed. Scanners will see a 24-hour caution notice while trust rebuilds.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update destination. Try again.");
    } finally {
      setSavingDestination(false);
    }
  }

  async function handleSaveDesign() {
    if (!user || !qrItem) return;
    setSaving(true);
    try {
      await updateQrDesign(user.id, qrItem.docId, { fgColor, bgColor, logoPosition, logoUri: null });
      setDesignDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Design updated successfully.");
    } catch {
      Alert.alert("Error", "Could not save design. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitComment() {
    if (!user || !qrItem?.qrCodeId || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await addComment(qrItem.qrCodeId, user.id, user.displayName, commentText.trim(), replyTo?.id || null, user.emailVerified ?? false);
      setCommentText("");
      setReplyTo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not post comment.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleModerateComment(commentId: string, commentUserId: string) {
    if (!user || !qrItem?.qrCodeId) return;
    const isOwn = user.id === commentUserId;
    Alert.alert(
      isOwn ? "Delete comment?" : "Remove comment?",
      isOwn ? "This cannot be undone." : "This will hide the comment from everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isOwn ? "Delete" : "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              if (isOwn) await softDeleteComment(qrItem.qrCodeId, commentId, user.id);
              else await ownerHideComment(qrItem.qrCodeId, commentId);
            } catch {
              Alert.alert("Error", "Could not remove comment.");
            }
          },
        },
      ]
    );
  }

  async function handleToggleActive(newState: boolean) {
    if (!user || !qrItem?.qrCodeId) return;
    if (qrItem.qrType === "government") {
      Alert.alert("Permanent QR", "Government QR codes cannot be deactivated.");
      return;
    }
    if (!newState) {
      setDeactivationMsgInput(qrItem.deactivationMessage || "");
      setDeactivateModalOpen(true);
      return;
    }
    setTogglingActive(true);
    try {
      await setQrActiveState(qrItem.qrCodeId, user.id, true, null);
      setQrItem({ ...qrItem, isActive: true, deactivationMessage: null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update QR code.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!user || !qrItem?.qrCodeId) return;
    setDeactivateModalOpen(false);
    setTogglingActive(true);
    try {
      await setQrActiveState(qrItem.qrCodeId, user.id, false, deactivationMsgInput.trim() || null);
      setQrItem({ ...qrItem, isActive: false, deactivationMessage: deactivationMsgInput.trim() || null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update QR code.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleCopyContent() {
    if (qrItem?.content) {
      await Clipboard.setStringAsync(qrItem.content);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied!", "QR content copied to clipboard.");
    }
  }

  async function handleShare() {
    if (sharingQr) return;
    if (!svgRef.current || typeof svgRef.current.toDataURL !== "function") {
      Alert.alert("Not ready", "QR code is still loading. Please wait a moment and try again.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Sharing is not available on web. Long-press the QR image to save it.");
      return;
    }
    setSharingQr(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("QR image timed out. Please try again.")), 8000);
        try {
          svgRef.current.toDataURL((url: string | null | undefined) => {
            clearTimeout(timer);
            if (!url || typeof url !== "string") {
              reject(new Error("Could not generate QR image. Please try again."));
            } else {
              resolve(url);
            }
          });
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      });
      const rawBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      if (!rawBase64) throw new Error("Could not generate QR image. Please try again.");
      const fileName = `qrguard_${Date.now()}.png`;
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
      const fileUri = dir + fileName;
      await FileSystem.writeAsStringAsync(fileUri, rawBase64, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Not available", "Sharing is not supported on this device.");
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: "Share QR Code", UTI: "public.png" });
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (e: any) {
      Alert.alert("Share Failed", e?.message || "Could not share the QR code. Please try again.");
    } finally {
      setSharingQr(false);
    }
  }

  async function handleDownloadPdf() {
    if (!svgRef.current || downloadingPdf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "PDF download is not available on web. Long-press the QR image to save it.");
      return;
    }
    setDownloadingPdf(true);
    let pdfUri: string | null = null;
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        try {
          svgRef.current.toDataURL((url: string) => {
            if (!url) reject(new Error("No image data returned"));
            else resolve(url);
          });
        } catch (e) {
          reject(e);
        }
      });
      const imgSrc = dataUrl.startsWith("data:") ? dataUrl : `data:image/png;base64,${dataUrl}`;
      const label = qrItem?.content ? (qrItem.content.length > 60 ? qrItem.content.slice(0, 57) + "…" : qrItem.content) : "QR Code";
      const createdStr = qrItem?.createdAt ? new Date(qrItem.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #ffffff; font-family: Arial, sans-serif; }
      .container { text-align: center; padding: 48px 40px; max-width: 420px; }
      .logo-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px; }
      .logo-text { font-size: 15px; font-weight: 700; color: #0A0E17; letter-spacing: 0.5px; }
      .qr-wrap { background: #f8fafc; border-radius: 20px; padding: 24px; display: inline-block; border: 1px solid #e2e8f0; margin-bottom: 24px; }
      img { width: 240px; height: 240px; display: block; }
      .label { font-size: 13px; color: #64748b; word-break: break-all; max-width: 300px; margin: 0 auto 6px; line-height: 1.5; }
      .date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
      .footer { margin-top: 28px; font-size: 10px; color: #cbd5e1; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo-row">
        <span class="logo-text">QR Guard</span>
      </div>
      <div class="qr-wrap">
        <img src="${imgSrc}" alt="QR Code" />
      </div>
      <p class="label">${label}</p>
      ${createdStr ? `<p class="date">Created ${createdStr}</p>` : ""}
      <p class="footer">Generated by QR Guard &bull; Scan to verify safety</p>
    </div>
  </body>
</html>`;
      const result = await Print.printToFileAsync({ html, base64: false });
      pdfUri = result.uri;
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Not available", "Could not save PDF on this device.");
        return;
      }
      await Sharing.shareAsync(pdfUri, { mimeType: "application/pdf", dialogTitle: "Save QR Code as PDF", UTI: "com.adobe.pdf" });
    } catch (e: any) {
      Alert.alert("PDF Failed", e?.message || "Could not generate the PDF. Please try again.");
    } finally {
      if (pdfUri) {
        FileSystem.deleteAsync(pdfUri, { idempotent: true }).catch(() => {});
      }
      setDownloadingPdf(false);
    }
  }

  const topLevelComments = comments.filter((c) => !c.parentId);

  function getAllDescendants(parentId: string): CommentItem[] {
    const result: CommentItem[] = [];
    const queue = [parentId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const children = comments.filter((c) => c.parentId === curr);
      children.forEach((child) => {
        result.push(child);
        queue.push(child.id);
      });
    }
    return result;
  }

  function openFollowers() {
    handleLoadFollowers();
    setFollowersModalOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return {
    user, svgRef, commentInputRef, scrollRef,
    qrItem, loading,
    fgColor, setFgColor, bgColor, setBgColor,
    logoPosition, setLogoPosition, logoUri,
    saving, designDirty, setDesignDirty, designOpen, setDesignOpen,
    comments, commentsLoading, commentText, setCommentText,
    replyTo, setReplyTo, submittingComment,
    expandedReplies, setExpandedReplies,
    togglingActive, deactivateModalOpen, setDeactivateModalOpen,
    deactivationMsgInput, setDeactivationMsgInput,
    guardLink, editingDestination, setEditingDestination,
    newDestination, setNewDestination, savingDestination,
    followersList, followersModalOpen, setFollowersModalOpen,
    followersLoading, followCount,
    customColorOpen, setCustomColorOpen,
    customColorTarget, setCustomColorTarget,
    customColorInput, setCustomColorInput,
    topLevelComments, getAllDescendants,
    handleLoadFollowers, applyCustomColor, handleUpdateDestination,
    handleSaveDesign, handleSubmitComment, handleModerateComment,
    handleToggleActive, handleConfirmDeactivate, handleCopyContent,
    handleShare, handleDownloadPdf, sharingQr, downloadingPdf,
    openFollowers,
  };
}
