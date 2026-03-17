import { useEffect, useState, useCallback, useRef } from "react";
import { Alert, Linking, Platform } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DocumentSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/lib/use-network";
import {
  loadQrDetail,
  getComments,
  reportQrCode,
  toggleFavorite,
  toggleFollow,
  addComment,
  toggleCommentLike,
  reportComment,
  softDeleteComment,
  subscribeToQrStats,
  subscribeToQrReports,
  subscribeToComments,
  getCommentUserLikes,
  calculateTrustScore,
  getQrOwnerInfo,
  getQrFollowersList,
  sendMessageToQrOwner,
  subscribeToQrMessages,
  markQrMessageRead,
  getScanVelocity,
  submitVerificationRequest,
  getVerificationStatus,
  type QrOwnerInfo,
  type FollowerInfo,
  type QrMessage,
  type ScanVelocityBucket,
  type VerificationStatus,
} from "@/lib/firestore-service";
import {
  parseAnyPaymentQr,
  analyzeAnyPaymentQr,
  analyzeUrlHeuristics,
  loadOfflineBlacklist,
  checkOfflineBlacklist,
  type ParsedPaymentQr,
  type PaymentSafetyResult,
  type UrlSafetyResult,
} from "@/lib/qr-analysis";
import Colors from "@/constants/colors";

export interface QrDetail {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  isBranded?: boolean;
  signature?: string;
  ownerId?: string;
  ownerName?: string;
}

export interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userLike: "like" | "dislike" | null;
  user: { displayName: string };
  parentId?: string | null;
  userId?: string;
  isDeleted?: boolean;
  isHidden?: boolean;
  reportCount?: number;
  userUsername?: string;
  userPhotoURL?: string;
}

const COMMENTS_PER_PAGE = 20;
const REPLIES_PER_PAGE = 10;

export function useQrDetail(id: string) {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();

  const [qrCode, setQrCode] = useState<QrDetail | null>(null);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [totalScans, setTotalScans] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [userReport, setUserReport] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [trustScore, setTrustScore] = useState<any>(null);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, "like" | "dislike">>({});
  const lastCommentRef = useRef<DocumentSnapshot | undefined>(undefined);
  const commentInputRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);
  const [followPressedIn, setFollowPressedIn] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; rootId: string; isNested: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineContent, setOfflineContent] = useState<string | null>(null);
  const [offlineContentType, setOfflineContentType] = useState<string>("text");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [commentMenuOwner, setCommentMenuOwner] = useState(false);
  const [commentReportModal, setCommentReportModal] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});
  const [revealedComments, setRevealedComments] = useState<Set<string>>(new Set());
  const [ownerInfo, setOwnerInfo] = useState<QrOwnerInfo | null>(null);
  const [isQrOwner, setIsQrOwner] = useState(false);
  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [messages, setMessages] = useState<QrMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [scanVelocity, setScanVelocity] = useState<ScanVelocityBucket[]>([]);
  const [velocityLoading, setVelocityLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({ status: "none" });
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyBizName, setVerifyBizName] = useState("");
  const [verifyDocBase64, setVerifyDocBase64] = useState<string | null>(null);
  const [verifyDocName, setVerifyDocName] = useState<string | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [parsedPayment, setParsedPayment] = useState<ParsedPaymentQr | null>(null);
  const [paymentSafety, setPaymentSafety] = useState<PaymentSafetyResult | null>(null);
  const [urlSafety, setUrlSafety] = useState<UrlSafetyResult | null>(null);
  const [offlineBlacklistMatch, setOfflineBlacklistMatch] = useState<{ matched: boolean; reason: string | null }>({ matched: false, reason: null });

  const topLevelComments = commentsList.filter((c) => !c.parentId);

  function getAllDescendants(rootId: string): CommentItem[] {
    const result: CommentItem[] = [];
    const queue = [rootId];
    while (queue.length > 0) {
      const pid = queue.shift()!;
      const children = commentsList.filter((c) => c.parentId === pid);
      result.push(...children);
      queue.push(...children.map((c) => c.id));
    }
    return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  function getRootCommentId(commentId: string): string {
    const comment = commentsList.find((c) => c.id === commentId);
    if (!comment || !comment.parentId) return commentId;
    return getRootCommentId(comment.parentId);
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
    if (!visibleRepliesCount[commentId]) {
      setVisibleRepliesCount((prev) => ({ ...prev, [commentId]: REPLIES_PER_PAGE }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function showMoreReplies(commentId: string) {
    setVisibleRepliesCount((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] || REPLIES_PER_PAGE) + REPLIES_PER_PAGE,
    }));
  }

  function getTrustColor(label: string) {
    switch (label) {
      case "Trusted": case "Likely Safe": return Colors.dark.safe;
      case "Caution": case "Uncertain": return Colors.dark.warning;
      case "Dangerous": case "Suspicious": return Colors.dark.danger;
      default: return Colors.dark.textMuted;
    }
  }

  function getTrustInfo() {
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

  async function loadOfflineFallback() {
    try {
      const raw = await AsyncStorage.getItem(`qr_content_${id}`);
      if (raw) {
        const { content, contentType } = JSON.parse(raw);
        setOfflineContent(content);
        setOfflineContentType(contentType || "text");
      }
    } catch {}
  }

  useEffect(() => {
    if (!user || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, user.id).then((likes) => {
      setUserLikes((prev) => ({ ...prev, ...likes }));
    });
  }, [commentsList, user?.id, id]);

  useEffect(() => {
    setLoadError(false);
    setOfflineMode(false);
    loadQrDetail(id, user?.id || null)
      .then(async (detail) => {
        if (!detail) {
          if (!isOnline) {
            setOfflineMode(true);
            await loadOfflineFallback();
            setLoading(false);
            return;
          }
          setLoadError(true);
          setLoading(false);
          return;
        }
        setQrCode(detail.qrCode);
        setReportCounts(detail.reportCounts || {});
        setTotalScans(detail.totalScans || 0);
        setTotalComments(detail.totalComments || 0);
        setIsFavorite(detail.isFavorite || false);
        setIsFollowing(detail.isFollowing || false);
        setFollowCount(detail.followCount || 0);
        setTrustScore(detail.trustScore || null);
        if (detail.userReport) setUserReport(detail.userReport);
        try {
          await AsyncStorage.setItem(`qr_content_${id}`, JSON.stringify({
            content: detail.qrCode.content,
            contentType: detail.qrCode.contentType,
          }));
        } catch {}
        try {
          const owner = await getQrOwnerInfo(id);
          if (owner) {
            setOwnerInfo(owner);
            setIsQrOwner(user?.id === owner.ownerId);
          }
        } catch {}
        setLoading(false);
      })
      .catch(async () => {
        setOfflineMode(true);
        await loadOfflineFallback();
        setLoading(false);
      });
  }, [id, user?.id]);

  useEffect(() => {
    if (!isQrOwner || !user || !ownerInfo) return;
    const unsub = subscribeToQrMessages(user.id, id, (msgs) => {
      setMessages(msgs);
      setUnreadMessages(msgs.filter((m) => !m.read).length);
    });
    return unsub;
  }, [isQrOwner, user?.id, id, ownerInfo]);

  useEffect(() => {
    if (!isQrOwner || !user) return;
    setVelocityLoading(true);
    getScanVelocity(id)
      .then((v) => setScanVelocity(v))
      .finally(() => setVelocityLoading(false));
    getVerificationStatus(user.id, id).then(setVerificationStatus);
  }, [isQrOwner, user?.id, id]);

  useEffect(() => {
    if (offlineMode) return;
    const unsub = subscribeToQrStats(id, ({ scanCount, commentCount }) => {
      setTotalScans(scanCount);
      setTotalComments(commentCount);
    });
    return unsub;
  }, [id, offlineMode]);

  useEffect(() => {
    if (offlineMode) return;
    const unsub = subscribeToQrReports(id, (counts) => {
      setReportCounts(counts);
      setTrustScore(calculateTrustScore(counts));
    });
    return unsub;
  }, [id, offlineMode]);

  useEffect(() => {
    if (offlineMode) return;
    const pageLimit = user ? COMMENTS_PER_PAGE : 6;
    const unsub = subscribeToComments(id, pageLimit, (liveComments) => {
      setCommentsList(liveComments);
    });
    return unsub;
  }, [id, user?.id, offlineMode]);

  useEffect(() => {
    if (replyTo) {
      const t = setTimeout(() => commentInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [replyTo]);

  useEffect(() => {
    const content = qrCode?.content || offlineContent;
    const contentType = qrCode?.contentType || offlineContentType;
    if (!content) return;
    (async () => {
      const blacklist = await loadOfflineBlacklist();
      const blMatch = checkOfflineBlacklist(content, blacklist);
      setOfflineBlacklistMatch(blMatch);
      if (contentType === "payment") {
        const parsed = parseAnyPaymentQr(content);
        if (parsed) {
          setParsedPayment(parsed);
          setPaymentSafety(analyzeAnyPaymentQr(parsed));
        }
      }
      if (contentType === "url") {
        try {
          const result = analyzeUrlHeuristics(content);
          setUrlSafety(result);
        } catch {}
      }
    })();
  }, [qrCode?.content, offlineContent, qrCode?.contentType, offlineContentType]);

  const loadMoreComments = useCallback(async () => {
    if (commentsLoading || !hasMoreComments) return;
    setCommentsLoading(true);
    try {
      const result = await getComments(id, COMMENTS_PER_PAGE, lastCommentRef.current);
      setCommentsList((prev) => [...prev, ...result.comments]);
      if (result.lastDoc) lastCommentRef.current = result.lastDoc;
      setHasMoreComments(result.hasMore);
    } catch {}
    setCommentsLoading(false);
  }, [id, commentsLoading, hasMoreComments]);

  async function handleReport(type: string) {
    if (!user) { router.push("/(auth)/login"); return; }
    setReportLoading(type);
    try {
      await reportQrCode(id, user.id, type);
      setUserReport(type);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setReportLoading(null);
    }
  }

  async function handleToggleFavorite() {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!qrCode) return;
    setFavoriteLoading(true);
    try {
      const newFav = await toggleFavorite(id, user.id, qrCode.content, qrCode.contentType);
      setIsFavorite(newFav);
      Haptics.impactAsync(newFav ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFavoriteLoading(false);
  }

  async function handleToggleFollow() {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!qrCode) return;
    setFollowLoading(true);
    try {
      const result = await toggleFollow(id, user.id, qrCode.content, qrCode.contentType, user.displayName);
      setIsFollowing(result.isFollowing);
      setFollowCount(result.followCount);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFollowLoading(false);
  }

  async function handleSubmitComment() {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const parentId = replyTo ? replyTo.rootId : null;
      await addComment(id, user.id, user.displayName, newComment.trim(), parentId);
      if (parentId) {
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      }
      setNewComment("");
      setReplyTo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCommentLike(commentId: string, action: "like" | "dislike") {
    if (!user) { router.push("/(auth)/login"); return; }
    const prevLike = userLikes[commentId] ?? null;
    const newLike: "like" | "dislike" | null = prevLike === action ? null : action;
    setUserLikes((prev) => {
      const next = { ...prev };
      if (newLike === null) delete next[commentId];
      else next[commentId] = newLike;
      return next;
    });
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        let likes = c.likeCount;
        let dislikes = c.dislikeCount;
        if (action === "like") {
          likes = newLike === "like" ? likes + 1 : likes - 1;
          if (prevLike === "dislike") dislikes = Math.max(0, dislikes - 1);
        } else {
          dislikes = newLike === "dislike" ? dislikes + 1 : dislikes - 1;
          if (prevLike === "like") likes = Math.max(0, likes - 1);
        }
        return { ...c, likeCount: likes, dislikeCount: dislikes };
      })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const data = await toggleCommentLike(id, commentId, user.id, action === "like");
      setCommentsList((prev) =>
        prev.map((c) => c.id !== commentId ? c : { ...c, likeCount: data.likes, dislikeCount: data.dislikes })
      );
    } catch {}
  }

  async function handleCommentReport(commentId: string, reason: string) {
    setCommentReportModal(null);
    if (!user) return;
    try {
      await reportComment(id, commentId, user.id, reason);
      Alert.alert("Reported", "Thank you. We'll review this comment.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  async function handleDeleteComment(commentId: string) {
    if (!user) return;
    setCommentMenuId(null);
    setDeletingCommentId(commentId);
    try {
      await softDeleteComment(id, commentId, user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function handleLoadFollowers() {
    setFollowersLoading(true);
    try {
      const list = await getQrFollowersList(id);
      setFollowersList(list);
    } catch {}
    setFollowersLoading(false);
  }

  async function handleSendMessage() {
    if (!user || !ownerInfo || !messageText.trim()) return;
    if (user.id === ownerInfo.ownerId) {
      Alert.alert("Notice", "You can't message yourself as the owner.");
      return;
    }
    setSendingMessage(true);
    try {
      await sendMessageToQrOwner(
        user.id, user.displayName, ownerInfo.ownerId, id,
        ownerInfo.brandedUuid, messageText.trim()
      );
      setMessageText("");
      Alert.alert("Sent!", "Your message was delivered to the QR code owner.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send message.");
    } finally {
      setSendingMessage(false);
    }
  }

  async function handlePickVerifyDoc() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setVerifyDocBase64(asset.base64 || null);
    const parts = asset.uri.split("/");
    setVerifyDocName(parts[parts.length - 1]);
  }

  async function handleVerifySubmit() {
    if (!user || !verifyBizName.trim() || !verifyDocBase64) return;
    setVerifySubmitting(true);
    try {
      await submitVerificationRequest(user.id, id, verifyBizName.trim(), verifyDocBase64);
      setVerificationStatus({ status: "pending", businessName: verifyBizName.trim() });
      setVerifyModalOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Request Submitted",
        "Your verification request has been submitted for review. We'll update your badge status within 1-3 business days."
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not submit verification request.");
    } finally {
      setVerifySubmitting(false);
    }
  }

  function handleOpenContent() {
    const content = qrCode?.content || offlineContent;
    if (!content) return;
    const ct = qrCode?.contentType || offlineContentType;
    if (ct === "url") {
      Linking.openURL(content).catch(() => Alert.alert("Error", "Could not open link"));
    } else if (ct === "payment") {
      handleOpenPayment(content);
    }
  }

  async function handleOpenPayment(content: string) {
    if (!content) return;
    const linksToTry: string[] = [];
    const lower = content.toLowerCase();
    if (parsedPayment) {
      const cat = parsedPayment.appCategory;
      if (cat === "upi_india") {
        if (lower.startsWith("upi://")) {
          linksToTry.push(content);
        } else if (lower.startsWith("tez://upi/") || lower.startsWith("gpay://upi/")) {
          linksToTry.push("upi://" + content.split("upi/")[1], content);
        } else {
          linksToTry.push(content);
          if (content.includes("?")) linksToTry.push("upi://pay?" + content.split("?")[1]);
        }
      } else if (cat === "crypto") {
        linksToTry.push(content);
      } else {
        linksToTry.push(content);
        if (!lower.startsWith("http") && !lower.startsWith("https")) {
          try { new URL("https://" + content); linksToTry.push("https://" + content); } catch {}
        }
      }
    } else {
      linksToTry.push(content);
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

  async function handleCopyContent() {
    const content = qrCode?.content || offlineContent;
    if (!content) return;
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return {
    user,
    qrCode,
    reportCounts,
    totalScans,
    totalComments,
    userReport,
    isFavorite,
    isFollowing,
    followCount,
    trustScore,
    commentsList,
    userLikes,
    hasMoreComments,
    newComment,
    setNewComment,
    replyTo,
    setReplyTo,
    loading,
    loadError,
    offlineMode,
    offlineContent,
    offlineContentType,
    commentsLoading,
    submitting,
    reportLoading,
    favoriteLoading,
    followLoading,
    commentMenuId,
    setCommentMenuId,
    commentMenuOwner,
    setCommentMenuOwner,
    commentReportModal,
    setCommentReportModal,
    deletingCommentId,
    expandedReplies,
    setExpandedReplies,
    visibleRepliesCount,
    revealedComments,
    setRevealedComments,
    ownerInfo,
    isQrOwner,
    followersList,
    followersModalOpen,
    setFollowersModalOpen,
    followersLoading,
    messagesModalOpen,
    setMessagesModalOpen,
    messages,
    markQrMessageRead: (msgId: string) => markQrMessageRead(msgId),
    messageText,
    setMessageText,
    sendingMessage,
    unreadMessages,
    scanVelocity,
    velocityLoading,
    verificationStatus,
    verifyModalOpen,
    setVerifyModalOpen,
    verifyBizName,
    setVerifyBizName,
    verifyDocBase64,
    verifyDocName,
    verifySubmitting,
    copied,
    parsedPayment,
    paymentSafety,
    urlSafety,
    offlineBlacklistMatch,
    followPressedIn,
    setFollowPressedIn,
    commentInputRef,
    scrollRef,
    topLevelComments,
    getAllDescendants,
    getRootCommentId,
    toggleReplies,
    showMoreReplies,
    getTrustInfo,
    loadMoreComments,
    handleReport,
    handleToggleFavorite,
    handleToggleFollow,
    handleSubmitComment,
    handleCommentLike,
    handleCommentReport,
    handleDeleteComment,
    handleLoadFollowers,
    handleSendMessage,
    handlePickVerifyDoc,
    handleVerifySubmit,
    handleOpenContent,
    handleCopyContent,
  };
}
