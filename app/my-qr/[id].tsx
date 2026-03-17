import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Platform, Image, KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import QRCode from "react-native-qrcode-svg";
import { useMyQrDetail, FG_COLORS, BG_COLORS, LOGO_POSITIONS } from "@/features/my-qr/hooks/useMyQrDetail";
import CommentRow from "@/features/my-qr/components/CommentRow";
import DeactivateModal from "@/features/my-qr/components/DeactivateModal";
import FollowersModal from "@/features/my-qr/components/FollowersModal";
import CustomColorModal from "@/features/my-qr/components/CustomColorModal";
import SkeletonBox from "@/components/ui/SkeletonBox";

const logoSource = require("../../assets/images/icon.png");

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

export default function MyQrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = insets.bottom;

  const h = useMyQrDetail(id);

  if (h.loading) {
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
        </ScrollView>
      </View>
    );
  }

  if (!h.qrItem) {
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

  const qr = h.qrItem;

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
          ref={h.scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* QR Preview Card */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.previewCard}>
              <View style={[styles.qrBg, { backgroundColor: h.bgColor }]}>
                <QRCode
                  value={qr.content || "https://qrguard.app"}
                  size={200}
                  color={h.fgColor}
                  backgroundColor={h.bgColor}
                  getRef={(ref: any) => { h.svgRef.current = ref; }}
                  logo={h.logoPosition === "center" ? logoSource : undefined}
                  logoSize={44}
                  logoBackgroundColor={h.bgColor}
                  logoBorderRadius={10}
                  logoMargin={4}
                  quietZone={10}
                  ecl="H"
                />
                {h.logoPosition !== "center" && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.cornerLogoWrapper,
                      h.logoPosition === "top-left" && { top: 10, left: 10 },
                      h.logoPosition === "top-right" && { top: 10, right: 10 },
                      h.logoPosition === "bottom-left" && { bottom: 10, left: 10 },
                      h.logoPosition === "bottom-right" && { bottom: 10, right: 10 },
                    ]}
                  >
                    <Image source={logoSource} style={styles.cornerLogoImg} />
                  </View>
                )}
              </View>
              {qr.branded && qr.uuid ? (
                <View style={styles.uuidRow}>
                  <Ionicons name="shield-checkmark" size={13} color={Colors.dark.safe} />
                  <Text style={styles.uuidText}>{qr.uuid}</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {/* QR Metadata */}
          <Animated.View entering={FadeInDown.duration(400).delay(60)}>
            <View style={styles.metaCard}>
              <Text style={styles.sectionLabel}>QR INFO</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                <View style={{ flex: 1, backgroundColor: Colors.dark.primaryDim, borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.dark.primary + "30" }}>
                  <Ionicons name="scan-outline" size={20} color={Colors.dark.primary} />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.primary, lineHeight: 26 }}>{qr.scanCount}</Text>
                  <Text style={[styles.metaLabel, { marginBottom: 0, textAlign: "center" }]}>Scans</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: Colors.dark.accentDim, borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.dark.accent + "30" }}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.dark.accent} />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.accent, lineHeight: 26 }}>{qr.commentCount}</Text>
                  <Text style={[styles.metaLabel, { marginBottom: 0, textAlign: "center" }]}>Comments</Text>
                </View>
                <Pressable
                  onPress={h.openFollowers}
                  style={{ flex: 1, backgroundColor: "#10B98115", borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#10B98130" }}
                >
                  <Ionicons name="people-outline" size={20} color="#10B981" />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#10B981", lineHeight: 26 }}>{h.followCount}</Text>
                  <Text style={[styles.metaLabel, { marginBottom: 0, textAlign: "center" }]}>Followers</Text>
                </Pressable>
              </View>
              <View style={styles.divider} />
              {!(qr.qrType === "business" && qr.guardUuid) && (
                <View style={styles.metaContentRow}>
                  <Text style={styles.metaLabel}>Destination (read-only)</Text>
                  <View style={styles.lockedRow}>
                    <Ionicons name="lock-closed" size={12} color={Colors.dark.textMuted} />
                    <Text style={styles.metaContentValue} numberOfLines={2}>{qr.content}</Text>
                  </View>
                  <Pressable
                    onPress={h.handleCopyContent}
                    style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Ionicons name="copy-outline" size={13} color={Colors.dark.textSecondary} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textSecondary }}>Copy Content</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.metaContentRow}>
                <Text style={styles.metaLabel}>Created</Text>
                <Text style={styles.metaValue}>
                  {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Living Shield */}
          {qr.qrType === "business" && qr.guardUuid && (
            <Animated.View entering={FadeInDown.duration(400).delay(70)}>
              <View style={[styles.metaCard, { marginTop: 0, borderColor: "#FBBF2430" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ backgroundColor: "#FBBF2418", borderRadius: 8, padding: 6 }}>
                    <Ionicons name="shield" size={16} color="#FBBF24" />
                  </View>
                  <Text style={[styles.sectionLabel, { color: "#FBBF24", marginBottom: 0 }]}>LIVING SHIELD</Text>
                  {h.guardLink?.destinationChangedAt &&
                    (Date.now() - new Date(h.guardLink.destinationChangedAt).getTime()) < 86400000 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#d9770618", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Ionicons name="warning-outline" size={11} color="#f97316" />
                      <Text style={{ fontSize: 10, color: "#f97316", fontFamily: "Inter_600SemiBold" }}>Caution Active</Text>
                    </View>
                  )}
                </View>
                {h.guardLink ? (
                  <>
                    <Text style={[styles.metaLabel, { marginBottom: 4 }]}>Current Destination</Text>
                    {h.editingDestination ? (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          value={h.newDestination}
                          onChangeText={h.setNewDestination}
                          placeholder="https://your-new-destination.com"
                          placeholderTextColor={Colors.dark.textMuted}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                          style={{ backgroundColor: Colors.dark.background, borderRadius: 10, borderWidth: 1, borderColor: "#FBBF2450", color: Colors.dark.text, fontFamily: "Inter_400Regular", fontSize: 13, padding: 10 }}
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            onPress={h.handleUpdateDestination}
                            disabled={h.savingDestination || !h.newDestination.trim()}
                            style={[{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FBBF24", borderRadius: 10, paddingVertical: 10 }, { opacity: h.savingDestination ? 0.6 : 1 }]}
                          >
                            {h.savingDestination ? <ActivityIndicator size={14} color="#000" /> : <Ionicons name="checkmark" size={16} color="#000" />}
                            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" }}>Save</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => { h.setEditingDestination(false); h.setNewDestination(h.guardLink!.currentDestination); }}
                            style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.dark.surfaceLight, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                          >
                            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.textSecondary }}>Cancel</Text>
                          </Pressable>
                        </View>
                        <Text style={{ fontSize: 11, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular", lineHeight: 16 }}>
                          Changing the destination triggers a 24-hour caution period.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        <View style={{ backgroundColor: Colors.dark.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 10 }}>
                          <Text style={{ fontSize: 13, color: Colors.dark.accent, fontFamily: "Inter_400Regular", lineHeight: 18 }} numberOfLines={3}>{h.guardLink.currentDestination}</Text>
                        </View>
                        {h.guardLink.previousDestination ? (
                          <Text style={{ fontSize: 11, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" }}>
                            Previous: {h.guardLink.previousDestination.length > 50 ? h.guardLink.previousDestination.slice(0, 50) + "…" : h.guardLink.previousDestination}
                          </Text>
                        ) : null}
                        <Pressable
                          onPress={() => h.setEditingDestination(true)}
                          style={({ pressed }) => [{ flexDirection: "row" as const, alignItems: "center" as const, gap: 6, backgroundColor: "#FBBF2418", borderRadius: 10, borderWidth: 1, borderColor: "#FBBF2440", paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" as const, opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Ionicons name="pencil" size={13} color="#FBBF24" />
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FBBF24" }}>Update Destination</Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ fontSize: 13, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" }}>Loading guard link…</Text>
                )}
              </View>
            </Animated.View>
          )}

          {/* Activate / Deactivate */}
          {qr.branded && qr.qrType !== "government" && (
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <View style={[styles.metaCard, { marginTop: 0, borderLeftWidth: 4, overflow: "hidden",
                borderLeftColor: qr.isActive ? Colors.dark.safe : Colors.dark.danger,
                backgroundColor: qr.isActive ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: qr.isActive ? Colors.dark.safe : Colors.dark.danger }} />
                  <Text style={[styles.sectionLabel, { marginBottom: 0, letterSpacing: 1.4, color: qr.isActive ? Colors.dark.safe : Colors.dark.danger }]}>
                    {qr.isActive ? "ACTIVE" : "DEACTIVATED"}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 14, lineHeight: 20 }}>
                  {qr.isActive ? "Your QR code is live. Scanners can view and follow its links." : "Your QR code is off. Links are completely hidden from scanners."}
                </Text>
                {!qr.isActive && qr.deactivationMessage ? (
                  <Text style={styles.deactivationMsg} numberOfLines={3}>"{qr.deactivationMessage}"</Text>
                ) : null}
                <Pressable
                  onPress={() => h.handleToggleActive(!qr.isActive)}
                  disabled={h.togglingActive}
                  style={[styles.toggleActiveBtn, qr.isActive ? styles.toggleActiveBtnOn : styles.toggleActiveBtnOff, { width: "100%", justifyContent: "center", paddingVertical: 13 }]}
                >
                  {h.togglingActive ? (
                    <ActivityIndicator size={14} color="#fff" />
                  ) : (
                    <>
                      <Ionicons name={qr.isActive ? "pause-circle" : "play-circle"} size={18} color="#fff" />
                      <Text style={[styles.toggleActiveBtnText, { fontSize: 14 }]}>{qr.isActive ? "Deactivate QR Code" : "Activate QR Code"}</Text>
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
              onPress={() => { h.setDesignOpen((v: boolean) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={styles.designHeaderLeft}>
                <View style={[styles.metaIconWrap, { backgroundColor: Colors.dark.accentDim }]}>
                  <MaterialCommunityIcons name="palette-outline" size={16} color={Colors.dark.accent} />
                </View>
                <Text style={styles.designHeaderText}>Edit Design</Text>
                {h.designDirty ? <View style={styles.dirtyDot} /> : null}
              </View>
              <Ionicons name={h.designOpen ? "chevron-up" : "chevron-down"} size={18} color={Colors.dark.textMuted} />
            </Pressable>

            {h.designOpen && (
              <View style={styles.designPanel}>
                <Text style={styles.designLabel}>QR Dot Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={styles.swatchRow}>
                    {FG_COLORS.map(({ color }) => (
                      <Pressable key={color} onPress={() => { h.setFgColor(color); h.setDesignDirty(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.swatch, { backgroundColor: color }, h.fgColor === color && styles.swatchSelected]}>
                        {h.fgColor === color ? <Ionicons name="checkmark" size={14} color={color === "#F8FAFC" || color === "#FFFFFF" ? "#000" : "#fff"} /> : null}
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => { h.setCustomColorTarget("fg"); h.setCustomColorInput(h.fgColor); h.setCustomColorOpen(true); }}
                      style={[styles.swatch, { backgroundColor: Colors.dark.surfaceLight, borderColor: Colors.dark.primary + "60", borderStyle: "dashed" },
                        !FG_COLORS.find(c => c.color === h.fgColor) && { borderColor: Colors.dark.primary, borderWidth: 2 }]}
                    >
                      {!FG_COLORS.find(c => c.color === h.fgColor)
                        ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: h.fgColor }} />
                        : <Ionicons name="color-palette-outline" size={16} color={Colors.dark.textMuted} />}
                    </Pressable>
                  </View>
                </ScrollView>
                {!FG_COLORS.find(c => c.color === h.fgColor) && (
                  <Text style={{ fontSize: 11, color: Colors.dark.primary, fontFamily: "Inter_500Medium", marginTop: -10, marginBottom: 10 }}>Custom: {h.fgColor}</Text>
                )}

                <Text style={styles.designLabel}>Background Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={styles.swatchRow}>
                    {BG_COLORS.map(({ color }) => (
                      <Pressable key={color} onPress={() => { h.setBgColor(color); h.setDesignDirty(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.swatch, { backgroundColor: color, borderColor: h.bgColor === color ? Colors.dark.primary : Colors.dark.surfaceBorder }, h.bgColor === color && styles.swatchSelected]}>
                        {h.bgColor === color ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => { h.setCustomColorTarget("bg"); h.setCustomColorInput(h.bgColor); h.setCustomColorOpen(true); }}
                      style={[styles.swatch, { backgroundColor: Colors.dark.surfaceLight, borderColor: Colors.dark.primary + "60", borderStyle: "dashed" },
                        !BG_COLORS.find(c => c.color === h.bgColor) && { borderColor: Colors.dark.primary, borderWidth: 2 }]}
                    >
                      {!BG_COLORS.find(c => c.color === h.bgColor)
                        ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: h.bgColor }} />
                        : <Ionicons name="color-palette-outline" size={16} color={Colors.dark.textMuted} />}
                    </Pressable>
                  </View>
                </ScrollView>
                {!BG_COLORS.find(c => c.color === h.bgColor) && (
                  <Text style={{ fontSize: 11, color: Colors.dark.primary, fontFamily: "Inter_500Medium", marginTop: -10, marginBottom: 10 }}>Custom: {h.bgColor}</Text>
                )}

                <Text style={styles.designLabel}>Logo</Text>
                <View style={styles.logoRow}>
                  <View style={styles.logoPickerBtn}>
                    <Image source={logoSource} style={styles.logoThumb} />
                    <Text style={styles.logoPickerLabel}>QR Guard Logo</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.dark.primaryDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.dark.primary + "30" }}>
                    <Ionicons name="shield-checkmark" size={13} color={Colors.dark.primary} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.primary }}>Mandatory</Text>
                  </View>
                </View>

                <Text style={[styles.designLabel, { marginTop: 8 }]}>Logo Position</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={styles.positionRow}>
                    {LOGO_POSITIONS.map(({ key, label }) => (
                      <Pressable key={key} onPress={() => { h.setLogoPosition(key); h.setDesignDirty(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.positionBtn, h.logoPosition === key && styles.positionBtnActive]}>
                        <Text style={[styles.positionBtnText, h.logoPosition === key && styles.positionBtnTextActive]}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <Pressable
                  onPress={h.handleSaveDesign}
                  disabled={!h.designDirty || h.saving}
                  style={({ pressed }) => [styles.saveDesignBtn, (!h.designDirty || h.saving) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
                >
                  {h.saving ? <ActivityIndicator size="small" color="#000" /> : (
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
                <Text style={styles.commentCountText}>{qr.commentCount}</Text>
              </View>
            </View>

            {h.commentsLoading ? (
              <View style={[styles.commentsList, { marginTop: 4 }]}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.commentBlock, { overflow: "visible" }]}>
                    <SkeletonCommentItem />
                  </View>
                ))}
              </View>
            ) : h.topLevelComments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubbles-outline" size={32} color={Colors.dark.textMuted} />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSub}>Be the first to start the conversation</Text>
              </View>
            ) : (
              <View style={styles.commentsList}>
                {h.topLevelComments.map((comment) => {
                  const replies = h.getAllDescendants(comment.id);
                  const repliesExpanded = h.expandedReplies[comment.id];
                  return (
                    <View key={comment.id} style={styles.commentBlock}>
                      <CommentRow
                        comment={comment}
                        onReply={(c) => { h.setReplyTo({ id: c.id, author: c.user.displayName }); h.commentInputRef.current?.focus(); }}
                        onModerate={h.handleModerateComment}
                      />
                      {replies.length > 0 && (
                        <View style={styles.repliesContainer}>
                          <Pressable
                            onPress={() => h.setExpandedReplies((prev: Record<string, boolean>) => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                            style={styles.toggleRepliesBtn}
                          >
                            <Ionicons name={repliesExpanded ? "chevron-up" : "chevron-down"} size={13} color={Colors.dark.primary} />
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
                                  onReply={(c) => { h.setReplyTo({ id: c.id, author: c.user.displayName }); h.commentInputRef.current?.focus(); }}
                                  onModerate={h.handleModerateComment}
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
          {h.replyTo ? (
            <View style={styles.replyBanner}>
              <Ionicons name="return-down-forward-outline" size={14} color={Colors.dark.primary} />
              <Text style={styles.replyBannerText} numberOfLines={1}>
                Replying to <Text style={{ color: Colors.dark.text }}>{h.replyTo.author}</Text>
              </Text>
              <Pressable onPress={() => h.setReplyTo(null)} style={{ marginLeft: "auto" }}>
                <Ionicons name="close" size={16} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <View style={styles.inputAvatar}>
              <Text style={styles.inputAvatarText}>{h.user?.displayName?.[0]?.toUpperCase() || "?"}</Text>
            </View>
            <TextInput
              ref={h.commentInputRef}
              style={styles.commentInput}
              placeholder={h.replyTo ? `Reply to ${h.replyTo.author}…` : "Add a comment…"}
              placeholderTextColor={Colors.dark.textMuted}
              value={h.commentText}
              onChangeText={h.setCommentText}
              maxLength={500}
              multiline
              returnKeyType="default"
            />
            <Pressable
              onPress={h.handleSubmitComment}
              disabled={!h.commentText.trim() || h.submittingComment}
              style={({ pressed }) => [styles.sendBtn, (!h.commentText.trim() || h.submittingComment) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
            >
              {h.submittingComment ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="send" size={18} color="#000" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <DeactivateModal
        visible={h.deactivateModalOpen}
        msgInput={h.deactivationMsgInput}
        onChangeMsgInput={h.setDeactivationMsgInput}
        onCancel={() => h.setDeactivateModalOpen(false)}
        onConfirm={h.handleConfirmDeactivate}
      />

      <FollowersModal
        visible={h.followersModalOpen}
        onClose={() => h.setFollowersModalOpen(false)}
        followCount={h.followCount}
        followers={h.followersList}
        loading={h.followersLoading}
        topInset={topInset}
      />

      <CustomColorModal
        visible={h.customColorOpen}
        target={h.customColorTarget}
        colorInput={h.customColorInput}
        onChangeInput={h.setCustomColorInput}
        onCancel={() => h.setCustomColorOpen(false)}
        onApply={h.applyCustomColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, flex: 1, textAlign: "center" },
  scroll: { padding: 16, gap: 14 },
  previewCard: { backgroundColor: Colors.dark.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 },
  qrBg: { borderRadius: 16, padding: 12, position: "relative", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  cornerLogoWrapper: { position: "absolute", width: 36, height: 36 },
  cornerLogoImg: { width: 36, height: 36, borderRadius: 8 },
  uuidRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14 },
  uuidText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe, letterSpacing: 0.5 },
  metaCard: { backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  metaIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center" },
  metaLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginBottom: 2 },
  metaValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  divider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginVertical: 12 },
  metaContentRow: { marginBottom: 10 },
  lockedRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 3 },
  metaContentValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, flex: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.dark.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginTop: 8 },
  designHeader: { backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  designHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  designHeaderText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  dirtyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.dark.warning, marginLeft: 4 },
  designPanel: { backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 16, marginTop: -8, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  designLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary, marginBottom: 8 },
  swatchRow: { flexDirection: "row", gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: Colors.dark.primary },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  logoPickerBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.dark.surfaceLight, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder },
  logoThumb: { width: 32, height: 32, borderRadius: 8 },
  logoPickerLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.text },
  positionRow: { flexDirection: "row", gap: 8 },
  positionBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.surfaceBorder },
  positionBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  positionBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  positionBtnTextActive: { color: Colors.dark.primary },
  saveDesignBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.dark.primary, borderRadius: 14, paddingVertical: 13 },
  saveDesignBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  commentsHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  commentCountBadge: { backgroundColor: Colors.dark.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  commentCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  emptyComments: { alignItems: "center", paddingVertical: 36, gap: 8 },
  emptyCommentsText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  emptyCommentsSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  commentsList: { gap: 4 },
  commentBlock: { backgroundColor: Colors.dark.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, overflow: "hidden" },
  repliesContainer: { borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, paddingTop: 4 },
  toggleRepliesBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 12 },
  toggleRepliesText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  replyRow: { flexDirection: "row", paddingHorizontal: 10, paddingBottom: 4 },
  replyLine: { width: 2, backgroundColor: Colors.dark.primaryDim, borderRadius: 1, marginRight: 8, marginLeft: 8 },
  inputBar: { backgroundColor: Colors.dark.surface, borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, paddingHorizontal: 14, paddingTop: 10 },
  replyBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.dark.primaryDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  replyBannerText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, flex: 1 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  inputAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  inputAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  commentInput: { flex: 1, backgroundColor: Colors.dark.surfaceLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text, maxHeight: 100, borderWidth: 1, borderColor: Colors.dark.surfaceBorder },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center" },
  deactivationMsg: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, fontStyle: "italic", marginBottom: 10 },
  toggleActiveBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  toggleActiveBtnOn: { backgroundColor: Colors.dark.danger },
  toggleActiveBtnOff: { backgroundColor: Colors.dark.safe },
  toggleActiveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
