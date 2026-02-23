import { useEffect, useState, useCallback } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

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
  user: { displayName: string };
}

const REPORT_TYPES = [
  { key: "safe", label: "Safe", icon: "shield-checkmark", color: Colors.dark.safe, bg: Colors.dark.safeDim },
  { key: "scam", label: "Scam", icon: "warning", color: Colors.dark.danger, bg: Colors.dark.dangerDim },
  { key: "fake", label: "Fake", icon: "close-circle", color: Colors.dark.warning, bg: Colors.dark.warningDim },
  { key: "spam", label: "Spam", icon: "mail-unread", color: Colors.dark.accent, bg: Colors.dark.accentDim },
];

export default function QrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  const [qrCode, setQrCode] = useState<QrDetail | null>(null);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [totalScans, setTotalScans] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [userReport, setUserReport] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [commentsLimited, setCommentsLimited] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reportLoading, setReportLoading] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const loadData = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [qrRes, commentsRes] = await Promise.all([
        fetch(`${baseUrl}api/qr/${id}`, { headers }),
        fetch(`${baseUrl}api/qr/${id}/comments`, { headers }),
      ]);

      if (qrRes.ok) {
        const qrData = await qrRes.json();
        setQrCode(qrData.qrCode);
        setReportCounts(qrData.reportCounts || {});
        setTotalScans(qrData.totalScans || 0);
        setTotalComments(qrData.totalComments || 0);
        if (qrData.userReport) {
          setUserReport(qrData.userReport.reportType);
        }
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setCommentsList(commentsData.comments || []);
        setCommentsLimited(commentsData.limited || false);
      }
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/qr/${id}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reportType: type }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportCounts(data.reportCounts);
        setUserReport(type);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setReportLoading(null);
    }
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
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/qr/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function getTrustScore(): { score: number; label: string; color: string } {
    const total =
      (reportCounts.safe || 0) +
      (reportCounts.scam || 0) +
      (reportCounts.fake || 0) +
      (reportCounts.spam || 0);

    if (total === 0) return { score: -1, label: "No Reports", color: Colors.dark.textMuted };

    const safeRatio = (reportCounts.safe || 0) / total;
    if (safeRatio >= 0.7) return { score: safeRatio * 100, label: "Trusted", color: Colors.dark.safe };
    if (safeRatio >= 0.4) return { score: safeRatio * 100, label: "Caution", color: Colors.dark.warning };
    return { score: safeRatio * 100, label: "Dangerous", color: Colors.dark.danger };
  }

  function handleOpenContent() {
    if (!qrCode) return;
    if (qrCode.contentType === "url") {
      Linking.openURL(qrCode.content).catch(() => {});
    }
  }

  const trust = getTrustScore();

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </View>
    );
  }

  if (!qrCode) {
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
          <View style={{ width: 40 }} />
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
                  style={({ pressed }) => [
                    styles.openBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="open-outline" size={16} color={Colors.dark.primary} />
                  <Text style={styles.openBtnText}>Open Link</Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <View style={styles.trustCard}>
              <View style={styles.trustHeader}>
                <Text style={styles.sectionTitle}>Trust Score</Text>
                <View style={[styles.trustBadge, { backgroundColor: trust.color + "22" }]}>
                  <View style={[styles.trustDot, { backgroundColor: trust.color }]} />
                  <Text style={[styles.trustLabel, { color: trust.color }]}>
                    {trust.label}
                  </Text>
                </View>
              </View>

              {trust.score >= 0 ? (
                <View style={styles.trustBarContainer}>
                  <View style={styles.trustBarBg}>
                    <View
                      style={[
                        styles.trustBarFill,
                        {
                          width: `${trust.score}%`,
                          backgroundColor: trust.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.trustPercent}>
                    {Math.round(trust.score)}% Safe
                  </Text>
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
                    <Text style={[styles.reportLabel, { color: rt.color }]}>
                      {rt.label}
                    </Text>
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
              <Text style={styles.sectionTitle}>Comments</Text>
              {commentsLimited ? (
                <View style={styles.limitedBadge}>
                  <Ionicons name="lock-closed" size={12} color={Colors.dark.warning} />
                  <Text style={styles.limitedText}>
                    Showing 6 of {totalComments}
                  </Text>
                </View>
              ) : null}
            </View>

            {commentsLimited && !user ? (
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={styles.unlockBanner}
              >
                <Ionicons name="sparkles" size={18} color={Colors.dark.accent} />
                <Text style={styles.unlockText}>
                  Sign in to see all comments and add yours
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
              </Pressable>
            ) : null}

            {user ? (
              <View style={styles.commentInput}>
                <TextInput
                  style={styles.commentTextInput}
                  placeholder="Add a comment..."
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
                    {
                      opacity: pressed || submitting || !newComment.trim() ? 0.5 : 1,
                    },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="send" size={18} color="#000" />
                  )}
                </Pressable>
              </View>
            ) : null}

            {commentsList.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={32} color={Colors.dark.textMuted} />
                <Text style={styles.noCommentsText}>No comments yet</Text>
              </View>
            ) : (
              commentsList.map((comment, i) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.user.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>
                        {comment.user.displayName}
                      </Text>
                      <Text style={styles.commentDate}>
                        {formatDate(comment.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </View>
              ))
            )}
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
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
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  backLinkText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 4,
  },
  contentCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.textSecondary,
    letterSpacing: 0.5,
  },
  contentText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
    lineHeight: 22,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dark.primaryDim,
  },
  openBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
  trustCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  trustHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trustLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  trustBarContainer: {
    gap: 6,
    marginBottom: 18,
  },
  trustBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.surfaceLight,
    overflow: "hidden",
  },
  trustBarFill: {
    height: 8,
    borderRadius: 4,
  },
  trustPercent: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.dark.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  sectionSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  reportCard: {
    width: "47%",
    flexGrow: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  limitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.warningDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  limitedText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.warning,
  },
  unlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.accentDim,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.2)",
  },
  unlockText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 16,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 14,
    padding: 14,
    paddingTop: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  noComments: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  noCommentsText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  commentDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  commentText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
});
