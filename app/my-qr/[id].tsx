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
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
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
  type GeneratedQrItem,
  type CommentItem,
} from "@/lib/firestore-service";

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

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = insets.bottom;

  const loadQr = useCallback(async () => {
    if (!user) return;
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
  }, [user, id]);

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

  async function handleSaveDesign() {
    if (!user || !qrItem) return;
    setSaving(true);
    try {
      await updateQrDesign(user.id, qrItem.docId, { fgColor, bgColor, logoPosition, logoUri });
      setDesignDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Design updated successfully.");
    } catch {
      Alert.alert("Error", "Could not save design. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLogoUri(result.assets[0].uri);
      setDesignDirty(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  function getReplies(parentId: string) {
    return comments.filter((c) => c.parentId === parentId);
  }

  const logoSource = logoUri ? { uri: logoUri } : require("../../assets/images/icon.png");

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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
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
                  logoSize={logoUri ? 50 : 44}
                  logoBackgroundColor={bgColor}
                  logoBorderRadius={logoUri ? 25 : 10}
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
              <View style={styles.metaRow}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="scan-outline" size={16} color={Colors.dark.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>Scanned</Text>
                  <Text style={styles.metaValue}>{qrItem.scanCount} times</Text>
                </View>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="chatbubble-outline" size={16} color={Colors.dark.accent} />
                </View>
                <View>
                  <Text style={styles.metaLabel}>Comments</Text>
                  <Text style={[styles.metaValue, { color: Colors.dark.accent }]}>{qrItem.commentCount}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.metaContentRow}>
                <Text style={styles.metaLabel}>Destination (read-only)</Text>
                <View style={styles.lockedRow}>
                  <Ionicons name="lock-closed" size={12} color={Colors.dark.textMuted} />
                  <Text style={styles.metaContentValue} numberOfLines={2}>
                    {qrItem.content}
                  </Text>
                </View>
              </View>
              <View style={styles.metaContentRow}>
                <Text style={styles.metaLabel}>Created</Text>
                <Text style={styles.metaValue}>{formatDate(qrItem.createdAt)}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Activate / Deactivate — only for branded QRs */}
          {qrItem.branded && qrItem.qrType !== "government" && (
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <View style={[styles.metaCard, { marginTop: 0 }]}>
                <Text style={styles.sectionLabel}>STATUS CONTROL</Text>
                {!qrItem.isActive && qrItem.deactivationMessage ? (
                  <Text style={styles.deactivationMsg} numberOfLines={3}>
                    "{qrItem.deactivationMessage}"
                  </Text>
                ) : null}
                <View style={styles.activeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activeStatusLabel, { color: qrItem.isActive ? Colors.dark.safe : Colors.dark.danger }]}>
                      {qrItem.isActive ? "Active — people can scan and follow links" : "Deactivated — links are hidden for scanners"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleToggleActive(!qrItem.isActive)}
                    disabled={togglingActive}
                    style={[styles.toggleActiveBtn, qrItem.isActive ? styles.toggleActiveBtnOn : styles.toggleActiveBtnOff]}
                  >
                    {togglingActive ? (
                      <ActivityIndicator size={14} color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name={qrItem.isActive ? "pause-circle" : "play-circle"}
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.toggleActiveBtnText}>
                          {qrItem.isActive ? "Deactivate" : "Activate"}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
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
                  </View>
                </ScrollView>

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
                  </View>
                </ScrollView>

                {/* Logo */}
                <Text style={styles.designLabel}>Logo</Text>
                <View style={styles.logoRow}>
                  <Pressable onPress={handlePickLogo} style={styles.logoPickerBtn}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoThumb} />
                    ) : (
                      <Image source={require("../../assets/images/icon.png")} style={styles.logoThumb} />
                    )}
                    <Text style={styles.logoPickerLabel}>
                      {logoUri ? "Change Logo" : "Custom Logo"}
                    </Text>
                  </Pressable>
                  {logoUri ? (
                    <Pressable
                      onPress={() => { setLogoUri(null); setDesignDirty(true); }}
                      style={styles.removeLogoBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={Colors.dark.danger} />
                      <Text style={styles.removeLogoText}>Remove</Text>
                    </Pressable>
                  ) : null}
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
              <View style={styles.commentLoading}>
                <ActivityIndicator size="small" color={Colors.dark.primary} />
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
                  const replies = getReplies(comment.id);
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
