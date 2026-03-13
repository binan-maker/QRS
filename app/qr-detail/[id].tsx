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
} from "react-native";
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
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
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
} from "@/lib/firestore-service";
import { DocumentSnapshot } from "firebase/firestore";

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
}

const REPORT_TYPES = [
  { key: "safe", label: "Safe", icon: "shield-checkmark", color: Colors.dark.safe, bg: Colors.dark.safeDim },
  { key: "scam", label: "Scam", icon: "warning", color: Colors.dark.danger, bg: Colors.dark.dangerDim },
  { key: "fake", label: "Fake", icon: "close-circle", color: Colors.dark.warning, bg: Colors.dark.warningDim },
  { key: "spam", label: "Spam", icon: "mail-unread", color: Colors.dark.accent, bg: Colors.dark.accentDim },
];

const PAYMENT_APPS: { prefix: string; name: string; icon: string; packageAndroid?: string; schemeIOS?: string }[] = [
  { prefix: "upi://", name: "UPI Payment", icon: "card", packageAndroid: "com.google.android.apps.nbu.paisa.user", schemeIOS: "gpay" },
  { prefix: "phonepe://", name: "PhonePe", icon: "phone-portrait", packageAndroid: "com.phonepe.app" },
  { prefix: "paytm://", name: "Paytm", icon: "wallet", packageAndroid: "net.one97.paytm" },
  { prefix: "gpay://", name: "Google Pay", icon: "card-outline", packageAndroid: "com.google.android.apps.nbu.paisa.user" },
];

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

function detectPaymentApp(content: string) {
  for (const app of PAYMENT_APPS) {
    if (content.toLowerCase().startsWith(app.prefix)) return app;
  }
  if (content.toLowerCase().includes("upi://")) return PAYMENT_APPS[0];
  return null;
}

const COMMENTS_PER_PAGE = 20;
const REPLIES_PER_PAGE = 10;

export default function QrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Comment menu modal state
  const [commentMenuModal, setCommentMenuModal] = useState<{
    id: string;
    isOwner: boolean;
  } | null>(null);
  const [commentReportModal, setCommentReportModal] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Threaded reply state
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});

  // Sign-in button glow animation
  const glowOpacity = useSharedValue(0.6);
  const glowScale = useSharedValue(1);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0.6, { duration: 900 })),
      -1,
      true
    );
    glowScale.value = withRepeat(
      withSequence(withTiming(1.03, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      true
    );
  }, []);
  const signInGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // Build threaded structure from flat commentsList
  const topLevelComments = commentsList.filter((c) => !c.parentId);
  const repliesByParent = commentsList.reduce<Record<string, CommentItem[]>>((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  function getRepliesForParent(parentId: string): CommentItem[] {
    return repliesByParent[parentId] || [];
  }

  function getVisibleReplies(parentId: string): CommentItem[] {
    const all = getRepliesForParent(parentId);
    const count = visibleRepliesCount[parentId] || REPLIES_PER_PAGE;
    return all.slice(0, count);
  }

  function handleToggleReplies(parentId: string) {
    setExpandedReplies((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
    if (!visibleRepliesCount[parentId]) {
      setVisibleRepliesCount((prev) => ({ ...prev, [parentId]: REPLIES_PER_PAGE }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleShowMoreReplies(parentId: string) {
    setVisibleRepliesCount((prev) => ({
      ...prev,
      [parentId]: (prev[parentId] || REPLIES_PER_PAGE) + REPLIES_PER_PAGE,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // When replying to a reply, pin to the top-level parent so threading stays 2-level
  function handleReplyPress(comment: CommentItem) {
    const rootParentId = comment.parentId ?? comment.id;
    setReplyTo({ id: rootParentId, author: comment.user.displayName });
    if (comment.parentId) {
      // Expand replies for the parent
      setExpandedReplies((prev) => ({ ...prev, [comment.parentId!]: true }));
    }
  }

  // Fetch user like status for comments
  useEffect(() => {
    if (!user || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, user.id).then((likes) => {
      setUserLikes((prev) => ({ ...prev, ...likes }));
    });
  }, [commentsList, user?.id, id]);

  useEffect(() => {
    setLoadError(false);
    loadQrDetail(id, user?.id || null)
      .then((detail) => {
        if (!detail) { setLoadError(true); setLoading(false); return; }
        setQrCode(detail.qrCode);
        setReportCounts(detail.reportCounts || {});
        setTotalScans(detail.totalScans || 0);
        setTotalComments(detail.totalComments || 0);
        setIsFavorite(detail.isFavorite || false);
        setIsFollowing(detail.isFollowing || false);
        setFollowCount(detail.followCount || 0);
        setTrustScore(detail.trustScore || null);
        if (detail.userReport) setUserReport(detail.userReport);
        setLoading(false);
      })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, [id, user?.id]);

  useEffect(() => {
    const unsub = subscribeToQrStats(id, ({ scanCount, commentCount }) => {
      setTotalScans(scanCount);
      setTotalComments(commentCount);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    const unsub = subscribeToQrReports(id, (counts) => {
      setReportCounts(counts);
      setTrustScore(calculateTrustScore(counts));
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    const pageLimit = user ? COMMENTS_PER_PAGE : 6;
    const unsub = subscribeToComments(id, pageLimit, (liveComments) => {
      setCommentsList(liveComments);
    });
    return unsub;
  }, [id, user?.id]);

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

  function promptSignIn(action: string) {
    router.push("/(auth)/login");
  }

  async function handleReport(type: string) {
    if (!user) { promptSignIn("report"); return; }
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
    if (!user) { promptSignIn("favorite"); return; }
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
    if (!user) { promptSignIn("follow"); return; }
    if (!qrCode) return;
    setFollowLoading(true);
    try {
      const result = await toggleFollow(id, user.id, qrCode.content, qrCode.contentType);
      setIsFollowing(result.isFollowing);
      setFollowCount(result.followCount);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFollowLoading(false);
  }

  async function handleSubmitComment() {
    if (!user) { promptSignIn("comment"); return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await addComment(id, user.id, user.displayName, newComment.trim(), replyTo?.id || null);
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
    if (!user) { promptSignIn("like"); return; }
    try {
      const data = await toggleCommentLike(id, commentId, user.id, action === "like");
      const prevLike = userLikes[commentId] ?? null;
      const newLike: "like" | "dislike" | null = prevLike === action ? null : action;
      setUserLikes((prev) => {
        const next = { ...prev };
        if (newLike === null) delete next[commentId];
        else next[commentId] = newLike;
        return next;
      });
      setCommentsList((prev) =>
        prev.map((c) => c.id !== commentId ? c : { ...c, likeCount: data.likes, dislikeCount: data.dislikes })
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    setCommentMenuModal(null);
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingCommentId(commentId);
          try {
            await softDeleteComment(id, commentId, user.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Could not delete comment.");
          } finally {
            setDeletingCommentId(null);
          }
        },
      },
    ]);
  }

  function handleOpenContent() {
    if (!qrCode) return;
    if (qrCode.contentType === "url" || qrCode.contentType === "payment") {
      Linking.openURL(qrCode.content).catch(() => Alert.alert("Error", "Could not open link"));
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

  const trust = getTrustInfo();
  const paymentApp = qrCode ? detectPaymentApp(qrCode.content) : null;

  // Render a single comment (used for both top-level and replies)
  function renderComment(comment: CommentItem, isReply: boolean = false) {
    const currentUserLike = userLikes[comment.id] ?? null;
    const isOwner = user?.id === comment.userId;
    const replyCount = !isReply ? getRepliesForParent(comment.id).length : 0;
    const isExpanded = expandedReplies[comment.id] ?? false;
    const visibleReplies = getVisibleReplies(comment.id);
    const hasMoreReplies = replyCount > (visibleRepliesCount[comment.id] || REPLIES_PER_PAGE);

    return (
      <View key={comment.id}>
        <Animated.View entering={FadeIn.duration(300)}>
          <View style={[styles.commentItem, isReply && styles.replyItem]}>
            <View style={styles.commentHeader}>
              <View style={[styles.commentAvatar, isReply && styles.replyAvatar]}>
                <Text style={styles.commentAvatarText}>
                  {comment.isDeleted ? "?" : comment.user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.commentAuthor}>{smartName(comment.user.displayName)}</Text>
                <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
              </View>
              {!comment.isDeleted ? (
                <Pressable
                  onPress={() => setCommentMenuModal({ id: comment.id, isOwner })}
                  style={styles.commentMenuBtn}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={Colors.dark.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Text style={[styles.commentText, comment.isDeleted && styles.commentTextDeleted]}>
              {comment.text}
            </Text>

            {!comment.isDeleted ? (
              <View style={styles.commentActions}>
                <Pressable onPress={() => handleCommentLike(comment.id, "like")} style={styles.commentActionBtn}>
                  <Ionicons
                    name={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
                    size={16}
                    color={currentUserLike === "like" ? Colors.dark.safe : Colors.dark.textMuted}
                  />
                  {comment.likeCount > 0 ? (
                    <Text style={[styles.commentActionCount, currentUserLike === "like" && { color: Colors.dark.safe }]}>
                      {comment.likeCount}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable onPress={() => handleCommentLike(comment.id, "dislike")} style={styles.commentActionBtn}>
                  <Ionicons
                    name={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                    size={16}
                    color={currentUserLike === "dislike" ? Colors.dark.danger : Colors.dark.textMuted}
                  />
                  {comment.dislikeCount > 0 ? (
                    <Text style={[styles.commentActionCount, currentUserLike === "dislike" && { color: Colors.dark.danger }]}>
                      {comment.dislikeCount}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!user) { promptSignIn("reply"); return; }
                    handleReplyPress(comment);
                  }}
                  style={styles.commentActionBtn}
                >
                  <Ionicons name="return-down-forward-outline" size={16} color={Colors.dark.textMuted} />
                  <Text style={styles.commentActionCount}>Reply</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Replies toggle for top-level comments */}
        {!isReply && replyCount > 0 ? (
          <View style={styles.repliesToggleRow}>
            <View style={styles.repliesLine} />
            <Pressable onPress={() => handleToggleReplies(comment.id)} style={styles.repliesToggleBtn}>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={Colors.dark.primary}
              />
              <Text style={styles.repliesToggleText}>
                {isExpanded ? "Hide replies" : `${replyCount} ${replyCount === 1 ? "Reply" : "Replies"}`}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Expanded replies */}
        {!isReply && isExpanded ? (
          <View style={styles.repliesContainer}>
            {visibleReplies.map((reply) => renderComment(reply, true))}
            {hasMoreReplies ? (
              <Pressable onPress={() => handleShowMoreReplies(comment.id)} style={styles.showMoreRepliesBtn}>
                <Text style={styles.showMoreRepliesText}>Show more replies</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <StatusBar style="light" backgroundColor={Colors.dark.background} translucent={false} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </View>
    );
  }

  if (!qrCode || loadError) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <StatusBar style="light" backgroundColor={Colors.dark.background} translucent={false} />
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

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.dark.background} translucent={false} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.dark.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.container, { paddingTop: topInset }]}>
          {/* Nav bar */}
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
            </Pressable>
            <Text style={styles.navTitle}>QR Details</Text>
            <View style={styles.navActions}>
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
              <Pressable
                onPress={handleToggleFollow}
                disabled={followLoading}
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={Colors.dark.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={isFollowing ? "notifications" : "notifications-outline"}
                      size={16}
                      color={isFollowing ? Colors.dark.primary : Colors.dark.textSecondary}
                    />
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                    {followCount > 0 ? <Text style={styles.followCount}>{followCount}</Text> : null}
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sign-in banner for unauthenticated users */}
            {!user ? (
              <Animated.View style={signInGlowStyle}>
                <Pressable
                  onPress={() => router.push("/(auth)/login")}
                  style={styles.signInBanner}
                >
                  <View style={styles.signInBannerIcon}>
                    <Ionicons name="person-circle-outline" size={28} color={Colors.dark.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signInBannerTitle}>Sign in to continue</Text>
                    <Text style={styles.signInBannerSub}>
                      Report, follow, favorite & comment on QR codes
                    </Text>
                  </View>
                  <View style={styles.signInBannerArrow}>
                    <Ionicons name="arrow-forward" size={18} color={Colors.dark.primary} />
                  </View>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* QR Content Card */}
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.contentCard}>
                <View style={styles.contentHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                    <MaterialCommunityIcons name="qrcode" size={28} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{qrCode.contentType.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.contentText} selectable numberOfLines={4}>{qrCode.content}</Text>
                {qrCode.contentType === "url" ? (
                  <Pressable onPress={handleOpenContent} style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.8 : 1 }]}>
                    <Ionicons name="open-outline" size={16} color={Colors.dark.primary} />
                    <Text style={styles.openBtnText}>Open Link</Text>
                  </Pressable>
                ) : null}
                {qrCode.contentType === "payment" && paymentApp ? (
                  <View style={styles.paymentActions}>
                    <Pressable onPress={handleOpenContent} style={({ pressed }) => [styles.paymentBtn, { opacity: pressed ? 0.8 : 1 }]}>
                      <Ionicons name={paymentApp.icon as any} size={18} color="#000" />
                      <Text style={styles.paymentBtnText}>Pay with {paymentApp.name}</Text>
                    </Pressable>
                    <Text style={styles.paymentWarning}>Always verify the recipient before paying</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>

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
                    <Text style={styles.statValue}>{totalScans}</Text>
                    <Text style={styles.statLabel}>Scans</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{totalComments}</Text>
                    <Text style={styles.statLabel}>Comments</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Object.values(reportCounts).reduce((a, b) => a + b, 0)}</Text>
                    <Text style={styles.statLabel}>Reports</Text>
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
                      <Text style={styles.reportCount}>{count}</Text>
                      {isSelected ? <View style={[styles.selectedDot, { backgroundColor: rt.color }]} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Comments Section */}
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <View style={styles.commentsHeader}>
                <View style={styles.commentsTitleRow}>
                  <Text style={styles.sectionTitle}>Comments</Text>
                  {totalComments > 0 ? (
                    <View style={styles.commentCountBadge}>
                      <Text style={styles.commentCountText}>{totalComments}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              </View>

              {user ? (
                <View style={styles.commentInputContainer}>
                  {replyTo ? (
                    <View style={styles.replyBanner}>
                      <Ionicons name="return-down-forward" size={14} color={Colors.dark.primary} />
                      <Text style={styles.replyBannerText}>
                        Replying to <Text style={{ color: Colors.dark.text }}>{replyTo.author}</Text>
                      </Text>
                      <Pressable onPress={() => setReplyTo(null)} style={{ marginLeft: 4 }}>
                        <Ionicons name="close" size={16} color={Colors.dark.textMuted} />
                      </Pressable>
                    </View>
                  ) : null}
                  <View style={styles.commentInput}>
                    <TextInput
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
              ) : (
                <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInToComment}>
                  <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.primary} />
                  <Text style={styles.signInToCommentText}>Sign in to comment</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.dark.primary} style={{ marginLeft: "auto" }} />
                </Pressable>
              )}

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

            <View style={{ height: 120 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Comment 3-dot menu - centered card modal */}
      <Modal
        visible={!!commentMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentMenuModal(null)}
      >
        <Pressable style={styles.centeredOverlay} onPress={() => setCommentMenuModal(null)}>
          <Pressable style={styles.centeredCard} onPress={() => {}}>
            <View style={styles.centeredCardHandle} />
            {commentMenuModal?.isOwner ? (
              <Pressable
                onPress={() => commentMenuModal && handleDeleteComment(commentMenuModal.id)}
                disabled={deletingCommentId === commentMenuModal?.id}
                style={styles.menuCardOption}
              >
                {deletingCommentId === commentMenuModal?.id ? (
                  <ActivityIndicator size="small" color={Colors.dark.danger} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={Colors.dark.danger} />
                )}
                <Text style={[styles.menuCardOptionText, { color: Colors.dark.danger }]}>Delete Comment</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  const cid = commentMenuModal?.id;
                  setCommentMenuModal(null);
                  if (cid) setCommentReportModal(cid);
                }}
                style={styles.menuCardOption}
              >
                <Ionicons name="flag-outline" size={20} color={Colors.dark.warning} />
                <Text style={[styles.menuCardOptionText, { color: Colors.dark.warning }]}>Report Comment</Text>
              </Pressable>
            )}
            <View style={styles.menuCardDivider} />
            <Pressable onPress={() => setCommentMenuModal(null)} style={styles.menuCardCancel}>
              <Text style={styles.menuCardCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Comment report - centered card */}
      <Modal
        visible={!!commentReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentReportModal(null)}
      >
        <Pressable style={styles.centeredOverlay} onPress={() => setCommentReportModal(null)}>
          <Pressable style={styles.reportCard2} onPress={() => {}}>
            <Text style={styles.reportCardTitle}>Report</Text>
            <Text style={styles.reportCardSubtitle}>
              What's going on?{"\n"}
              <Text style={styles.reportCardNote}>
                We'll check for all community guidelines, so don't worry about making the perfect choice.
              </Text>
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
    </>
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
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  backLink: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.dark.primaryDim, borderRadius: 12 },
  backLinkText: { color: Colors.dark.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.surfaceBorder,
  },
  navBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.surface,
    alignItems: "center", justifyContent: "center",
  },
  navTitle: {
    flex: 1, fontSize: 17, fontFamily: "Inter_700Bold",
    color: Colors.dark.text, textAlign: "center",
  },
  navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  navActionBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.surface,
    alignItems: "center", justifyContent: "center",
  },
  followBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  followBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  followBtnTextActive: { color: Colors.dark.primary },
  followCount: {
    fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.dark.primary,
    backgroundColor: Colors.dark.primaryDim, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, minWidth: 20, textAlign: "center",
  },

  scrollContent: { padding: 16 },

  // Sign-in banner
  signInBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.primaryDim,
    borderWidth: 1.5, borderColor: Colors.dark.primary,
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  signInBannerIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.primary + "60",
  },
  signInBannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  signInBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },
  signInBannerArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dark.primary + "20",
    alignItems: "center", justifyContent: "center",
  },

  contentCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  contentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  typeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.dark.primaryDim },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.primary, letterSpacing: 0.8 },
  contentText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.dark.text, lineHeight: 22, marginBottom: 12 },
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
  sendBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center" },

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
  },
  commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  commentMenuBtn: { padding: 4 },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text, lineHeight: 20, marginBottom: 10 },
  commentTextDeleted: { color: Colors.dark.textMuted, fontStyle: "italic" },
  commentActions: { flexDirection: "row", gap: 16, alignItems: "center" },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  commentActionCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },

  // Replies
  repliesToggleRow: {
    flexDirection: "row", alignItems: "center",
    marginLeft: 20, marginBottom: 4, marginTop: -2,
  },
  repliesLine: {
    width: 20, height: 1,
    backgroundColor: Colors.dark.primary + "40",
    marginRight: 6,
  },
  repliesToggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  repliesToggleText: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary,
  },
  repliesContainer: { marginLeft: 14, marginBottom: 6 },
  showMoreRepliesBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  showMoreRepliesText: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary,
  },

  loadMoreBtn: {
    alignItems: "center", paddingVertical: 14,
    backgroundColor: Colors.dark.surface, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  // Centered overlay for modals
  centeredOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center", alignItems: "center",
  },
  centeredCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    padding: 8, width: "85%", maxWidth: 340,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  centeredCardHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.dark.surfaceBorder, alignSelf: "center", marginBottom: 8,
  },
  menuCardOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12,
  },
  menuCardOptionText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuCardDivider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginHorizontal: 8 },
  menuCardCancel: { alignItems: "center", paddingVertical: 16 },
  menuCardCancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },

  // Report modal card
  reportCard2: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    padding: 20, width: "90%", maxWidth: 380,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  reportCardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 8 },
  reportCardSubtitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, marginBottom: 4 },
  reportCardNote: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary },
  reportCardOption: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14,
  },
  reportCardOptionBorder: {
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  reportCardOptionText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.text, flex: 1 },
  reportCardCancel: { alignItems: "center", paddingVertical: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder },
  reportCardCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.danger },
});
