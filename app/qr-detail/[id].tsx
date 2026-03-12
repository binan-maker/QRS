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
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
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
  { label: "Inappropriate content", value: "inappropriate" },
  { label: "Sensitive or disturbing", value: "sensitive" },
  { label: "Harmful or dangerous", value: "harmful" },
];

function detectPaymentApp(content: string) {
  for (const app of PAYMENT_APPS) {
    if (content.toLowerCase().startsWith(app.prefix)) return app;
  }
  if (content.toLowerCase().includes("upi://")) return PAYMENT_APPS[0];
  return null;
}

const COMMENTS_PER_PAGE = 20;

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
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [commentReportModal, setCommentReportModal] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // Fetch user like status for comments whenever commentsList changes
  useEffect(() => {
    if (!user || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, user.id).then((likes) => {
      setUserLikes((prev) => ({ ...prev, ...likes }));
    });
  }, [commentsList, user?.id, id]);

  // Load initial QR data (one-shot: favorites, following, user report)
  useEffect(() => {
    setLoadError(false);
    loadQrDetail(id, user?.id || null)
      .then((detail) => {
        if (!detail) {
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
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, [id, user?.id]);

  // Real-time subscription: QR scan/comment counts
  useEffect(() => {
    const unsub = subscribeToQrStats(id, ({ scanCount, commentCount }) => {
      setTotalScans(scanCount);
      setTotalComments(commentCount);
    });
    return unsub;
  }, [id]);

  // Real-time subscription: report counts → trust score
  useEffect(() => {
    const unsub = subscribeToQrReports(id, (counts) => {
      setReportCounts(counts);
      setTrustScore(calculateTrustScore(counts));
    });
    return unsub;
  }, [id]);

  // Real-time subscription: live comments (first page)
  useEffect(() => {
    const pageLimit = user ? COMMENTS_PER_PAGE : 6;
    const unsub = subscribeToComments(id, pageLimit, (liveComments) => {
      setCommentsList(liveComments);
    });
    return unsub;
  }, [id, user?.id]);

  // Load more (paginated, non-realtime)
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
    if (!user) {
      Alert.alert("Sign In Required", "You need to sign in to report QR codes.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
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
    if (!user) {
      Alert.alert("Sign In Required", "Sign in to add favorites.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    if (!qrCode) return;
    setFavoriteLoading(true);
    try {
      const newFav = await toggleFavorite(id, user.id, qrCode.content, qrCode.contentType);
      setIsFavorite(newFav);
      Haptics.impactAsync(
        newFav ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      );
    } catch {}
    setFavoriteLoading(false);
  }

  async function handleToggleFollow() {
    if (!user) {
      Alert.alert("Sign In Required", "Sign in to follow QR codes.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
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
    if (!user) {
      Alert.alert("Sign In Required", "You need to sign in to comment.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
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
    if (!user) {
      Alert.alert("Sign In Required", "Sign in to like comments.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
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
        prev.map((c) =>
          c.id !== commentId
            ? c
            : { ...c, likeCount: data.likes, dislikeCount: data.dislikes }
        )
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  async function handleCommentReport(commentId: string, reason: string) {
    setCommentReportModal(null);
    if (!user) return;
    try {
      await reportComment(id, commentId, user.id, reason);
      Alert.alert("Reported", "This comment has been reported for review.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  async function handleDeleteComment(commentId: string) {
    if (!user) return;
    setCommentMenuId(null);
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
          } catch (e: any) {
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
    if (qrCode.contentType === "url") {
      Linking.openURL(qrCode.content).catch(() => Alert.alert("Error", "Could not open link"));
    } else if (qrCode.contentType === "payment") {
      Linking.openURL(qrCode.content).catch(() =>
        Alert.alert("Error", "No payment app found for this QR code. Please install a UPI-compatible payment app.")
      );
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
    const total =
      (reportCounts.safe || 0) + (reportCounts.scam || 0) +
      (reportCounts.fake || 0) + (reportCounts.spam || 0);
    if (total === 0) return { score: -1, label: "No Reports", color: Colors.dark.textMuted };
    const safeRatio = (reportCounts.safe || 0) / total;
    if (safeRatio >= 0.7) return { score: safeRatio * 100, label: "Trusted", color: Colors.dark.safe };
    if (safeRatio >= 0.4) return { score: safeRatio * 100, label: "Caution", color: Colors.dark.warning };
    return { score: safeRatio * 100, label: "Dangerous", color: Colors.dark.danger };
  }

  const trust = getTrustInfo();
  const paymentApp = qrCode ? detectPaymentApp(qrCode.content) : null;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </View>
    );
  }

  if (!qrCode || loadError) {
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

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.dark.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.container, { paddingTop: topInset }]}>
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
            </Pressable>
            <Text style={styles.navTitle}>QR Details</Text>
            <View style={styles.navActions}>
              <Pressable
                onPress={handleToggleFavorite}
                disabled={favoriteLoading}
                style={styles.navActionBtn}
              >
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
                    {followCount > 0 ? (
                      <Text style={styles.followCount}>{followCount}</Text>
                    ) : null}
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
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.contentCard}>
                <View style={styles.contentHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                    <MaterialCommunityIcons name="qrcode" size={28} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {qrCode.contentType.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.contentText} selectable numberOfLines={4}>
                  {qrCode.content}
                </Text>

                {qrCode.contentType === "url" ? (
                  <Pressable
                    onPress={handleOpenContent}
                    style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Ionicons name="open-outline" size={16} color={Colors.dark.primary} />
                    <Text style={styles.openBtnText}>Open Link</Text>
                  </Pressable>
                ) : null}

                {qrCode.contentType === "payment" && paymentApp ? (
                  <View style={styles.paymentActions}>
                    <Pressable
                      onPress={handleOpenContent}
                      style={({ pressed }) => [styles.paymentBtn, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Ionicons name={paymentApp.icon as any} size={18} color="#000" />
                      <Text style={styles.paymentBtnText}>Pay with {paymentApp.name}</Text>
                    </Pressable>
                    <Text style={styles.paymentWarning}>
                      Always verify the recipient before paying
                    </Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>

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
                      <View
                        style={[styles.trustBarFill, { width: `${Math.min(trust.score, 100)}%`, backgroundColor: trust.color }]}
                      />
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
                    <Text style={styles.statValue}>
                      {Object.values(reportCounts).reduce((a, b) => a + b, 0)}
                    </Text>
                    <Text style={styles.statLabel}>Reports</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <Text style={styles.sectionTitle}>Report This QR</Text>
              <Text style={styles.sectionSubtext}>
                {user ? "Tap to submit your report" : "Sign in to report"}
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
                        {
                          borderColor: isSelected ? rt.color : Colors.dark.surfaceBorder,
                          backgroundColor: isSelected ? rt.bg : Colors.dark.surface,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      {reportLoading === rt.key ? (
                        <ActivityIndicator size="small" color={rt.color} />
                      ) : (
                        <Ionicons name={rt.icon as any} size={24} color={rt.color} />
                      )}
                      <Text style={[styles.reportLabel, { color: rt.color }]}>{rt.label}</Text>
                      <Text style={styles.reportCount}>{count}</Text>
                      {isSelected ? (
                        <View style={[styles.selectedDot, { backgroundColor: rt.color }]} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

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
                      style={({ pressed }) => [
                        styles.sendBtn,
                        { opacity: pressed || submitting || !newComment.trim() ? 0.5 : 1 },
                      ]}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Ionicons name="send" size={18} color="#000" />
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => router.push("/(auth)/login")}
                  style={styles.signInToComment}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.primary} />
                  <Text style={styles.signInToCommentText}>Sign in to comment</Text>
                </Pressable>
              )}

              {commentsList.length === 0 ? (
                <View style={styles.noComments}>
                  <Ionicons name="chatbubbles-outline" size={32} color={Colors.dark.textMuted} />
                  <Text style={styles.noCommentsText}>No comments yet</Text>
                  <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts</Text>
                </View>
              ) : (
                commentsList.map((comment) => {
                  const currentUserLike = userLikes[comment.id] ?? null;
                  const isOwner = user?.id === comment.userId;
                  return (
                    <Animated.View key={comment.id} entering={FadeIn.duration(300)}>
                      <View style={[
                        styles.commentItem,
                        comment.parentId ? styles.replyItem : null,
                      ]}>
                        {comment.parentId ? (
                          <View style={styles.replyLine} />
                        ) : null}
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAvatar}>
                            <Text style={styles.commentAvatarText}>
                              {comment.isDeleted ? "?" : comment.user.displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.commentAuthor}>
                              {smartName(comment.user.displayName)}
                            </Text>
                            <Text style={styles.commentTime}>
                              {formatRelativeTime(comment.createdAt)}
                            </Text>
                          </View>
                          {!comment.isDeleted ? (
                            <Pressable
                              onPress={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                              style={styles.commentMenuBtn}
                            >
                              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.dark.textMuted} />
                            </Pressable>
                          ) : null}
                        </View>

                        <Text style={[
                          styles.commentText,
                          comment.isDeleted && styles.commentTextDeleted,
                        ]}>
                          {comment.text}
                        </Text>

                        {!comment.isDeleted ? (
                          <View style={styles.commentActions}>
                            <Pressable
                              onPress={() => handleCommentLike(comment.id, "like")}
                              style={styles.commentActionBtn}
                            >
                              <Ionicons
                                name={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
                                size={16}
                                color={currentUserLike === "like" ? Colors.dark.safe : Colors.dark.textMuted}
                              />
                              {comment.likeCount > 0 ? (
                                <Text style={[
                                  styles.commentActionCount,
                                  currentUserLike === "like" && { color: Colors.dark.safe },
                                ]}>
                                  {comment.likeCount}
                                </Text>
                              ) : null}
                            </Pressable>
                            <Pressable
                              onPress={() => handleCommentLike(comment.id, "dislike")}
                              style={styles.commentActionBtn}
                            >
                              <Ionicons
                                name={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                                size={16}
                                color={currentUserLike === "dislike" ? Colors.dark.danger : Colors.dark.textMuted}
                              />
                              {comment.dislikeCount > 0 ? (
                                <Text style={[
                                  styles.commentActionCount,
                                  currentUserLike === "dislike" && { color: Colors.dark.danger },
                                ]}>
                                  {comment.dislikeCount}
                                </Text>
                              ) : null}
                            </Pressable>
                            {user ? (
                              <Pressable
                                onPress={() => setReplyTo({ id: comment.id, author: comment.user.displayName })}
                                style={styles.commentActionBtn}
                              >
                                <Ionicons name="return-down-forward-outline" size={16} color={Colors.dark.textMuted} />
                                <Text style={styles.commentActionCount}>Reply</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}

                        {/* Comment context menu */}
                        {commentMenuId === comment.id ? (
                          <View style={styles.commentMenu}>
                            {isOwner ? (
                              <Pressable
                                onPress={() => handleDeleteComment(comment.id)}
                                style={styles.commentMenuItem}
                                disabled={deletingCommentId === comment.id}
                              >
                                {deletingCommentId === comment.id ? (
                                  <ActivityIndicator size="small" color={Colors.dark.danger} />
                                ) : (
                                  <Ionicons name="trash-outline" size={16} color={Colors.dark.danger} />
                                )}
                                <Text style={[styles.commentMenuText, { color: Colors.dark.danger }]}>
                                  Delete
                                </Text>
                              </Pressable>
                            ) : null}
                            {!isOwner ? (
                              <Pressable
                                onPress={() => {
                                  setCommentMenuId(null);
                                  setCommentReportModal(comment.id);
                                }}
                                style={styles.commentMenuItem}
                              >
                                <Ionicons name="flag-outline" size={16} color={Colors.dark.warning} />
                                <Text style={[styles.commentMenuText, { color: Colors.dark.warning }]}>
                                  Report
                                </Text>
                              </Pressable>
                            ) : null}
                            <Pressable
                              onPress={() => setCommentMenuId(null)}
                              style={styles.commentMenuItem}
                            >
                              <Ionicons name="close" size={16} color={Colors.dark.textMuted} />
                              <Text style={styles.commentMenuText}>Cancel</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </Animated.View>
                  );
                })
              )}

              {hasMoreComments ? (
                <Pressable
                  onPress={loadMoreComments}
                  disabled={commentsLoading}
                  style={styles.loadMoreBtn}
                >
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

      {/* Comment report modal */}
      <Modal
        visible={!!commentReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentReportModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCommentReportModal(null)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Report Comment</Text>
            <Text style={styles.modalSubtitle}>Why are you reporting this?</Text>
            {COMMENT_REPORT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => handleCommentReport(commentReportModal!, r.value)}
                style={({ pressed }) => [styles.modalOption, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.modalOptionText}>{r.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
              </Pressable>
            ))}
            <Pressable onPress={() => setCommentReportModal(null)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  backLink: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.dark.primaryDim,
    borderRadius: 12,
  },
  backLinkText: {
    color: Colors.dark.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.surfaceBorder,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  followBtnActive: {
    backgroundColor: Colors.dark.primaryDim,
    borderColor: Colors.dark.primary,
  },
  followBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  followBtnTextActive: {
    color: Colors.dark.primary,
  },
  followCount: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
  },
  contentCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.primaryDim,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
    letterSpacing: 0.8,
  },
  contentText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.primaryDim,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.dark.primary + "40",
  },
  openBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
  paymentActions: {
    gap: 8,
  },
  paymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  paymentBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  paymentWarning: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.warning,
  },
  trustCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  trustHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trustLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  trustBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  trustBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.surfaceLight,
    overflow: "hidden",
  },
  trustBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  trustPercent: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    minWidth: 60,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.dark.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 6,
  },
  sectionSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 12,
  },
  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  reportCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
    position: "relative",
  },
  reportLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  reportCount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  selectedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  commentsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentCountBadge: {
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  commentCountText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.dark.safeDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.safe,
  },
  liveText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.safe,
  },
  commentInputContainer: {
    marginBottom: 16,
    gap: 8,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.primaryDim,
    padding: 10,
    borderRadius: 10,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  commentTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  signInToComment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.primaryDim,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary + "40",
  },
  signInToCommentText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
  noComments: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    marginBottom: 16,
  },
  noCommentsText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  noCommentsSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  commentItem: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    position: "relative",
  },
  replyItem: {
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: Colors.dark.primary + "40",
  },
  replyLine: {
    display: "none",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  commentMenuBtn: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  commentTextDeleted: {
    color: Colors.dark.textMuted,
    fontStyle: "italic",
  },
  commentActions: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  commentActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  commentActionCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  commentMenu: {
    marginTop: 8,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    overflow: "hidden",
  },
  commentMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  commentMenuText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.surfaceBorder,
  },
  modalOptionText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  modalCancel: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.danger,
  },
});
