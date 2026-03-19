import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
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
    openFollowers,
  };
}
