import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/lib/use-network";
import { formatCompactNumber, formatIndianNumber } from "@/lib/number-format";
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
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { DocumentSnapshot } from "firebase/firestore";
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

function smartName(name: string): string {
  if (!name) return "User";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (name.length <= 18) return name;
  if (first.length <= 18) return first;
  return first.substring(0, 16) + "…";
}

interface QrDetail {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
}

interface CommentItem {
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
  userUsername?: string;
  userPhotoURL?: string;
}

const REPORT_TYPES = [
  { key: "safe", label: "Safe", icon: "shield-checkmark", color: Colors.dark.safe, bg: Colors.dark.safeDim },
  { key: "scam", label: "Scam", icon: "warning", color: Colors.dark.danger, bg: Colors.dark.dangerDim },
  { key: "fake", label: "Fake", icon: "close-circle", color: Colors.dark.warning, bg: Colors.dark.warningDim },
  { key: "spam", label: "Spam", icon: "mail-unread", color: Colors.dark.accent, bg: Colors.dark.accentDim },
];

function getPaymentAppIcon(appId: string): string {
  switch (appId) {
    case "phonepe": return "phone-portrait-outline";
    case "gpay_india": return "logo-google";
    case "paytm": return "wallet-outline";
    case "bhim": return "shield-checkmark-outline";
    case "amazon_pay": return "cart-outline";
    case "paypal": return "card-outline";
    case "venmo": return "people-outline";
    case "cash_app": return "cash-outline";
    case "alipay": case "wechat_pay": return "globe-outline";
    case "bitcoin": case "ethereum": case "litecoin":
    case "solana": case "dogecoin": case "bnb": return "logo-bitcoin";
    case "mpesa": case "flutterwave": case "paystack": return "phone-portrait-outline";
    case "revolut": case "wise": case "swish_se": return "swap-horizontal-outline";
    case "grabpay": case "gopay": case "ovo": case "dana": return "phone-portrait-outline";
    case "kakaopay": case "toss": case "naverpay": return "phone-portrait-outline";
    case "paypay_jp": case "merpay": case "rakuten_pay": return "phone-portrait-outline";
    case "pix": return "flash-outline";
    case "mercado_pago": case "picpay": return "wallet-outline";
    default: return "card-outline";
  }
}

const COMMENT_REPORT_REASONS = [
  { label: "Sexual content", value: "sexual_content", icon: "alert-circle-outline" },
  { label: "Violent or repulsive content", value: "violent", icon: "warning-outline" },
  { label: "Hateful or abusive content", value: "hateful", icon: "hand-left-outline" },
  { label: "Harassment or bullying", value: "harassment", icon: "person-remove-outline" },
  { label: "Harmful or dangerous acts", value: "harmful", icon: "flame-outline" },
  { label: "Suicide, self-harm or eating disorders", value: "self_harm", icon: "heart-dislike-outline" },
  { label: "Misinformation", value: "misinformation", icon: "information-circle-outline" },
  { label: "Child abuse", value: "child_abuse", icon: "shield-outline" },
  { label: "Promotes terrorism", value: "terrorism", icon: "skull-outline" },
  { label: "Spam or misleading", value: "spam", icon: "mail-unread-outline" },
];

const COMMENTS_PER_PAGE = 20;
const REPLIES_PER_PAGE = 10;

function SkeletonBox({ width, height = 12, borderRadius = 8, style }: { width?: any; height?: number; borderRadius?: number; style?: any }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })), -1, true);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return <Animated.View style={[{ width: width || "100%", height, borderRadius, backgroundColor: Colors.dark.surfaceLight }, anim, style]} />;
}

function SkeletonCommentItem() {
  return (
    <View style={skeletonStyles.commentCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <SkeletonBox width={34} height={34} borderRadius={17} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width="50%" height={11} />
        </View>
      </View>
      <SkeletonBox height={11} style={{ marginBottom: 6 }} />
      <SkeletonBox width="75%" height={11} />
    </View>
  );
}

function LoadingSkeleton({ topInset }: { topInset: number }) {
  return (
    <View style={[skeletonStyles.container, { paddingTop: topInset }]}>
      <View style={skeletonStyles.navBar}>
        <SkeletonBox width={38} height={38} borderRadius={19} />
        <SkeletonBox width={100} height={16} borderRadius={8} style={{ marginHorizontal: "auto" }} />
        <SkeletonBox width={80} height={32} borderRadius={16} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} scrollEnabled={false}>
        <View style={skeletonStyles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SkeletonBox width={48} height={48} borderRadius={14} />
            <SkeletonBox width={60} height={24} borderRadius={8} />
          </View>
          <SkeletonBox height={13} style={{ marginBottom: 8 }} />
          <SkeletonBox width="80%" height={13} style={{ marginBottom: 8 }} />
          <SkeletonBox width="50%" height={13} style={{ marginBottom: 16 }} />
          <SkeletonBox width={120} height={36} borderRadius={12} />
        </View>
        <View style={skeletonStyles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <SkeletonBox width={100} height={18} borderRadius={8} />
            <SkeletonBox width={80} height={24} borderRadius={12} />
          </View>
          <SkeletonBox height={6} borderRadius={3} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ alignItems: "center", gap: 6 }}>
                <SkeletonBox width={40} height={22} borderRadius={6} />
                <SkeletonBox width={50} height={11} borderRadius={6} />
              </View>
            ))}
          </View>
        </View>
        <SkeletonBox width={120} height={18} borderRadius={8} style={{ marginBottom: 10 }} />
        <SkeletonBox width={180} height={12} borderRadius={6} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBox key={i} width="47%" height={90} borderRadius={14} />
          ))}
        </View>
        <SkeletonBox width={100} height={18} borderRadius={8} style={{ marginBottom: 14 }} />
        <SkeletonBox height={50} borderRadius={14} style={{ marginBottom: 16 }} />
        {[0, 1, 2].map((i) => <SkeletonCommentItem key={i} />)}
      </ScrollView>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  card: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  commentCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
});

export default function QrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isOnline, recheck } = useNetworkStatus();

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
  const scrollRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
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

  // Owner features
  const [ownerInfo, setOwnerInfo] = useState<QrOwnerInfo | null>(null);
  const [isQrOwner, setIsQrOwner] = useState(false);
  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);

  // Messaging
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [messages, setMessages] = useState<QrMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Merchant Dashboard (owner only)
  const [scanVelocity, setScanVelocity] = useState<ScanVelocityBucket[]>([]);
  const [velocityLoading, setVelocityLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({ status: "none" });
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyBizName, setVerifyBizName] = useState("");
  const [verifyDocBase64, setVerifyDocBase64] = useState<string | null>(null);
  const [verifyDocName, setVerifyDocName] = useState<string | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const [copied, setCopied] = useState(false);

  // QR Safety Analysis
  const [parsedPayment, setParsedPayment] = useState<ParsedPaymentQr | null>(null);
  const [paymentSafety, setPaymentSafety] = useState<PaymentSafetyResult | null>(null);
  const [urlSafety, setUrlSafety] = useState<UrlSafetyResult | null>(null);
  const [offlineBlacklistMatch, setOfflineBlacklistMatch] = useState<{ matched: boolean; reason: string | null }>({ matched: false, reason: null });

  const glowOpacity = useSharedValue(0.6);
  const glowScale = useSharedValue(1);
  useEffect(() => {
    glowOpacity.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.6, { duration: 900 })), -1, true);
    glowScale.value = withRepeat(withSequence(withTiming(1.03, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
  }, []);
  const signInGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const topInset = Platform.OS === "web" ? 67 : insets.top;
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

  useEffect(() => {
    if (!user || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, user.id).then((likes) => {
      setUserLikes((prev) => ({ ...prev, ...likes }));
    });
  }, [commentsList, user?.id, id]);

  // Load offline content from AsyncStorage as fallback
  async function loadOfflineFallback() {
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const raw = await AsyncStorage.getItem(`qr_content_${id}`);
      if (raw) {
        const { content, contentType } = JSON.parse(raw);
        setOfflineContent(content);
        setOfflineContentType(contentType || "text");
      }
    } catch {}
  }

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

        // Save for offline fallback
        try {
          const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
          await AsyncStorage.setItem(`qr_content_${id}`, JSON.stringify({
            content: detail.qrCode.content,
            contentType: detail.qrCode.contentType,
          }));
        } catch {}

        // Load owner info
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

  // Subscribe to owner's messages
  useEffect(() => {
    if (!isQrOwner || !user || !ownerInfo) return;
    const unsub = subscribeToQrMessages(user.id, id, (msgs) => {
      setMessages(msgs);
      setUnreadMessages(msgs.filter((m) => !m.read).length);
    });
    return unsub;
  }, [isQrOwner, user?.id, id, ownerInfo]);

  // Load Merchant Dashboard data when owner is confirmed
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

  // Auto-focus comment input when replyTo is set
  useEffect(() => {
    if (replyTo) {
      const t = setTimeout(() => commentInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [replyTo]);

  // Content safety analysis
  useEffect(() => {
    const content = qrCode?.content || offlineContent;
    const contentType = qrCode?.contentType || offlineContentType;
    if (!content) return;

    (async () => {
      // Offline blacklist check (works offline too)
      const blacklist = await loadOfflineBlacklist();
      const blMatch = checkOfflineBlacklist(content, blacklist);
      setOfflineBlacklistMatch(blMatch);

      // Universal payment analysis — covers all 50+ payment apps worldwide
      if (contentType === "payment") {
        const parsed = parseAnyPaymentQr(content);
        if (parsed) {
          setParsedPayment(parsed);
          setPaymentSafety(analyzeAnyPaymentQr(parsed));
        }
      }

      // URL heuristic analysis
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
    // Optimistic update — instant UI response
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
    // Backend sync (reconcile with real counts)
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
        user.id,
        user.displayName,
        ownerInfo.ownerId,
        id,
        ownerInfo.brandedUuid,
        messageText.trim()
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

    // Build a prioritized list of deep-link URLs to try
    const linksToTry: string[] = [];
    const lower = content.toLowerCase();

    if (parsedPayment) {
      const cat = parsedPayment.appCategory;

      if (cat === "upi_india") {
        // Always normalize to standard upi:// scheme — Android OS opens payment chooser
        if (lower.startsWith("upi://")) {
          linksToTry.push(content);
        } else if (lower.startsWith("tez://upi/") || lower.startsWith("gpay://upi/")) {
          // Convert GPay scheme to standard UPI
          const upiLink = "upi://" + content.split("upi/")[1];
          linksToTry.push(upiLink, content);
        } else if (lower.startsWith("phonepe://")) {
          linksToTry.push(content);
          // Also try standard UPI as fallback
          if (content.includes("?")) linksToTry.push("upi://pay?" + content.split("?")[1]);
        } else if (lower.startsWith("paytm://")) {
          linksToTry.push(content);
          if (content.includes("?")) linksToTry.push("upi://pay?" + content.split("?")[1]);
        } else {
          linksToTry.push(content);
        }
      } else if (cat === "crypto") {
        // Crypto: just open the raw scheme (bitcoin:, ethereum:, etc.)
        linksToTry.push(content);
      } else {
        // For URL-based payments (PayPal, Venmo, GrabPay, etc.): open as URL
        // Try the raw content (which might be a URL or scheme)
        linksToTry.push(content);
        // If it's not already a URL and has a scheme, try adding https:// as fallback
        if (!lower.startsWith("http://") && !lower.startsWith("https://") && lower.includes("://")) {
          // Already has a scheme, nothing extra needed
        } else if (!lower.startsWith("http")) {
          try { new URL("https://" + content); linksToTry.push("https://" + content); } catch {}
        }
      }
    } else {
      // No parsed payment — try raw content
      linksToTry.push(content);
    }

    // Try each link in order
    for (const link of linksToTry) {
      try {
        const canOpen = await Linking.canOpenURL(link);
        if (canOpen) {
          await Linking.openURL(link);
          return;
        }
      } catch {}
    }

    // Last resort: try opening even if canOpenURL said no (some OS versions return false incorrectly)
    if (linksToTry.length > 0) {
      Linking.openURL(linksToTry[0]).catch(() => {
        const appName = parsedPayment?.appDisplayName ?? "payment app";
        Alert.alert(
          "App Not Found",
          `Could not open ${appName}. Make sure the app is installed on your device.`,
          [{ text: "OK" }]
        );
      });
    }
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

  function renderComment(comment: CommentItem, isReply: boolean = false) {
    const currentUserLike = userLikes[comment.id] ?? null;
    const isCommentOwner = user?.id === comment.userId;
    const canDelete = isCommentOwner;
    const descendants = !isReply ? getAllDescendants(comment.id) : [];
    const replyCount = descendants.length;
    const isExpanded = expandedReplies[comment.id] ?? false;
    const showCount = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
    const visibleReplies = descendants.slice(0, showCount);
    const hasMore = replyCount > showCount;
    const isMenuOpen = commentMenuId === comment.id;
    const isDeleting = deletingCommentId === comment.id;

    return (
      <View key={comment.id}>
        <Animated.View entering={FadeIn.duration(300)}>
          <View style={[styles.commentItem, isReply && styles.replyItem]}>
            <View style={styles.commentHeader}>
              <View style={[styles.commentAvatar, isReply && styles.replyAvatar]}>
                {comment.userPhotoURL ? (
                  <Image
                    source={{ uri: comment.userPhotoURL }}
                    style={[styles.commentAvatarImg, isReply && { width: 28, height: 28, borderRadius: 14 }]}
                  />
                ) : (
                  <Text style={[styles.commentAvatarText, isReply && { fontSize: 12 }]}>
                    {(comment.userUsername || comment.user.displayName).charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.commentMeta}>
                <Text style={styles.commentAuthor} numberOfLines={1}>
                  {comment.userUsername ? (
                    <Text style={styles.commentUsernameText}>@{comment.userUsername}</Text>
                  ) : smartName(comment.user.displayName)}
                  <Text style={styles.commentTimeDot}>  ·  </Text>
                  <Text style={styles.commentTimeInline}>{formatRelativeTime(comment.createdAt)}</Text>
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (isMenuOpen) {
                    setCommentMenuId(null);
                  } else {
                    setCommentMenuId(comment.id);
                    setCommentMenuOwner(isCommentOwner);
                  }
                }}
                style={styles.commentMenuBtn}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Colors.dark.danger} />
                ) : (
                  <Ionicons name="ellipsis-horizontal" size={18} color={Colors.dark.textMuted} />
                )}
              </Pressable>
            </View>

            <Text style={styles.commentText}>{comment.text}</Text>

            <View style={styles.commentActions}>
              <Pressable onPress={() => handleCommentLike(comment.id, "like")} style={styles.commentActionBtn}>
                <Ionicons
                  name={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
                  size={15}
                  color={currentUserLike === "like" ? Colors.dark.safe : Colors.dark.textMuted}
                />
                {comment.likeCount > 0 ? (
                  <Text style={[styles.commentActionCount, currentUserLike === "like" && { color: Colors.dark.safe }]}>
                    {formatCompactNumber(comment.likeCount)}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable onPress={() => handleCommentLike(comment.id, "dislike")} style={styles.commentActionBtn}>
                <Ionicons
                  name={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                  size={15}
                  color={currentUserLike === "dislike" ? Colors.dark.danger : Colors.dark.textMuted}
                />
                {comment.dislikeCount > 0 ? (
                  <Text style={[styles.commentActionCount, currentUserLike === "dislike" && { color: Colors.dark.danger }]}>
                    {formatCompactNumber(comment.dislikeCount)}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!user) { router.push("/(auth)/login"); return; }
                  const rootId = getRootCommentId(comment.id);
                  const isNested = !!comment.parentId;
                  const authorLabel = comment.userUsername ? `@${comment.userUsername}` : comment.user.displayName;
                  setReplyTo({ id: comment.id, author: authorLabel, rootId, isNested });
                  setExpandedReplies((prev) => ({ ...prev, [rootId]: true }));
                  if (isNested) {
                    setNewComment(`@${comment.userUsername || comment.user.displayName} `);
                  }
                }}
                style={styles.commentActionBtn}
              >
                <Ionicons name="return-down-forward-outline" size={15} color={Colors.dark.textMuted} />
                <Text style={styles.commentActionCount}>Reply</Text>
              </Pressable>
            </View>

            {isMenuOpen ? (
              <View style={styles.inlineMenu}>
                {canDelete ? (
                  <Pressable
                    onPress={() => handleDeleteComment(comment.id)}
                    style={styles.inlineMenuItem}
                  >
                    <Ionicons name="trash-outline" size={14} color={Colors.dark.danger} />
                    <Text style={[styles.inlineMenuText, { color: Colors.dark.danger }]}>Delete</Text>
                  </Pressable>
                ) : null}
                {!isCommentOwner && (
                  <Pressable
                    onPress={() => {
                      setCommentMenuId(null);
                      setCommentReportModal(comment.id);
                    }}
                    style={styles.inlineMenuItem}
                  >
                    <Ionicons name="flag-outline" size={14} color={Colors.dark.warning} />
                    <Text style={[styles.inlineMenuText, { color: Colors.dark.warning }]}>Report</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        </Animated.View>

        {!isReply && replyCount > 0 ? (
          <View style={styles.repliesToggleRow}>
            <View style={styles.repliesConnector} />
            <Pressable onPress={() => toggleReplies(comment.id)} style={styles.repliesToggleBtn}>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={13}
                color={Colors.dark.primary}
              />
              <Text style={styles.repliesToggleText}>
                {isExpanded ? "Hide replies" : `Show ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!isReply && isExpanded ? (
          <View style={styles.repliesContainer}>
            {visibleReplies.map((reply) => renderComment(reply, true))}
            {hasMore ? (
              <Pressable onPress={() => showMoreReplies(comment.id)} style={styles.showMoreRepliesBtn}>
                <Text style={styles.showMoreRepliesText}>Show more replies</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  const trust = getTrustInfo();
  const currentContent = qrCode?.content || offlineContent;
  const currentContentType = qrCode?.contentType || offlineContentType;

  if (loading) {
    return <LoadingSkeleton topInset={topInset} />;
  }

  // Full offline mode — no data at all
  if (offlineMode && !currentContent && !qrCode) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.navTitle}>QR Details</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.loadingCenter}>
          <View style={styles.offlineIconCircle}>
            <Ionicons name="wifi-outline" size={48} color={Colors.dark.textMuted} />
          </View>
          <Text style={styles.offlineTitle}>You're offline</Text>
          <Text style={styles.offlineSub}>
            Enable internet to view QR code details, community reports, and comments.
          </Text>
          <Pressable onPress={recheck} style={styles.retryBtn}>
            <Ionicons name="refresh" size={18} color="#000" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!qrCode && !currentContent && loadError) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.loadingCenter}>
          <Ionicons name="alert-circle" size={48} color={Colors.dark.danger} />
          <Text style={styles.errorText}>QR code not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const followCountFormatted = formatCompactNumber(followCount);
  const followCountFull = formatIndianNumber(followCount);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <StatusBar style="light" backgroundColor={Colors.dark.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? topInset : 0}
      >
        <View style={[styles.container, { paddingTop: topInset }]}>
          {/* Nav */}
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
            </Pressable>
            <Text style={styles.navTitle}>QR Details</Text>
            <View style={styles.navActions}>
              {!offlineMode && (
                <Pressable onPress={handleToggleFavorite} disabled={favoriteLoading} style={styles.navActionBtn}>
                  {favoriteLoading ? (
                    <ActivityIndicator size="small" color={Colors.dark.danger} />
                  ) : (
                    <Ionicons
                      name={isFavorite ? "heart" : "heart-outline"}
                      size={22}
                      color={isFavorite ? Colors.dark.danger : Colors.dark.textSecondary}
                    />
                  )}
                </Pressable>
              )}
              {!offlineMode && (
                <Pressable
                  onPress={handleToggleFollow}
                  onPressIn={() => isFollowing && setFollowPressedIn(true)}
                  onPressOut={() => setFollowPressedIn(false)}
                  disabled={followLoading}
                  style={[
                    styles.followBtn,
                    isFollowing && styles.followBtnActive,
                    followPressedIn && isFollowing && styles.followBtnUnfollowHint,
                  ]}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={Colors.dark.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          followPressedIn && isFollowing
                            ? "notifications-off-outline"
                            : isFollowing
                            ? "notifications"
                            : "notifications-outline"
                        }
                        size={15}
                        color={
                          followPressedIn && isFollowing
                            ? Colors.dark.danger
                            : isFollowing
                            ? Colors.dark.primary
                            : Colors.dark.textSecondary
                        }
                      />
                      <Text style={[
                        styles.followBtnText,
                        isFollowing && styles.followBtnTextActive,
                        followPressedIn && isFollowing && { color: Colors.dark.danger },
                      ]}>
                        {followPressedIn && isFollowing ? "Unfollow" : isFollowing ? "Following" : "Follow"}
                      </Text>
                      {followCount > 0 && !(followPressedIn && isFollowing) ? (
                        <View style={styles.followCountPill}>
                          <Text style={styles.followCountPillText}>{followCountFormatted}</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => setCommentMenuId(null)}
          >
            {/* Safety disclaimer */}
            <View style={styles.disclaimerBanner}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.disclaimerText}>
                Check links before you click. QR Guard is not responsible for external content.
              </Text>
            </View>

            {/* Offline banner */}
            {offlineMode && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.offlineBanner}>
                  <Ionicons name="wifi-outline" size={20} color={Colors.dark.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offlineBannerTitle}>You're offline</Text>
                    <Text style={styles.offlineBannerSub}>
                      Showing cached content. Enable internet to view community data.
                    </Text>
                  </View>
                  <Pressable onPress={recheck} style={styles.offlineRetrySmall}>
                    <Text style={styles.offlineRetrySmallText}>Retry</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {/* Sign-in banner */}
            {!user && !offlineMode ? (
              <Animated.View style={signInGlowStyle}>
                <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBanner}>
                  <View style={styles.signInBannerIcon}>
                    <Ionicons name="person-circle-outline" size={28} color={Colors.dark.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signInBannerTitle}>Sign in to continue</Text>
                    <Text style={styles.signInBannerSub}>Report, follow, favorite & comment</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={Colors.dark.primary} />
                </Pressable>
              </Animated.View>
            ) : null}

            {/* Branded QR Owner Card */}
            {ownerInfo && !offlineMode && (
              <Animated.View entering={FadeInDown.duration(400)}>
                {ownerInfo.isActive === false && (
                  <View style={styles.deactivatedBanner}>
                    <Ionicons name="pause-circle" size={18} color={Colors.dark.danger} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deactivatedBannerTitle}>QR Code Deactivated</Text>
                      <Text style={styles.deactivatedBannerMsg} numberOfLines={3}>
                        {ownerInfo.deactivationMessage || "This QR code has been deactivated by the owner."}
                      </Text>
                    </View>
                  </View>
                )}
                <View style={styles.ownerCard}>
                  {ownerInfo.ownerLogoBase64 && ownerInfo.qrType === "business" && (
                    <View style={styles.ownerLogoRow}>
                      <Image
                        source={{ uri: ownerInfo.ownerLogoBase64 }}
                        style={styles.ownerLogoImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <View style={styles.ownerCardLeft}>
                    <View style={[
                      styles.ownerVerifiedIcon,
                      ownerInfo.qrType === "business" && { backgroundColor: "#FBBF2420" },
                      ownerInfo.qrType === "government" && { backgroundColor: "#3B82F620" },
                    ]}>
                      <Ionicons
                        name={ownerInfo.qrType === "business" ? "storefront" : ownerInfo.qrType === "government" ? "flag" : "shield-checkmark"}
                        size={18}
                        color={ownerInfo.qrType === "business" ? "#FBBF24" : ownerInfo.qrType === "government" ? "#3B82F6" : Colors.dark.primary}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <Text style={styles.ownerCardTitle}>
                          {ownerInfo.qrType === "business" ? "Business QR" : ownerInfo.qrType === "government" ? "Government QR" : "Branded QR Code"}
                        </Text>
                        <View style={[
                          styles.qrTypeBadge,
                          ownerInfo.qrType === "business" && { backgroundColor: "#FBBF2420", borderColor: "#FBBF2440" },
                          ownerInfo.qrType === "government" && { backgroundColor: "#3B82F620", borderColor: "#3B82F640" },
                        ]}>
                          <Text style={[
                            styles.qrTypeBadgeText,
                            ownerInfo.qrType === "business" && { color: "#FBBF24" },
                            ownerInfo.qrType === "government" && { color: "#3B82F6" },
                          ]}>
                            {ownerInfo.qrType === "business" ? "BUSINESS" : ownerInfo.qrType === "government" ? "GOVERNMENT" : "INDIVIDUAL"}
                          </Text>
                        </View>
                      </View>
                      {ownerInfo.businessName ? (
                        <Text style={styles.businessNameText} numberOfLines={1}>{ownerInfo.businessName}</Text>
                      ) : null}
                      <Text style={styles.ownerCardSub} numberOfLines={1}>
                        Created by <Text style={styles.ownerName}>{ownerInfo.ownerName}</Text>
                      </Text>
                      <Text style={styles.ownerUuid} numberOfLines={1}>ID: {ownerInfo.brandedUuid}</Text>
                      {ownerInfo.isBranded && (
                        <View style={styles.scanGuardBadge}>
                          <Ionicons name="shield-checkmark" size={12} color={Colors.dark.primary} />
                          <Text style={styles.scanGuardBadgeText}>QR Guard Generated</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.ownerCardRight}>
                    {isQrOwner ? (
                      <>
                        <Pressable
                          onPress={() => {
                            handleLoadFollowers();
                            setFollowersModalOpen(true);
                          }}
                          style={styles.ownerActionBtn}
                        >
                          <Ionicons name="people-outline" size={16} color={Colors.dark.primary} />
                          <Text style={styles.ownerActionText}>
                            {followCountFull}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setMessagesModalOpen(true)}
                          style={[styles.ownerActionBtn, { position: "relative" }]}
                        >
                          <Ionicons name="mail-outline" size={16} color={Colors.dark.accent} />
                          <Text style={[styles.ownerActionText, { color: Colors.dark.accent }]}>
                            Inbox
                          </Text>
                          {unreadMessages > 0 && (
                            <View style={styles.unreadDot}>
                              <Text style={styles.unreadDotText}>{unreadMessages}</Text>
                            </View>
                          )}
                        </Pressable>
                      </>
                    ) : (
                      <View style={styles.verifiedOnlyBadge}>
                        <Ionicons name="shield-checkmark" size={12} color={Colors.dark.safe} />
                        <Text style={styles.verifiedOnlyText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── Merchant Dashboard (owner only) ── */}
            {isQrOwner && !offlineMode && (
              <Animated.View entering={FadeInDown.duration(450)} style={styles.merchantCard}>
                <View style={styles.merchantHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={styles.merchantIconBox}>
                      <Ionicons name="bar-chart" size={18} color={Colors.dark.primary} />
                    </View>
                    <Text style={styles.merchantTitle}>Merchant Dashboard</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setVelocityLoading(true);
                      getScanVelocity(id)
                        .then((v) => setScanVelocity(v))
                        .finally(() => setVelocityLoading(false));
                    }}
                    style={styles.merchantRefreshBtn}
                  >
                    <Ionicons name="refresh-outline" size={16} color={Colors.dark.textMuted} />
                  </Pressable>
                </View>

                {/* Scan Velocity Chart */}
                <Text style={styles.merchantSectionLabel}>Scan Velocity — Last 24 Hours</Text>
                {velocityLoading ? (
                  <ActivityIndicator color={Colors.dark.primary} size="small" style={{ marginVertical: 16 }} />
                ) : (
                  <View style={styles.velocityChart}>
                    {(() => {
                      const maxCount = Math.max(...scanVelocity.map((b) => b.count), 1);
                      const MAX_BAR_H = 60;
                      return scanVelocity.map((bucket, i) => (
                        <View key={i} style={styles.velocityBarWrapper}>
                          <View style={[
                            styles.velocityBar,
                            {
                              height: Math.max(2, (bucket.count / maxCount) * MAX_BAR_H),
                              backgroundColor: bucket.count > 0 ? Colors.dark.primary : Colors.dark.surfaceLight,
                            },
                          ]} />
                          {(i % 6 === 0 || i === 23) ? (
                            <Text style={styles.velocityLabel}>{bucket.label}</Text>
                          ) : (
                            <View style={{ height: 12 }} />
                          )}
                        </View>
                      ));
                    })()}
                  </View>
                )}
                {scanVelocity.length > 0 && (
                  <Text style={styles.merchantTotalScans}>
                    {scanVelocity.reduce((s, b) => s + b.count, 0)} scan{scanVelocity.reduce((s, b) => s + b.count, 0) !== 1 ? "s" : ""} in the last 24h
                  </Text>
                )}

                {/* Verified Badge Section */}
                <View style={styles.merchantDivider} />
                <Text style={styles.merchantSectionLabel}>Merchant Verification</Text>
                {verificationStatus.status === "none" && (
                  <Pressable onPress={() => setVerifyModalOpen(true)} style={styles.verifyRequestBtn}>
                    <Ionicons name="shield-outline" size={18} color={Colors.dark.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyRequestBtnText}>Request Verified Badge</Text>
                      <Text style={styles.verifyRequestBtnSub}>Submit business ID for manual review</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
                  </Pressable>
                )}
                {verificationStatus.status === "pending" && (
                  <View style={styles.verifyStatusRow}>
                    <Ionicons name="time-outline" size={18} color={Colors.dark.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.verifyStatusText, { color: Colors.dark.warning }]}>Verification Pending</Text>
                      {verificationStatus.businessName && (
                        <Text style={styles.verifyStatusSub}>{verificationStatus.businessName}</Text>
                      )}
                    </View>
                  </View>
                )}
                {verificationStatus.status === "approved" && (
                  <View style={styles.verifyStatusRow}>
                    <Ionicons name="shield-checkmark" size={18} color={Colors.dark.safe} />
                    <Text style={[styles.verifyStatusText, { color: Colors.dark.safe }]}>Merchant Verified</Text>
                  </View>
                )}
                {verificationStatus.status === "rejected" && (
                  <View style={{ gap: 8 }}>
                    <View style={styles.verifyStatusRow}>
                      <Ionicons name="close-circle-outline" size={18} color={Colors.dark.danger} />
                      <Text style={[styles.verifyStatusText, { color: Colors.dark.danger }]}>Verification Rejected</Text>
                    </View>
                    <Pressable onPress={() => setVerifyModalOpen(true)} style={styles.verifyRequestBtn}>
                      <Ionicons name="reload-outline" size={16} color={Colors.dark.primary} />
                      <Text style={styles.verifyRequestBtnText}>Resubmit</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
                    </Pressable>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Message Owner button (for non-owners viewing a branded QR) */}
            {ownerInfo && !isQrOwner && user && !offlineMode && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Pressable
                  onPress={() => setMessagesModalOpen(true)}
                  style={styles.messageOwnerBtn}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.dark.primary} />
                  <Text style={styles.messageOwnerBtnText}>Message Owner Privately</Text>
                  <Ionicons name="lock-closed-outline" size={14} color={Colors.dark.textMuted} />
                </Pressable>
              </Animated.View>
            )}

            {/* QR Content Card */}
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.contentCard}>
                <View style={styles.contentHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                    <MaterialCommunityIcons name="qrcode" size={28} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{currentContentType.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.contentText} selectable numberOfLines={4}>{currentContent}</Text>

                {/* Action buttons row */}
                {currentContentType === "url" && ownerInfo?.isActive !== false ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable onPress={handleOpenContent} style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.8 : 1 }]}>
                      <Ionicons name="open-outline" size={16} color={Colors.dark.primary} />
                      <Text style={styles.openBtnText}>Open Link</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        if (currentContent) {
                          await Clipboard.setStringAsync(currentContent);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      style={({ pressed }) => [styles.copyIconBtn, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Ionicons name="copy-outline" size={17} color={Colors.dark.textSecondary} />
                    </Pressable>
                    {copied ? <Text style={styles.copiedToast}>Copied!</Text> : null}
                  </View>
                ) : currentContentType !== "payment" ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable
                      onPress={async () => {
                        if (currentContent) {
                          await Clipboard.setStringAsync(currentContent);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      style={({ pressed }) => [styles.copyIconBtn, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Ionicons name="copy-outline" size={17} color={Colors.dark.textSecondary} />
                    </Pressable>
                    {copied ? <Text style={styles.copiedToast}>Copied!</Text> : null}
                  </View>
                ) : null}

                {/* Universal Payment Details Card — hidden when deactivated */}
                {currentContentType === "payment" && parsedPayment && ownerInfo?.isActive !== false ? (
                  <View style={styles.upiDetailsCard}>
                    {/* App + Region badge */}
                    <View style={[styles.upiRow, { marginBottom: 8 }]}>
                      <Text style={styles.upiLabel}>App</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
                        <Text style={[styles.upiValue, { color: Colors.dark.primary }]} numberOfLines={1}>
                          {parsedPayment.appDisplayName}
                        </Text>
                        <View style={{ backgroundColor: Colors.dark.primaryDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: Colors.dark.primary, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                            {parsedPayment.region}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Recipient / Payee */}
                    {parsedPayment.recipientName ? (
                      <View style={styles.upiRow}>
                        <Text style={styles.upiLabel}>Payee</Text>
                        <Text style={styles.upiValue} numberOfLines={1}>{parsedPayment.recipientName}</Text>
                      </View>
                    ) : null}

                    {/* UPI-specific: VPA + bank handle */}
                    {parsedPayment.appCategory === "upi_india" && parsedPayment.vpa ? (
                      <>
                        <View style={styles.upiRow}>
                          <Text style={styles.upiLabel}>UPI ID</Text>
                          <Text style={styles.upiValue} selectable numberOfLines={1}>{parsedPayment.vpa}</Text>
                        </View>
                        {parsedPayment.bankHandle ? (
                          <View style={styles.upiRow}>
                            <Text style={styles.upiLabel}>Bank</Text>
                            <Text style={styles.upiValue}>@{parsedPayment.bankHandle}</Text>
                          </View>
                        ) : null}
                      </>
                    ) : null}

                    {/* Crypto: wallet address */}
                    {parsedPayment.appCategory === "crypto" && parsedPayment.recipientId ? (
                      <View style={styles.upiRow}>
                        <Text style={styles.upiLabel}>Address</Text>
                        <Text selectable numberOfLines={2} style={{ flex: 1, textAlign: "right", fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, letterSpacing: 0.3 }}>
                          {parsedPayment.recipientId}
                        </Text>
                      </View>
                    ) : null}

                    {/* Generic recipient ID for non-UPI, non-crypto */}
                    {parsedPayment.appCategory !== "upi_india" && parsedPayment.appCategory !== "crypto" && parsedPayment.recipientId && !parsedPayment.recipientName ? (
                      <View style={styles.upiRow}>
                        <Text style={styles.upiLabel}>To</Text>
                        <Text style={styles.upiValue} selectable numberOfLines={1}>{parsedPayment.recipientId}</Text>
                      </View>
                    ) : null}

                    {/* Amount */}
                    {parsedPayment.isAmountPreFilled && parsedPayment.amount ? (
                      <View style={styles.upiRow}>
                        <Text style={styles.upiLabel}>Amount</Text>
                        <Text style={[styles.upiValue, { color: Colors.dark.warning, fontFamily: "Inter_700Bold" }]}>
                          {parsedPayment.currency === "INR"
                            ? `₹${parseFloat(parsedPayment.amount).toLocaleString("en-IN")}`
                            : parsedPayment.currency === "USD"
                            ? `$${parseFloat(parsedPayment.amount).toLocaleString("en-US")}`
                            : parsedPayment.currency === "EUR"
                            ? `€${parseFloat(parsedPayment.amount).toLocaleString("de-DE")}`
                            : `${parsedPayment.amount} ${parsedPayment.currency || ""}`
                          }
                        </Text>
                      </View>
                    ) : null}

                    {/* Note / Description */}
                    {parsedPayment.note ? (
                      <View style={styles.upiRow}>
                        <Text style={styles.upiLabel}>Note</Text>
                        <Text style={styles.upiValue} numberOfLines={2}>{parsedPayment.note}</Text>
                      </View>
                    ) : null}

                    {/* Pay button */}
                    <Pressable onPress={handleOpenContent} style={({ pressed }) => [styles.paymentBtn, { opacity: pressed ? 0.8 : 1, marginTop: 12 }]}>
                      <Ionicons name={getPaymentAppIcon(parsedPayment.app) as any} size={18} color="#000" />
                      <Text style={styles.paymentBtnText}>
                        {parsedPayment.appCategory === "crypto"
                          ? `Open in ${parsedPayment.appDisplayName} Wallet`
                          : `Pay with ${parsedPayment.appDisplayName}`}
                      </Text>
                    </Pressable>
                    <Text style={styles.paymentWarning}>
                      {parsedPayment.appCategory === "crypto"
                        ? "Crypto payments are irreversible — verify the address character by character"
                        : parsedPayment.appCategory === "upi_india"
                        ? "Verify the payee name and UPI ID before paying"
                        : "Always verify the recipient before sending money"}
                    </Text>
                  </View>
                ) : currentContentType === "payment" && ownerInfo?.isActive !== false ? (
                  <View style={styles.paymentActions}>
                    <Pressable onPress={handleOpenContent} style={({ pressed }) => [styles.paymentBtn, { opacity: pressed ? 0.8 : 1 }]}>
                      <Ionicons name="card-outline" size={18} color="#000" />
                      <Text style={styles.paymentBtnText}>Open Payment</Text>
                    </Pressable>
                    <Text style={styles.paymentWarning}>Always verify the recipient before paying</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>

            {/* Payment safety warnings */}
            {currentContentType === "payment" && paymentSafety && paymentSafety.isSuspicious ? (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={[styles.safetyWarningCard, {
                  borderColor: paymentSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                }]}>
                  <View style={styles.safetyWarningHeader}>
                    <Ionicons
                      name={paymentSafety.riskLevel === "dangerous" ? "warning" : "alert-circle"}
                      size={20}
                      color={paymentSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning}
                    />
                    <Text style={[styles.safetyWarningTitle, {
                      color: paymentSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                    }]}>
                      {paymentSafety.riskLevel === "dangerous" ? "Payment Risk Detected" : "Payment Caution"}
                    </Text>
                  </View>
                  {paymentSafety.warnings.map((w, i) => (
                    <View key={i} style={styles.safetyWarningRow}>
                      <Ionicons name="ellipse" size={6} color={Colors.dark.warning} style={{ marginTop: 5 }} />
                      <Text style={styles.safetyWarningText}>{w}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {/* URL heuristic safety warnings */}
            {currentContentType === "url" && urlSafety && urlSafety.isSuspicious ? (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={[styles.safetyWarningCard, {
                  borderColor: urlSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                }]}>
                  <View style={styles.safetyWarningHeader}>
                    <Ionicons
                      name={urlSafety.riskLevel === "dangerous" ? "warning" : "alert-circle"}
                      size={20}
                      color={urlSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning}
                    />
                    <Text style={[styles.safetyWarningTitle, {
                      color: urlSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                    }]}>
                      {urlSafety.riskLevel === "dangerous" ? "Suspicious URL Detected" : "URL Caution"}
                    </Text>
                  </View>
                  {urlSafety.warnings.map((w, i) => (
                    <View key={i} style={styles.safetyWarningRow}>
                      <Ionicons name="ellipse" size={6} color={Colors.dark.warning} style={{ marginTop: 5 }} />
                      <Text style={styles.safetyWarningText}>{w}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {/* Offline blacklist match warning */}
            {offlineBlacklistMatch.matched ? (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={[styles.safetyWarningCard, { borderColor: Colors.dark.danger }]}>
                  <View style={styles.safetyWarningHeader}>
                    <Ionicons name="shield-outline" size={20} color={Colors.dark.danger} />
                    <Text style={[styles.safetyWarningTitle, { color: Colors.dark.danger }]}>
                      Known Scam Pattern
                    </Text>
                  </View>
                  <View style={styles.safetyWarningRow}>
                    <Ionicons name="ellipse" size={6} color={Colors.dark.danger} style={{ marginTop: 5 }} />
                    <Text style={styles.safetyWarningText}>
                      This content matches a known scam pattern: {offlineBlacklistMatch.reason}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ) : null}

            {/* Offline: internet required notice for community features */}
            {offlineMode ? (
              <Animated.View entering={FadeIn.duration(400)}>
                <View style={styles.offlineFeatureCard}>
                  <Ionicons name="cloud-offline-outline" size={40} color={Colors.dark.textMuted} />
                  <Text style={styles.offlineFeatureTitle}>Community Data Unavailable</Text>
                  <Text style={styles.offlineFeatureSub}>
                    Enable internet to view trust score, community reports, comments, and follow this QR code.
                  </Text>
                  <Pressable onPress={recheck} style={styles.enableInternetBtn}>
                    <Ionicons name="wifi" size={16} color="#000" />
                    <Text style={styles.enableInternetBtnText}>Enable Internet to View Data</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              <>
                {/* Trust Score */}
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                  <View style={styles.trustCard}>
                    <View style={styles.trustHeader}>
                      <Text style={styles.sectionTitle}>Trust Score</Text>
                      <View style={[styles.trustBadge, { backgroundColor: trust.color + "22" }]}>
                        <View style={[styles.trustDot, { backgroundColor: trust.color }]} />
                        <Text style={[styles.trustLabel, { color: trust.color }]}>{trust.label}</Text>
                      </View>
                    </View>
                    {trust.score >= 0 ? (
                      <View style={styles.trustBarContainer}>
                        <View style={styles.trustBarBg}>
                          <View style={[styles.trustBarFill, { width: `${Math.min(trust.score, 100)}%`, backgroundColor: trust.color }]} />
                        </View>
                        <Text style={styles.trustPercent}>{Math.round(trust.score)}% Safe</Text>
                      </View>
                    ) : null}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatCompactNumber(totalScans)}</Text>
                        <Text style={styles.statLabel}>Scans</Text>
                        {totalScans >= 1000 && (
                          <Text style={styles.statFull}>{formatIndianNumber(totalScans)}</Text>
                        )}
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatCompactNumber(totalComments)}</Text>
                        <Text style={styles.statLabel}>Comments</Text>
                        {totalComments >= 1000 && (
                          <Text style={styles.statFull}>{formatIndianNumber(totalComments)}</Text>
                        )}
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatCompactNumber(followCount)}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                        {followCount >= 1000 && (
                          <Text style={styles.statFull}>{formatIndianNumber(followCount)}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </Animated.View>

                {/* Report This QR */}
                <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                  <Text style={styles.sectionTitle}>Report This QR</Text>
                  <Text style={styles.sectionSubtext}>
                    {user ? "Tap to submit your report" : "Sign in to report this QR code"}
                  </Text>
                  <View style={styles.reportGrid}>
                    {REPORT_TYPES.map((rt) => {
                      const count = reportCounts[rt.key] || 0;
                      const isSelected = userReport === rt.key;
                      return (
                        <Pressable
                          key={rt.key}
                          onPress={() => handleReport(rt.key)}
                          disabled={!!reportLoading}
                          style={({ pressed }) => [
                            styles.reportCard,
                            { borderColor: isSelected ? rt.color : Colors.dark.surfaceBorder, backgroundColor: isSelected ? rt.bg : Colors.dark.surface, opacity: pressed ? 0.8 : 1 },
                          ]}
                        >
                          {reportLoading === rt.key ? (
                            <ActivityIndicator size="small" color={rt.color} />
                          ) : (
                            <Ionicons name={rt.icon as any} size={24} color={rt.color} />
                          )}
                          <Text style={[styles.reportLabel, { color: rt.color }]}>{rt.label}</Text>
                          <Text style={styles.reportCount}>{formatCompactNumber(count)}</Text>
                          {isSelected ? <View style={[styles.selectedDot, { backgroundColor: rt.color }]} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>

                {/* Comments */}
                <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                  <View style={styles.commentsHeader}>
                    <View style={styles.commentsTitleRow}>
                      <Text style={styles.sectionTitle}>Comments</Text>
                      {totalComments > 0 ? (
                        <View style={styles.commentCountBadge}>
                          <Text style={styles.commentCountText}>{formatCompactNumber(totalComments)}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Live</Text>
                    </View>
                  </View>

                  {!user ? (
                    <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInToComment}>
                      <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.primary} />
                      <Text style={styles.signInToCommentText}>Sign in to comment</Text>
                      <Ionicons name="arrow-forward" size={16} color={Colors.dark.primary} style={{ marginLeft: "auto" }} />
                    </Pressable>
                  ) : null}

                  {commentsList.length === 0 ? (
                    <View style={styles.noComments}>
                      <Ionicons name="chatbubbles-outline" size={32} color={Colors.dark.textMuted} />
                      <Text style={styles.noCommentsText}>No comments yet</Text>
                      <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts</Text>
                    </View>
                  ) : (
                    topLevelComments.map((comment) => renderComment(comment, false))
                  )}

                  {hasMoreComments ? (
                    <Pressable onPress={loadMoreComments} disabled={commentsLoading} style={styles.loadMoreBtn}>
                      {commentsLoading ? (
                        <ActivityIndicator size="small" color={Colors.dark.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>Load more comments</Text>
                      )}
                    </Pressable>
                  ) : null}
                </Animated.View>
              </>
            )}

            <View style={{ height: user ? 100 : 32 }} />
          </ScrollView>

          {/* Fixed bottom comment bar — always visible above keyboard */}
          {user && !offlineMode ? (
            <View style={[styles.bottomCommentBar, { paddingBottom: insets.bottom || 12 }]}>
              {replyTo ? (
                <View style={styles.replyBanner}>
                  <Ionicons name="return-down-forward" size={14} color={Colors.dark.primary} />
                  <Text style={styles.replyBannerText} numberOfLines={1}>
                    Replying to{" "}
                    <Text style={{ color: Colors.dark.primary, fontFamily: "Inter_600SemiBold" }}>{replyTo.author}</Text>
                  </Text>
                  <Pressable onPress={() => { setReplyTo(null); setNewComment(""); }} style={{ marginLeft: "auto" as any }}>
                    <Ionicons name="close" size={16} color={Colors.dark.textMuted} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.commentInput}>
                <TextInput
                  ref={commentInputRef}
                  style={styles.commentTextInput}
                  placeholder={replyTo ? `Reply to ${replyTo.author}...` : "Add a comment..."}
                  placeholderTextColor={Colors.dark.textMuted}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  onPress={handleSubmitComment}
                  disabled={submitting || !newComment.trim()}
                  style={({ pressed }) => [styles.sendBtn, { opacity: pressed || submitting || !newComment.trim() ? 0.5 : 1 }]}
                >
                  {submitting ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="send" size={18} color="#000" />}
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* Comment report modal */}
      <Modal
        visible={!!commentReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentReportModal(null)}
      >
        <Pressable style={styles.centeredOverlay} onPress={() => setCommentReportModal(null)}>
          <Pressable style={styles.reportCard2} onPress={() => {}}>
            <Text style={styles.reportCardTitle}>Report</Text>
            <Text style={styles.reportCardSubtitleBold}>What's going on?</Text>
            <Text style={styles.reportCardNote}>
              We'll check for all community guidelines, so don't worry about making the perfect choice.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {COMMENT_REPORT_REASONS.map((r, idx) => (
                <Pressable
                  key={r.value}
                  onPress={() => handleCommentReport(commentReportModal!, r.value)}
                  style={({ pressed }) => [
                    styles.reportCardOption,
                    idx < COMMENT_REPORT_REASONS.length - 1 && styles.reportCardOptionBorder,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name={r.icon as any} size={18} color={Colors.dark.textSecondary} style={{ marginRight: 12 }} />
                  <Text style={styles.reportCardOptionText}>{r.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} style={{ marginLeft: "auto" }} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setCommentReportModal(null)} style={styles.reportCardCancel}>
              <Text style={styles.reportCardCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Followers list modal */}
      <Modal
        visible={followersModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowersModalOpen(false)}
      >
        <Pressable style={styles.bottomSheetOverlay} onPress={() => setFollowersModalOpen(false)}>
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Followers</Text>
              <Text style={styles.sheetSub}>{formatIndianNumber(followCount)} people follow this QR</Text>
            </View>
            {followersLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator color={Colors.dark.primary} />
              </View>
            ) : followersList.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center", gap: 8 }}>
                <Ionicons name="people-outline" size={40} color={Colors.dark.textMuted} />
                <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_500Medium", fontSize: 15 }}>No followers yet</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {followersList.map((f) => (
                  <View key={f.userId} style={styles.followerRow}>
                    <View style={styles.followerAvatar}>
                      <Text style={styles.followerAvatarText}>{f.displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.followerName}>{f.displayName}</Text>
                      <Text style={styles.followerSince}>Followed {formatRelativeTime(f.followedAt)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <Pressable style={styles.sheetCloseBtn} onPress={() => setFollowersModalOpen(false)}>
              <Text style={styles.sheetCloseBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Messaging modal */}
      <Modal
        visible={messagesModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMessagesModalOpen(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.bottomSheetOverlay} onPress={() => setMessagesModalOpen(false)}>
            <Pressable style={[styles.bottomSheet, { maxHeight: "80%" }]} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {isQrOwner ? "Inbox" : "Message Owner"}
                </Text>
                <Text style={styles.sheetSub}>
                  {isQrOwner
                    ? "Private messages sent to this QR code"
                    : ownerInfo
                    ? `Send a private message to ${ownerInfo.ownerName}`
                    : "Private messaging — branded QRs only"}
                </Text>
              </View>

              {isQrOwner ? (
                <>
                  {messages.length === 0 ? (
                    <View style={{ padding: 40, alignItems: "center", gap: 10 }}>
                      <Ionicons name="mail-outline" size={40} color={Colors.dark.textMuted} />
                      <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_500Medium", fontSize: 15 }}>No messages yet</Text>
                      <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
                        Messages from people scanning this QR will appear here
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 350 }}>
                      {messages.map((msg) => (
                        <Pressable
                          key={msg.id}
                          onPress={() => markQrMessageRead(msg.id)}
                          style={[styles.messageRow, !msg.read && styles.messageRowUnread]}
                        >
                          <View style={styles.messageAvatar}>
                            <Text style={styles.messageAvatarText}>{msg.fromDisplayName.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={styles.messageSender}>{msg.fromDisplayName}</Text>
                              {!msg.read && <View style={styles.unreadDotInline} />}
                            </View>
                            <Text style={styles.messageText} numberOfLines={2}>{msg.message}</Text>
                            <Text style={styles.messageTime}>{formatRelativeTime(msg.createdAt)}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </>
              ) : ownerInfo ? (
                <View style={styles.messageComposeArea}>
                  <Text style={styles.messagePrivacyNote}>
                    Your message will be sent privately to {ownerInfo.ownerName}. They will see your name.
                  </Text>
                  <View style={styles.messageInputRow}>
                    <TextInput
                      style={styles.messageInput}
                      placeholder="Write your message..."
                      placeholderTextColor={Colors.dark.textMuted}
                      value={messageText}
                      onChangeText={setMessageText}
                      multiline
                      maxLength={500}
                    />
                  </View>
                  <Pressable
                    onPress={handleSendMessage}
                    disabled={sendingMessage || !messageText.trim() || !user}
                    style={({ pressed }) => [styles.sendMessageBtn, { opacity: pressed || sendingMessage || !messageText.trim() || !user ? 0.6 : 1 }]}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#000" />
                        <Text style={styles.sendMessageBtnText}>Send Message</Text>
                      </>
                    )}
                  </Pressable>
                  {!user && (
                    <Pressable onPress={() => { setMessagesModalOpen(false); router.push("/(auth)/login"); }} style={styles.signInToMessage}>
                      <Text style={styles.signInToMessageText}>Sign in to send a message</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={{ padding: 40, alignItems: "center", gap: 10 }}>
                  <Ionicons name="lock-closed-outline" size={40} color={Colors.dark.textMuted} />
                  <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" }}>
                    Private messaging is only available for branded QR codes
                  </Text>
                </View>
              )}

              <Pressable style={styles.sheetCloseBtn} onPress={() => setMessagesModalOpen(false)}>
                <Text style={styles.sheetCloseBtnText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Verification Request Modal */}
      <Modal
        visible={verifyModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyModalOpen(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.bottomSheetOverlay} onPress={() => setVerifyModalOpen(false)}>
            <Pressable style={[styles.bottomSheet, { maxHeight: "80%" }]} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={Colors.dark.primary} />
                    <Text style={styles.sheetTitle}>Request Verified Badge</Text>
                  </View>
                  <Text style={styles.sheetSub}>
                    Submit your business details for manual review. Approved merchants receive a verified badge on their QR codes.
                  </Text>
                </View>

                <View style={{ gap: 14, paddingBottom: 8 }}>
                  <View>
                    <Text style={styles.verifyFieldLabel}>Business Name</Text>
                    <TextInput
                      style={styles.verifyInput}
                      placeholder="Your registered business name"
                      placeholderTextColor={Colors.dark.textMuted}
                      value={verifyBizName}
                      onChangeText={setVerifyBizName}
                      maxLength={100}
                    />
                  </View>

                  <View>
                    <Text style={styles.verifyFieldLabel}>Business Document</Text>
                    <Text style={[styles.sheetSub, { marginBottom: 8 }]}>
                      Upload a photo of your business registration, tax certificate, or government-issued business ID.
                    </Text>
                    <Pressable onPress={handlePickVerifyDoc} style={styles.verifyDocPicker}>
                      {verifyDocName ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Ionicons name="document-attach" size={20} color={Colors.dark.primary} />
                          <Text style={[styles.verifyFieldLabel, { color: Colors.dark.primary, marginBottom: 0 }]} numberOfLines={1}>
                            {verifyDocName}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ alignItems: "center", gap: 8 }}>
                          <Ionicons name="cloud-upload-outline" size={28} color={Colors.dark.textMuted} />
                          <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                            Tap to upload document
                          </Text>
                          <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }}>
                            JPG, PNG · Max 5MB
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>

                  <View style={[styles.merchantDivider, { marginVertical: 0 }]} />
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Ionicons name="lock-closed-outline" size={15} color={Colors.dark.textMuted} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, lineHeight: 18 }}>
                      Your document is stored securely and used only for identity verification. It will not be shared publicly.
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleVerifySubmit}
                    disabled={verifySubmitting || !verifyBizName.trim() || !verifyDocBase64}
                    style={({ pressed }) => [
                      styles.verifySubmitBtn,
                      { opacity: verifySubmitting || !verifyBizName.trim() || !verifyDocBase64 || pressed ? 0.55 : 1 },
                    ]}
                  >
                    {verifySubmitting ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#000" />
                        <Text style={styles.verifySubmitBtnText}>Submit for Verification</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable style={styles.sheetCloseBtn} onPress={() => setVerifyModalOpen(false)}>
                    <Text style={styles.sheetCloseBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  backLink: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.dark.primaryDim, borderRadius: 12 },
  backLinkText: { color: Colors.dark.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 },

  // Offline full page
  offlineIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 8,
  },
  offlineTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.text, textAlign: "center" },
  offlineSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primary, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 16, marginTop: 8,
  },
  retryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },

  // Offline banner (inline)
  offlineBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.warningDim, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.warning + "40", marginBottom: 14,
  },
  offlineBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.warning },
  offlineBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },
  offlineRetrySmall: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: Colors.dark.warning + "22", borderWidth: 1, borderColor: Colors.dark.warning + "60",
  },
  offlineRetrySmallText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.dark.warning },

  // Offline feature card
  offlineFeatureCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center", gap: 10, marginBottom: 16,
  },
  offlineFeatureTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.textSecondary, textAlign: "center" },
  offlineFeatureSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, textAlign: "center", lineHeight: 18 },
  enableInternetBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primary, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 14, marginTop: 6,
  },
  enableInternetBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },

  navBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
    backgroundColor: Colors.dark.background,
  },
  navBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
  },
  navTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text, textAlign: "center" },
  navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  navActionBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
  },

  // Follow button — fixed to not overflow
  followBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    maxWidth: 140,
  },
  followBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  followBtnUnfollowHint: { backgroundColor: Colors.dark.dangerDim, borderColor: Colors.dark.danger + "60" },
  followBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary, flexShrink: 1 },
  followBtnTextActive: { color: Colors.dark.primary },
  followCountPill: {
    backgroundColor: Colors.dark.primaryDim, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, minWidth: 24, alignItems: "center",
  },
  followCountPillText: {
    fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.primary,
  },

  // Owner card
  ownerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.primary + "40", marginBottom: 12,
  },
  ownerCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  ownerVerifiedIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.primary + "60", flexShrink: 0,
  },
  ownerCardTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  ownerCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 1 },
  ownerName: { fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  ownerUuid: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  scanGuardBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start",
    borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  scanGuardBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  ownerCardRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  ownerActionBtn: {
    alignItems: "center", gap: 2,
    backgroundColor: Colors.dark.surface, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  ownerActionText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  unreadDot: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: Colors.dark.danger, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadDotText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  verifiedOnlyBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.dark.safeDim, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  verifiedOnlyText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.safe },

  qrTypeBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    backgroundColor: Colors.dark.primaryDim, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  qrTypeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.dark.primary, letterSpacing: 0.5 },
  businessNameText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 2 },

  deactivatedBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: Colors.dark.dangerDim, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.danger + "50", marginBottom: 10,
  },
  deactivatedBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.danger, marginBottom: 2 },
  deactivatedBannerMsg: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary },

  // Message owner button
  messageOwnerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.primary + "40", marginBottom: 12,
  },
  messageOwnerBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  scrollContent: { padding: 16 },

  signInBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.primaryDim,
    borderWidth: 1.5, borderColor: Colors.dark.primary,
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  signInBannerIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.primary + "60",
  },
  signInBannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  signInBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },

  contentCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  contentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  typeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.dark.primaryDim },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.primary, letterSpacing: 0.8 },
  contentText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.dark.text, lineHeight: 22, marginBottom: 12 },
  copyIconBtn: {
    width: 38, height: 38,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  copiedToast: {
    fontSize: 12, fontFamily: "Inter_500Medium",
    color: Colors.dark.safe,
  },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  openBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  paymentActions: { gap: 8 },
  paymentBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primary, paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 12, alignSelf: "flex-start",
  },
  paymentBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
  paymentWarning: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.warning },

  upiDetailsCard: {
    marginTop: 14,
    backgroundColor: "rgba(0,212,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.15)",
    padding: 14,
    gap: 8,
  },
  upiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  upiLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    minWidth: 60,
  },
  upiValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    flex: 1,
    textAlign: "right",
  },

  safetyWarningCard: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  safetyWarningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  safetyWarningTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  safetyWarningRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  safetyWarningText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  trustCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  trustHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  trustBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  trustDot: { width: 8, height: 8, borderRadius: 4 },
  trustLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  trustBarContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  trustBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.dark.surfaceLight, overflow: "hidden" },
  trustBarFill: { height: "100%", borderRadius: 3 },
  trustPercent: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary, minWidth: 60, textAlign: "right" },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  statFull: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.dark.surfaceBorder },

  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 6 },
  sectionSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginBottom: 12 },

  reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  reportCard: {
    flex: 1, minWidth: "45%", alignItems: "center", padding: 16,
    borderRadius: 14, borderWidth: 1.5, gap: 6, position: "relative",
  },
  reportLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reportCount: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  selectedDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },

  commentsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  commentsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentCountBadge: { backgroundColor: Colors.dark.primaryDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  commentCountText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  liveIndicator: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.dark.safeDim, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.dark.safe },
  liveText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe },

  commentInputContainer: { marginBottom: 16, gap: 8 },
  bottomCommentBar: {
    paddingHorizontal: 16, paddingTop: 10, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
    backgroundColor: Colors.dark.background,
  },
  replyBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.dark.primaryDim, padding: 10, borderRadius: 10 },
  replyBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary },
  commentInput: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 8,
  },
  commentTextInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.dark.text, maxHeight: 100, paddingTop: 8, paddingBottom: 8,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center",
  },

  signInToComment: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, padding: 14, borderRadius: 14,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  signInToCommentText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  noComments: {
    alignItems: "center", gap: 8, paddingVertical: 40,
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 16,
  },
  noCommentsText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  noCommentsSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  commentItem: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  replyItem: {
    backgroundColor: Colors.dark.surfaceLight,
    borderLeftWidth: 2, borderLeftColor: Colors.dark.primary + "50",
    borderRadius: 12, marginBottom: 4,
  },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  commentMeta: { flex: 1, minWidth: 0 },
  commentAuthor: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.text,
    flexShrink: 1,
  },
  commentUsernameText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  commentTimeDot: { fontSize: 12, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" },
  commentTimeInline: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  commentMenuBtn: { padding: 6, marginLeft: 4 },
  commentText: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    lineHeight: 20, marginBottom: 10,
  },
  commentActions: { flexDirection: "row", gap: 14, alignItems: "center" },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentActionCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },

  inlineMenu: {
    position: "absolute",
    top: 40, right: 8,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    overflow: "hidden", zIndex: 100, minWidth: 130,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  inlineMenuItem: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  inlineMenuText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  repliesToggleRow: {
    flexDirection: "row", alignItems: "center",
    marginLeft: 18, marginBottom: 4, marginTop: -2,
  },
  repliesConnector: {
    width: 18, height: 1, backgroundColor: Colors.dark.primary + "40", marginRight: 4,
  },
  repliesToggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 6, paddingHorizontal: 8,
  },
  repliesToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  repliesContainer: { marginLeft: 14, marginBottom: 6 },
  showMoreRepliesBtn: { paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start" },
  showMoreRepliesText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  loadMoreBtn: {
    alignItems: "center", paddingVertical: 14,
    backgroundColor: Colors.dark.surface, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  // ── Merchant Dashboard ──
  merchantCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  merchantHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
  },
  merchantIconBox: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.dark.primaryDim,
    alignItems: "center", justifyContent: "center",
  },
  merchantTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  merchantRefreshBtn: { padding: 8 },
  merchantSectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
  },
  velocityChart: {
    flexDirection: "row", alignItems: "flex-end", height: 80,
    gap: 2, marginBottom: 8,
  },
  velocityBarWrapper: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 0 },
  velocityBar: { width: "100%", borderRadius: 2, minHeight: 2 },
  velocityLabel: { fontSize: 8, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  merchantTotalScans: {
    fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted,
    textAlign: "center", marginBottom: 4,
  },
  merchantDivider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginVertical: 14 },
  verifyRequestBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  verifyRequestBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  verifyRequestBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  verifyStatusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  verifyStatusText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  verifyStatusSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  // Verification Modal
  verifyFieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary, marginBottom: 8 },
  verifyInput: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.dark.text,
  },
  verifyDocPicker: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.dark.surfaceBorder, borderStyle: "dashed",
    padding: 24, alignItems: "center", justifyContent: "center", minHeight: 100,
  },
  verifySubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.dark.primary, borderRadius: 14, paddingVertical: 15,
  },
  verifySubmitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },

  centeredOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center", alignItems: "center",
  },
  reportCard2: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    padding: 20, width: "90%", maxWidth: 380,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  reportCardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 4 },
  reportCardSubtitleBold: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, marginBottom: 2 },
  reportCardNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 12, lineHeight: 18 },
  reportCardOption: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },
  reportCardOptionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder },
  reportCardOptionText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.text, flex: 1 },
  reportCardCancel: {
    alignItems: "center", paddingVertical: 14, marginTop: 4,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
  },
  reportCardCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.danger },

  // Bottom sheet
  bottomSheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  bottomSheet: {
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.dark.surfaceLight, alignSelf: "center", marginBottom: 16,
  },
  sheetHeader: { paddingHorizontal: 20, marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 4 },
  sheetCloseBtn: {
    marginHorizontal: 20, marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight, alignItems: "center",
  },
  sheetCloseBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },

  // Followers
  followerRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  followerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
  },
  followerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  followerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  followerSince: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },

  // Messages
  messageRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  messageRowUnread: { backgroundColor: Colors.dark.primaryDim + "30" },
  messageAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  messageAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  messageSender: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  messageText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2, lineHeight: 18 },
  messageTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 4 },
  unreadDotInline: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.primary },

  messageComposeArea: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  messagePrivacyNote: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    backgroundColor: Colors.dark.surfaceLight, padding: 12, borderRadius: 12, lineHeight: 18,
  },
  messageInputRow: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  messageInput: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    minHeight: 80, maxHeight: 160,
  },
  sendMessageBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.dark.primary, paddingVertical: 14, borderRadius: 14,
  },
  sendMessageBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
  signInToMessage: { alignItems: "center", paddingVertical: 8 },
  signInToMessageText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  disclaimerBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.surface, borderRadius: 10, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  disclaimerText: {
    flex: 1, fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted, lineHeight: 15,
  },

  ownerLogoRow: {
    alignItems: "center", justifyContent: "center",
    paddingBottom: 12, marginBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  ownerLogoImage: {
    width: 72, height: 72, borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight,
  },
});
