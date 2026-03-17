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
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
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
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserGeneratedQrs,
  updateQrDesign,
  setQrActiveState,
  subscribeToComments,
  addComment,
  ownerHideComment,
  softDeleteComment,
  getGuardLink,
  updateGuardLinkDestination,
  getQrFollowersList,
  getQrFollowCount,
  type GeneratedQrItem,
  type CommentItem,
  type GuardLink,
  type FollowerInfo,
} from "@/lib/firestore-service";

function SkeletonBox({ width, height = 12, borderRadius = 8, style }: { width?: any; height?: number; borderRadius?: number; style?: any }) {
  const shimmer = useSharedValue(0.3);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(withTiming(1, { duration: 750 }), withTiming(0.3, { duration: 750 })), -1, true);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return <Animated.View style={[{ width: width || "100%", height, borderRadius, backgroundColor: Colors.dark.surfaceLight }, anim, style]} />;
}

function SkeletonCommentItem() {
  return (
    <View style={{ flexDirection: "row", gap: 10, padding: 12 }}>
      <SkeletonBox width={34} height={34} borderRadius={17} />
      <View style={{ flex: 1, gap: 8, paddingTop: 2 }}>
        <SkeletonBox width="40%" height={11} />
        <SkeletonBox width="90%" height={12} />
        <SkeletonBox width="60%" height={12} />
      </View>
    </View>
  );
}

type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

const FG_COLORS = [
  { color: "#0A0E17", label: "Dark" },
  { color: "#1e3a5f", label: "Navy" },
  { color: "#7C3AED", label: "Purple" },
  { color: "#10B981", label: "Green" },
  { color: "#EF4444", label: "Red" },
  { color: "#F59E0B", label: "Amber" },
  { color: "#000000", label: "Black" },
];

const BG_COLORS = [
  { color: "#F8FAFC", label: "Light" },
  { color: "#FFFFFF", label: "White" },
  { color: "#E0F2FE", label: "Sky" },
  { color: "#FEF3C7", label: "Cream" },
  { color: "#F0FDF4", label: "Mint" },
];

const LOGO_POSITIONS: { key: LogoPosition; label: string }[] = [
  { key: "center", label: "Center" },
  { key: "top-left", label: "Top Left" },
  { key: "top-right", label: "Top Right" },
  { key: "bottom-left", label: "Bot. Left" },
  { key: "bottom-right", label: "Bot. Right" },
];

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

function timeAgo(iso: string) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ""; }
}

export default function MyQrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const svgRef = useRef<any>(null);
  const commentInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

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

  // Living Shield state
  const [guardLink, setGuardLink] = useState<GuardLink | null>(null);
  const [editingDestination, setEditingDestination] = useState(false);
  const [newDestination, setNewDestination] = useState("");
  const [savingDestination, setSavingDestination] = useState(false);

  // Followers state
  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followCount, setFollowCount] = useState(0);

  // Custom color picker state
  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [customColorTarget, setCustomColorTarget] = useState<"fg" | "bg">("fg");
  const [customColorInput, setCustomColorInput] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = insets.bottom;

  const loadQr = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    setLoading(true);
    try {
      const all = await getUserGeneratedQrs(userId);
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

  useEffect(() => {
    loadQr();
  }, [loadQr]);

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
    if (customColorTarget === "fg") {
      setFgColor(hex);
    } else {
      setBgColor(hex);
    }
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
      await addComment(
        qrItem.qrCodeId,
        user.id,
        user.displayName,
        commentText.trim(),
        replyTo?.id || null
      );
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
    const isOwnComment = user.id === commentUserId;
    Alert.alert(
      isOwnComment ? "Delete comment?" : "Remove comment?",
      isOwnComment ? "This cannot be undone." : "This will hide the comment from everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isOwnComment ? "Delete" : "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              if (isOwnComment) {
                await softDeleteComment(qrItem.qrCodeId, commentId, user.id);
              } else {
                await ownerHideComment(qrItem.qrCodeId, commentId);
              }
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

  const logoSource = require("../../assets/images/icon.png");

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.navTitle}>My QR Code</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: Colors.dark.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, alignItems: "center", paddingVertical: 32, gap: 16 }}>
            <SkeletonBox width={200} height={200} borderRadius={16} />
            <SkeletonBox width={160} height={12} />
          </View>
          <View style={{ backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 16, gap: 12 }}>
            <SkeletonBox width="30%" height={10} />
            <SkeletonBox width="100%" height={14} />
            <SkeletonBox width="70%" height={14} />
          </View>
          <View style={{ backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 16, gap: 12 }}>
            <SkeletonBox width="40%" height={10} />
            <SkeletonBox width="100%" height={40} borderRadius={12} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!qrItem) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.navTitle}>My QR Code</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>QR code not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>My QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={topInset + 60}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* QR Preview Card */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.previewCard}>
              <View style={[styles.qrBg, { backgroundColor: bgColor }]}>
                <QRCode
                  value={qrItem.content || "https://qrguard.app"}
                  size={200}
                  color={fgColor}
                  backgroundColor={bgColor}
                  getRef={(ref: any) => { svgRef.current = ref; }}
                  logo={logoPosition === "center" ? logoSource : undefined}
                  logoSize={44}
                  logoBackgroundColor={bgColor}
                  logoBorderRadius={10}
                  logoMargin={4}
                  quietZone={10}
                  ecl="H"
                />
                {logoSource && logoPosition !== "center" && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.cornerLogoWrapper,
                      logoPosition === "top-left" && { top: 10, left: 10 },
                      logoPosition === "top-right" && { top: 10, right: 10 },
                      logoPosition === "bottom-left" && { bottom: 10, left: 10 },
                      logoPosition === "bottom-right" && { bottom: 10, right: 10 },
                    ]}
                  >
                    <Image source={logoSource} style={styles.cornerLogoImg} />
                  </View>
                )}
              </View>

              {qrItem.branded && qrItem.uuid ? (
                <View style={styles.uuidRow}>
                  <Ionicons name="shield-checkmark" size={13} color={Colors.dark.safe} />
                  <Text style={styles.uuidText}>{qrItem.uuid}</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {/* QR Metadata (read-only) */}
          <Animated.View entering={FadeInDown.duration(400).delay(60)}>
            <View style={styles.metaCard}>
              <Text style={styles.sectionLabel}>QR INFO</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                <View style={{ flex: 1, backgroundColor: Colors.dark.primaryDim, borderRadius: 14,
                  padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.dark.primary + "30" }}>
                  <Ionicons name="scan-outline" size={20} color={Colors.dark.primary} />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.primary, lineHeight: 26 }}>
                    {qrItem.scanCount}
                  </Text>
                  <Text style={[styles.metaLabel, { marginBottom: 0, textAlign: "center" }]}>Scans</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: Colors.dark.accentDim, borderRadius: 14,
                  padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.dark.accent + "30" }}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.dark.accent} />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.accent, lineHeight: 26 }}>
                    {qrItem.commentCount}
                  </Text>
                  <Text style={[styles.metaLabel, { marginBottom: 0, textAlign: "center" }]}>Comments</Text>
                </View>
                <Pressable
                  onPress={() => {
                    handleLoadFollowers();
                    setFollowersModalOpen(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{ flex: 1, backgroundColor: "#10B98115", borderRadius: 14,
                    padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#10B98130" }}
                >
                  <Ionicons name="people-outline" size={20} color="#10B981" />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#10B981", lineHeight: 26 }}>
                    {followCount}
                  </Text>
                  <Text style={[styles.metaLabel, { marginBottom: 0, textAlign: "center" }]}>Followers</Text>
                </Pressable>
              </View>
              <View style={styles.divider} />
              {!(qrItem.qrType === "business" && qrItem.guardUuid) && (
              <View style={styles.metaContentRow}>
                <Text style={styles.metaLabel}>Destination (read-only)</Text>
                <View style={styles.lockedRow}>
                  <Ionicons name="lock-closed" size={12} color={Colors.dark.textMuted} />
                  <Text style={styles.metaContentValue} numberOfLines={2}>
                    {qrItem.content}
                  </Text>
                </View>
                <Pressable
                  onPress={async () => {
                    if (qrItem.content) {
                      await Clipboard.setStringAsync(qrItem.content);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert("Copied!", "QR content copied to clipboard.");
                    }
                  }}
                  style={({ pressed }) => [{
                    flexDirection: "row" as const, alignItems: "center" as const, gap: 6,
                    backgroundColor: Colors.dark.surfaceLight, borderRadius: 10,
                    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
                    paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" as const, marginTop: 8,
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Ionicons name="copy-outline" size={13} color={Colors.dark.textSecondary} />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textSecondary }}>Copy Content</Text>
                </Pressable>
              </View>
              )}
              <View style={styles.metaContentRow}>
                <Text style={styles.metaLabel}>Created</Text>
                <Text style={styles.metaValue}>{formatDate(qrItem.createdAt)}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Living Shield — only for Business QRs with a guardUuid */}
          {qrItem.qrType === "business" && qrItem.guardUuid && (
            <Animated.View entering={FadeInDown.duration(400).delay(70)}>
              <View style={[styles.metaCard, { marginTop: 0, borderColor: "#FBBF2430" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ backgroundColor: "#FBBF2418", borderRadius: 8, padding: 6 }}>
                    <Ionicons name="shield" size={16} color="#FBBF24" />
                  </View>
                  <Text style={[styles.sectionLabel, { color: "#FBBF24", marginBottom: 0 }]}>LIVING SHIELD</Text>
                  {guardLink?.destinationChangedAt &&
                    (Date.now() - new Date(guardLink.destinationChangedAt).getTime()) < 86400000 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4,
                      backgroundColor: "#d9770618", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Ionicons name="warning-outline" size={11} color="#f97316" />
                      <Text style={{ fontSize: 10, color: "#f97316", fontFamily: "Inter_600SemiBold" }}>Caution Active</Text>
                    </View>
                  )}
                </View>

                {guardLink ? (
                  <>
                    <Text style={[styles.metaLabel, { marginBottom: 4 }]}>Current Destination</Text>
                    {editingDestination ? (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          value={newDestination}
                          onChangeText={setNewDestination}
                          placeholder="https://your-new-destination.com"
                          placeholderTextColor={Colors.dark.textMuted}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                          style={{
                            backgroundColor: Colors.dark.background,
                            borderRadius: 10, borderWidth: 1, borderColor: "#FBBF2450",
                            color: Colors.dark.text, fontFamily: "Inter_400Regular",
                            fontSize: 13, padding: 10,
                          }}
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            onPress={handleUpdateDestination}
                            disabled={savingDestination || !newDestination.trim()}
                            style={[{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                              gap: 6, backgroundColor: "#FBBF24", borderRadius: 10, paddingVertical: 10 },
                              { opacity: savingDestination ? 0.6 : 1 }]}
                          >
                            {savingDestination
                              ? <ActivityIndicator size={14} color="#000" />
                              : <Ionicons name="checkmark" size={16} color="#000" />}
                            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" }}>Save</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => { setEditingDestination(false); setNewDestination(guardLink.currentDestination); }}
                            style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.dark.surfaceLight,
                              borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                          >
                            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.textSecondary }}>Cancel</Text>
                          </Pressable>
                        </View>
                        <Text style={{ fontSize: 11, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular", lineHeight: 16 }}>
                          Changing the destination triggers a 24-hour caution period. Previous positive reviews remain visible but clearly labelled as pre-change.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        <View style={{ backgroundColor: Colors.dark.background, borderRadius: 10,
                          borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 10 }}>
                          <Text style={{ fontSize: 13, color: Colors.dark.accent, fontFamily: "Inter_400Regular",
                            lineHeight: 18 }} numberOfLines={3}>
                            {guardLink.currentDestination}
                          </Text>
                        </View>
                        {guardLink.previousDestination ? (
                          <Text style={{ fontSize: 11, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" }}>
                            Previous: {guardLink.previousDestination.length > 50
                              ? guardLink.previousDestination.slice(0, 50) + "…"
                              : guardLink.previousDestination}
                          </Text>
                        ) : null}
                        <Pressable
                          onPress={() => setEditingDestination(true)}
                          style={({ pressed }) => [{
                            flexDirection: "row" as const, alignItems: "center" as const, gap: 6,
                            backgroundColor: "#FBBF2418", borderRadius: 10,
                            borderWidth: 1, borderColor: "#FBBF2440",
                            paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" as const,
                            opacity: pressed ? 0.7 : 1,
                          }]}
                        >
                          <Ionicons name="pencil" size={13} color="#FBBF24" />
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FBBF24" }}>Update Destination</Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ fontSize: 13, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" }}>
                    Loading guard link…
                  </Text>
                )}
              </View>
            </Animated.View>
          )}

          {/* Activate / Deactivate — only for branded QRs */}
          {qrItem.branded && qrItem.qrType !== "government" && (
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <View style={[
                styles.metaCard,
                { marginTop: 0, borderLeftWidth: 4, overflow: "hidden",
                  borderLeftColor: qrItem.isActive ? Colors.dark.safe : Colors.dark.danger,
                  backgroundColor: qrItem.isActive ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)" }
              ]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5,
                    backgroundColor: qrItem.isActive ? Colors.dark.safe : Colors.dark.danger }} />
                  <Text style={[styles.sectionLabel, { marginBottom: 0, letterSpacing: 1.4,
                    color: qrItem.isActive ? Colors.dark.safe : Colors.dark.danger }]}>
                    {qrItem.isActive ? "ACTIVE" : "DEACTIVATED"}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular",
                  color: Colors.dark.textSecondary, marginBottom: 14, lineHeight: 20 }}>
                  {qrItem.isActive
                    ? "Your QR code is live. Scanners can view and follow its links."
                    : "Your QR code is off. Links are completely hidden from scanners."}
                </Text>
                {!qrItem.isActive && qrItem.deactivationMessage ? (
                  <Text style={styles.deactivationMsg} numberOfLines={3}>
                    "{qrItem.deactivationMessage}"
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => handleToggleActive(!qrItem.isActive)}
                  disabled={togglingActive}
                  style={[styles.toggleActiveBtn,
                    qrItem.isActive ? styles.toggleActiveBtnOn : styles.toggleActiveBtnOff,
                    { width: "100%", justifyContent: "center", paddingVertical: 13 }
                  ]}
                >
                  {togglingActive ? (
                    <ActivityIndicator size={14} color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={qrItem.isActive ? "pause-circle" : "play-circle"}
                        size={18} color="#fff"
                      />
                      <Text style={[styles.toggleActiveBtnText, { fontSize: 14 }]}>
                        {qrItem.isActive ? "Deactivate QR Code" : "Activate QR Code"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Design Editor */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Pressable
              style={styles.designHeader}
              onPress={() => {
                setDesignOpen((v) => !v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.designHeaderLeft}>
                <View style={[styles.metaIconWrap, { backgroundColor: Colors.dark.accentDim }]}>
                  <MaterialCommunityIcons name="palette-outline" size={16} color={Colors.dark.accent} />
                </View>
                <Text style={styles.designHeaderText}>Edit Design</Text>
                {designDirty ? (
                  <View style={styles.dirtyDot} />
                ) : null}
              </View>
              <Ionicons
                name={designOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.dark.textMuted}
              />
            </Pressable>

            {designOpen && (
              <View style={styles.designPanel}>
                {/* Foreground (dots) color */}
                <Text style={styles.designLabel}>QR Dot Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={styles.swatchRow}>
                    {FG_COLORS.map(({ color, label }) => (
                      <Pressable
                        key={color}
                        onPress={() => { setFgColor(color); setDesignDirty(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[
                          styles.swatch,
                          { backgroundColor: color },
                          fgColor === color && styles.swatchSelected,
                        ]}
                      >
                        {fgColor === color ? (
                          <Ionicons name="checkmark" size={14} color={color === "#F8FAFC" || color === "#FFFFFF" ? "#000" : "#fff"} />
                        ) : null}
                      </Pressable>
                    ))}
                    {/* Custom color swatch */}
                    <Pressable
                      onPress={() => {
                        setCustomColorTarget("fg");
                        setCustomColorInput(fgColor);
                        setCustomColorOpen(true);
                      }}
                      style={[
                        styles.swatch,
                        { backgroundColor: Colors.dark.surfaceLight, borderColor: Colors.dark.primary + "60", borderStyle: "dashed" },
                        !FG_COLORS.find(c => c.color === fgColor) && { borderColor: Colors.dark.primary, borderWidth: 2 },
                      ]}
                    >
                      {!FG_COLORS.find(c => c.color === fgColor) ? (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: fgColor }} />
                      ) : (
                        <Ionicons name="color-palette-outline" size={16} color={Colors.dark.textMuted} />
                      )}
                    </Pressable>
                  </View>
                </ScrollView>
                {!FG_COLORS.find(c => c.color === fgColor) && (
                  <Text style={{ fontSize: 11, color: Colors.dark.primary, fontFamily: "Inter_500Medium", marginTop: -10, marginBottom: 10 }}>
                    Custom: {fgColor}
                  </Text>
                )}

                {/* Background color */}
                <Text style={styles.designLabel}>Background Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={styles.swatchRow}>
                    {BG_COLORS.map(({ color, label }) => (
                      <Pressable
                        key={color}
                        onPress={() => { setBgColor(color); setDesignDirty(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[
                          styles.swatch,
                          { backgroundColor: color, borderColor: bgColor === color ? Colors.dark.primary : Colors.dark.surfaceBorder },
                          bgColor === color && styles.swatchSelected,
                        ]}
                      >
                        {bgColor === color ? (
                          <Ionicons name="checkmark" size={14} color="#000" />
                        ) : null}
                      </Pressable>
                    ))}
                    {/* Custom color swatch */}
                    <Pressable
                      onPress={() => {
                        setCustomColorTarget("bg");
                        setCustomColorInput(bgColor);
                        setCustomColorOpen(true);
                      }}
                      style={[
                        styles.swatch,
                        { backgroundColor: Colors.dark.surfaceLight, borderColor: Colors.dark.primary + "60", borderStyle: "dashed" },
                        !BG_COLORS.find(c => c.color === bgColor) && { borderColor: Colors.dark.primary, borderWidth: 2 },
                      ]}
                    >
                      {!BG_COLORS.find(c => c.color === bgColor) ? (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bgColor }} />
                      ) : (
                        <Ionicons name="color-palette-outline" size={16} color={Colors.dark.textMuted} />
                      )}
                    </Pressable>
                  </View>
                </ScrollView>
                {!BG_COLORS.find(c => c.color === bgColor) && (
                  <Text style={{ fontSize: 11, color: Colors.dark.primary, fontFamily: "Inter_500Medium", marginTop: -10, marginBottom: 10 }}>
                    Custom: {bgColor}
                  </Text>
                )}

                {/* Logo — fixed app logo, always shown */}
                <Text style={styles.designLabel}>Logo</Text>
                <View style={styles.logoRow}>
                  <View style={[styles.logoPickerBtn, { opacity: 1 }]}>
                    <Image source={require("../../assets/images/icon.png")} style={styles.logoThumb} />
                    <Text style={styles.logoPickerLabel}>QR Guard Logo</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5,
                    backgroundColor: Colors.dark.primaryDim, borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.dark.primary + "30" }}>
                    <Ionicons name="shield-checkmark" size={13} color={Colors.dark.primary} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.primary }}>Mandatory</Text>
                  </View>
                </View>

                {/* Logo position */}
                <Text style={[styles.designLabel, { marginTop: 8 }]}>Logo Position</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={styles.positionRow}>
                    {LOGO_POSITIONS.map(({ key, label }) => (
                      <Pressable
                        key={key}
                        onPress={() => { setLogoPosition(key); setDesignDirty(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.positionBtn, logoPosition === key && styles.positionBtnActive]}
                      >
                        <Text style={[styles.positionBtnText, logoPosition === key && styles.positionBtnTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Save design */}
                <Pressable
                  onPress={handleSaveDesign}
                  disabled={!designDirty || saving}
                  style={({ pressed }) => [
                    styles.saveDesignBtn,
                    (!designDirty || saving) && { opacity: 0.5 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#000" />
                      <Text style={styles.saveDesignBtnText}>Save Design</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Comments Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(140)}>
            <View style={styles.commentsHeader}>
              <Text style={styles.sectionLabel}>COMMENTS</Text>
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{qrItem.commentCount}</Text>
              </View>
            </View>

            {commentsLoading ? (
              <View style={[styles.commentsList, { marginTop: 4 }]}>
                <View style={[styles.commentBlock, { overflow: "visible" }]}>
                  <SkeletonCommentItem />
                </View>
                <View style={[styles.commentBlock, { overflow: "visible" }]}>
                  <SkeletonCommentItem />
                </View>
                <View style={[styles.commentBlock, { overflow: "visible" }]}>
                  <SkeletonCommentItem />
                </View>
              </View>
            ) : topLevelComments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubbles-outline" size={32} color={Colors.dark.textMuted} />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSub}>Be the first to start the conversation</Text>
              </View>
            ) : (
              <View style={styles.commentsList}>
                {topLevelComments.map((comment) => {
                  const replies = getAllDescendants(comment.id);
                  const repliesExpanded = expandedReplies[comment.id];
                  return (
                    <View key={comment.id} style={styles.commentBlock}>
                      <CommentRow
                        comment={comment}
                        onReply={(c) => {
                          setReplyTo({ id: c.id, author: c.user.displayName });
                          commentInputRef.current?.focus();
                        }}
                        onModerate={handleModerateComment}
                      />
                      {replies.length > 0 && (
                        <View style={styles.repliesContainer}>
                          <Pressable
                            onPress={() =>
                              setExpandedReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                            }
                            style={styles.toggleRepliesBtn}
                          >
                            <Ionicons
                              name={repliesExpanded ? "chevron-up" : "chevron-down"}
                              size={13}
                              color={Colors.dark.primary}
                            />
                            <Text style={styles.toggleRepliesText}>
                              {repliesExpanded ? "Hide" : "Show"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
                            </Text>
                          </Pressable>
                          {repliesExpanded && replies.map((reply) => (
                            <View key={reply.id} style={styles.replyRow}>
                              <View style={styles.replyLine} />
                              <View style={{ flex: 1 }}>
                                <CommentRow
                                  comment={reply}
                                  isReply
                                  onReply={(c) => {
                                    setReplyTo({ id: c.id, author: c.user.displayName });
                                    commentInputRef.current?.focus();
                                  }}
                                  onModerate={handleModerateComment}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Comment Input */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(bottomInset, 12) }]}>
          {replyTo ? (
            <View style={styles.replyBanner}>
              <Ionicons name="return-down-forward-outline" size={14} color={Colors.dark.primary} />
              <Text style={styles.replyBannerText} numberOfLines={1}>
                Replying to <Text style={{ color: Colors.dark.text }}>{replyTo.author}</Text>
              </Text>
              <Pressable onPress={() => setReplyTo(null)} style={{ marginLeft: "auto" }}>
                <Ionicons name="close" size={16} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <View style={styles.inputAvatar}>
              <Text style={styles.inputAvatarText}>
                {user?.displayName?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder={replyTo ? `Reply to ${replyTo.author}…` : "Add a comment…"}
              placeholderTextColor={Colors.dark.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              maxLength={500}
              multiline
              returnKeyType="default"
            />
            <Pressable
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submittingComment}
              style={({ pressed }) => [
                styles.sendBtn,
                (!commentText.trim() || submittingComment) && { opacity: 0.4 },
                pressed && { opacity: 0.7 },
              ]}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="send" size={18} color="#000" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Deactivation message modal */}
      <Modal visible={deactivateModalOpen} transparent animationType="fade" onRequestClose={() => setDeactivateModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.deactivateModal}>
            <Text style={styles.deactivateModalTitle}>Deactivate QR Code</Text>
            <Text style={styles.deactivateModalSub}>
              Scanners will not see any links or actions. You can add an optional message (max 100 chars).
            </Text>
            <TextInput
              style={styles.deactivateModalInput}
              placeholder="Optional message to show scanners…"
              placeholderTextColor={Colors.dark.textMuted}
              value={deactivationMsgInput}
              onChangeText={(t) => setDeactivationMsgInput(t.slice(0, 100))}
              multiline
              maxLength={100}
            />
            <Text style={styles.charCount}>{deactivationMsgInput.length}/100</Text>
            <View style={styles.deactivateModalBtns}>
              <Pressable style={styles.deactivateCancelBtn} onPress={() => setDeactivateModalOpen(false)}>
                <Text style={styles.deactivateCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deactivateConfirmBtn} onPress={handleConfirmDeactivate}>
                <Ionicons name="pause-circle" size={16} color="#fff" />
                <Text style={styles.deactivateConfirmText}>Deactivate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Followers Full-Page Modal */}
      <Modal visible={followersModalOpen} animationType="slide" onRequestClose={() => setFollowersModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
          <View style={[styles.navBar, { paddingTop: Math.max(topInset, 12) + 12 }]}>
            <Pressable onPress={() => setFollowersModalOpen(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.navTitle}>Followers</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 1 }}>
                {followCount} {followCount === 1 ? "person follows" : "people follow"} this QR
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {followersLoading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <ActivityIndicator color={Colors.dark.primary} size="large" />
              <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>Loading followers…</Text>
            </View>
          ) : followersList.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
              <Ionicons name="people-outline" size={60} color={Colors.dark.textMuted} />
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text }}>No Followers Yet</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, textAlign: "center", lineHeight: 20 }}>
                When people follow this QR code, they'll appear here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {followersList.map((f, idx) => (
                <Animated.View key={f.userId} entering={FadeInDown.duration(300).delay(idx * 30)}>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 14,
                    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
                  }}>
                    {f.photoURL ? (
                      <Image
                        source={{ uri: f.photoURL }}
                        style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.dark.surfaceLight }}
                      />
                    ) : (
                      <View style={{
                        width: 50, height: 50, borderRadius: 25,
                        backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
                        borderWidth: 1, borderColor: Colors.dark.primary + "40",
                      }}>
                        <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.primary }}>
                          {(f.displayName || "?")[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text }}>
                        {f.displayName}
                      </Text>
                      {f.username ? (
                        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.primary, marginTop: 1 }}>
                          @{f.username}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 }}>
                        Followed {timeAgo(f.followedAt)}
                      </Text>
                    </View>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#10B98115", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={18} color="#10B981" />
                    </View>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Custom Color Picker Modal */}
      <Modal visible={customColorOpen} transparent animationType="slide" onRequestClose={() => setCustomColorOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => setCustomColorOpen(false)}>
            <Pressable style={[styles.deactivateModal, { gap: 16 }]} onPress={() => {}}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Ionicons name="color-palette-outline" size={22} color={Colors.dark.primary} />
                <Text style={styles.deactivateModalTitle}>
                  Custom {customColorTarget === "fg" ? "Dot" : "Background"} Color
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" }}>
                Enter any hex color code (e.g. #FF5500 or #F50)
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 10,
                  backgroundColor: (() => {
                    let h = customColorInput.trim();
                    if (!h.startsWith("#")) h = "#" + h;
                    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h) ? h : Colors.dark.surfaceLight;
                  })(),
                  borderWidth: 2, borderColor: Colors.dark.surfaceBorder,
                }} />
                <TextInput
                  style={[styles.deactivateModalInput, { flex: 1, marginBottom: 0, fontFamily: "Inter_500Medium", letterSpacing: 1 }]}
                  placeholder="#000000"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={customColorInput}
                  onChangeText={setCustomColorInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                />
              </View>

              <View style={styles.deactivateModalBtns}>
                <Pressable style={styles.deactivateCancelBtn} onPress={() => setCustomColorOpen(false)}>
                  <Text style={styles.deactivateCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.deactivateConfirmBtn} onPress={applyCustomColor}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.deactivateConfirmText}>Apply</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

interface CommentRowProps {
  comment: CommentItem;
  isReply?: boolean;
  onReply: (c: CommentItem) => void;
  onModerate: (id: string, commentUserId: string) => void;
}

function CommentRow({ comment, isReply, onReply, onModerate }: CommentRowProps) {
  const initials = comment.user.displayName?.[0]?.toUpperCase() || "?";
  return (
    <View style={styles.commentItem}>
      <View style={[styles.commentAvatar, isReply && styles.commentAvatarSmall]}>
        <Text style={[styles.commentAvatarText, isReply && { fontSize: 11 }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.user.displayName}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Pressable onPress={() => onReply(comment)} style={styles.commentActionBtn}>
            <Ionicons name="return-down-forward-outline" size={14} color={Colors.dark.textMuted} />
            <Text style={styles.commentActionText}>Reply</Text>
          </Pressable>
          <Pressable onPress={() => onModerate(comment.id, comment.userId)} style={styles.commentActionBtn}>
            <Ionicons name="trash-outline" size={14} color={Colors.dark.danger} />
            <Text style={[styles.commentActionText, { color: Colors.dark.danger }]}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },

  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, flex: 1, textAlign: "center" },

  scroll: { padding: 16, gap: 14 },

  previewCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center", paddingVertical: 24, paddingHorizontal: 20,
  },
  qrBg: {
    borderRadius: 16, padding: 12, position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  cornerLogoWrapper: { position: "absolute", width: 36, height: 36 },
  cornerLogoImg: { width: 36, height: 36, borderRadius: 8 },
  uuidRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14 },
  uuidText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe, letterSpacing: 0.5 },

  metaCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 16,
  },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
  },
  metaLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginBottom: 2 },
  metaValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  divider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginVertical: 12 },
  metaContentRow: { marginBottom: 10 },
  lockedRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 3 },
  metaContentValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, flex: 1 },

  designHeader: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  designHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  designHeaderText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  dirtyDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.dark.warning, marginLeft: 4,
  },
  designPanel: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 16, marginTop: -8,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
  },
  designLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary, marginBottom: 8 },
  swatchRow: { flexDirection: "row", gap: 10 },
  swatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "transparent",
  },
  swatchSelected: { borderColor: Colors.dark.primary },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  logoPickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  logoThumb: { width: 32, height: 32, borderRadius: 8 },
  logoPickerLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.text },
  removeLogoBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 },
  removeLogoText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.danger },
  positionRow: { flexDirection: "row", gap: 8 },
  positionBtn: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  positionBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  positionBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  positionBtnTextActive: { color: Colors.dark.primary },
  saveDesignBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.dark.primary, borderRadius: 14, paddingVertical: 13,
  },
  saveDesignBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },

  commentsHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  commentCountBadge: {
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  commentCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  commentLoading: { paddingVertical: 32, alignItems: "center" },
  emptyComments: { alignItems: "center", paddingVertical: 36, gap: 8 },
  emptyCommentsText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  emptyCommentsSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  commentsList: { gap: 4 },
  commentBlock: {
    backgroundColor: Colors.dark.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, overflow: "hidden",
  },
  commentItem: { flexDirection: "row", gap: 10, padding: 12 },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarSmall: { width: 27, height: 27, borderRadius: 14 },
  commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 19 },
  commentActions: { flexDirection: "row", gap: 14, marginTop: 8 },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentActionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  commentDeleted: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 12, opacity: 0.5,
  },
  commentDeletedText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, fontStyle: "italic" },
  repliesContainer: { borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, paddingTop: 4 },
  toggleRepliesBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 12 },
  toggleRepliesText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  replyRow: { flexDirection: "row", paddingHorizontal: 10, paddingBottom: 4 },
  replyLine: { width: 2, backgroundColor: Colors.dark.primaryDim, borderRadius: 1, marginRight: 8, marginLeft: 8 },

  inputBar: {
    backgroundColor: Colors.dark.surface, borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
    paddingHorizontal: 14, paddingTop: 10,
  },
  replyBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  replyBannerText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, flex: 1 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  inputAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  inputAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  commentInput: {
    flex: 1, backgroundColor: Colors.dark.surfaceLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    maxHeight: 100, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center",
  },

  activeRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  activeStatusLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  deactivationMsg: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    fontStyle: "italic", marginBottom: 10,
  },
  toggleActiveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  toggleActiveBtnOn: { backgroundColor: Colors.dark.danger },
  toggleActiveBtnOff: { backgroundColor: Colors.dark.safe },
  toggleActiveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  charCount: { fontSize: 11, color: Colors.dark.textMuted, textAlign: "right", marginBottom: 12 },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  deactivateModal: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 24, width: "100%",
  },
  deactivateModalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 6 },
  deactivateModalSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginBottom: 16 },
  deactivateModalInput: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    minHeight: 64, textAlignVertical: "top",
  },
  deactivateModalBtns: { flexDirection: "row", gap: 10 },
  deactivateCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center",
  },
  deactivateCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  deactivateConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.dark.danger,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  deactivateConfirmText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
