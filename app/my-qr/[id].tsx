import {
  View, Text, Pressable, TextInput, ActivityIndicator,
  Platform, Image, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import QRCode from "react-native-qrcode-svg";
import { useMyQrDetail, FG_COLORS, BG_COLORS, LOGO_POSITIONS } from "@/features/my-qr/hooks/useMyQrDetail";
import { makeStyles } from "@/features/my-qr/styles";
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = insets.bottom;

  const h = useMyQrDetail(id);

  if (h.loading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>My QR Code</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", paddingVertical: 32, gap: 16 }}>
            <SkeletonBox width={200} height={200} borderRadius={16} />
            <SkeletonBox width={160} height={12} />
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceBorder, padding: 16, gap: 12 }}>
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
            <Ionicons name="arrow-back" size={22} color={colors.text} />
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
          <Ionicons name="arrow-back" size={22} color={colors.text} />
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
          {/* QR Preview */}
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
                    style={[
                      styles.cornerLogoWrapper,
                      { pointerEvents: "none" },
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
                  <Ionicons name="shield-checkmark" size={13} color={colors.safe} />
                  <Text style={styles.uuidText}>{qr.uuid}</Text>
                </View>
              ) : null}
              <View style={styles.qrActionRow}>
                <Pressable
                  onPress={h.handleShare}
                  disabled={h.sharingQr}
                  style={[styles.qrActionBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40", opacity: h.sharingQr ? 0.6 : 1 }]}
                >
                  {h.sharingQr
                    ? <ActivityIndicator size={16} color={colors.primary} />
                    : <Ionicons name="share-outline" size={18} color={colors.primary} />}
                  <Text style={[styles.qrActionBtnText, { color: colors.primary }]}>{h.sharingQr ? "Sharing…" : "Share"}</Text>
                </Pressable>
                <Pressable
                  onPress={h.handleDownloadPdf}
                  disabled={h.downloadingPdf}
                  style={[styles.qrActionBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40", opacity: h.downloadingPdf ? 0.6 : 1 }]}
                >
                  {h.downloadingPdf
                    ? <ActivityIndicator size={16} color={colors.primary} />
                    : <Ionicons name="download-outline" size={18} color={colors.primary} />}
                  <Text style={[styles.qrActionBtnText, { color: colors.primary }]}>{h.downloadingPdf ? "Generating…" : "Download PDF"}</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* QR Meta */}
          <Animated.View entering={FadeInDown.duration(400).delay(60)}>
            <View style={styles.metaCard}>
              <Text style={styles.sectionLabel}>QR INFO</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                <View style={{ flex: 1, backgroundColor: colors.primaryDim, borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.primary + "30" }}>
                  <Ionicons name="scan-outline" size={20} color={colors.primary} />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.primary, lineHeight: 26 }}>{qr.scanCount}</Text>
                  <Text style={[styles.metaLabel, { marginBottom: 0, textAlign: "center" }]}>Scans</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.accentDim, borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.accent + "30" }}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.accent} />
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.accent, lineHeight: 26 }}>{qr.commentCount}</Text>
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
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                    <Text style={styles.metaContentValue} numberOfLines={2}>{qr.content}</Text>
                  </View>
                  <Pressable
                    onPress={h.handleCopyContent}
                    style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Copy Content</Text>
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
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                          style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: "#FBBF2450", color: colors.text, fontFamily: "Inter_400Regular", fontSize: 13, padding: 10 }}
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
                            style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surfaceLight, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                          >
                            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Cancel</Text>
                          </Pressable>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_400Regular", lineHeight: 16 }}>
                          Changing the destination triggers a 24-hour caution period.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        <View style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.surfaceBorder, padding: 10 }}>
                          <Text style={{ fontSize: 13, color: colors.accent, fontFamily: "Inter_400Regular", lineHeight: 18 }} numberOfLines={3}>{h.guardLink.currentDestination}</Text>
                        </View>
                        {h.guardLink.previousDestination ? (
                          <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>
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
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>Loading guard link…</Text>
                )}
              </View>
            </Animated.View>
          )}

          {/* Active Status */}
          {qr.branded && qr.qrType !== "government" && (
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <View style={[styles.metaCard, { marginTop: 0, borderLeftWidth: 4, overflow: "hidden",
                borderLeftColor: qr.isActive ? colors.safe : colors.danger,
                backgroundColor: qr.isActive ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: qr.isActive ? colors.safe : colors.danger }} />
                  <Text style={[styles.sectionLabel, { marginBottom: 0, letterSpacing: 1.4, color: qr.isActive ? colors.safe : colors.danger }]}>
                    {qr.isActive ? "ACTIVE" : "DEACTIVATED"}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: 14, lineHeight: 20 }}>
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
                <View style={[styles.metaIconWrap, { backgroundColor: colors.accentDim }]}>
                  <MaterialCommunityIcons name="palette-outline" size={16} color={colors.accent} />
                </View>
                <Text style={styles.designHeaderText}>Edit Design</Text>
                {h.designDirty ? <View style={styles.dirtyDot} /> : null}
              </View>
              <Ionicons name={h.designOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
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
                      style={[styles.swatch, { backgroundColor: colors.surfaceLight, borderColor: colors.primary + "60", borderStyle: "dashed" },
                        !FG_COLORS.find(c => c.color === h.fgColor) && { borderColor: colors.primary, borderWidth: 2 }]}
                    >
                      {!FG_COLORS.find(c => c.color === h.fgColor)
                        ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: h.fgColor }} />
                        : <Ionicons name="color-palette-outline" size={16} color={colors.textMuted} />}
                    </Pressable>
                  </View>
                </ScrollView>
                {!FG_COLORS.find(c => c.color === h.fgColor) && (
                  <Text style={{ fontSize: 11, color: colors.primary, fontFamily: "Inter_500Medium", marginTop: -10, marginBottom: 10 }}>Custom: {h.fgColor}</Text>
                )}

                <Text style={styles.designLabel}>Background Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={styles.swatchRow}>
                    {BG_COLORS.map(({ color }) => (
                      <Pressable key={color} onPress={() => { h.setBgColor(color); h.setDesignDirty(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.swatch, { backgroundColor: color, borderColor: h.bgColor === color ? colors.primary : colors.surfaceBorder }, h.bgColor === color && styles.swatchSelected]}>
                        {h.bgColor === color ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => { h.setCustomColorTarget("bg"); h.setCustomColorInput(h.bgColor); h.setCustomColorOpen(true); }}
                      style={[styles.swatch, { backgroundColor: colors.surfaceLight, borderColor: colors.primary + "60", borderStyle: "dashed" },
                        !BG_COLORS.find(c => c.color === h.bgColor) && { borderColor: colors.primary, borderWidth: 2 }]}
                    >
                      {!BG_COLORS.find(c => c.color === h.bgColor)
                        ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: h.bgColor }} />
                        : <Ionicons name="color-palette-outline" size={16} color={colors.textMuted} />}
                    </Pressable>
                  </View>
                </ScrollView>
                {!BG_COLORS.find(c => c.color === h.bgColor) && (
                  <Text style={{ fontSize: 11, color: colors.primary, fontFamily: "Inter_500Medium", marginTop: -10, marginBottom: 10 }}>Custom: {h.bgColor}</Text>
                )}

                <Text style={styles.designLabel}>Logo</Text>
                <View style={styles.logoRow}>
                  <View style={styles.logoPickerBtn}>
                    <Image source={logoSource} style={styles.logoThumb} />
                    <Text style={styles.logoPickerLabel}>QR Guard Logo</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primaryDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary + "30" }}>
                    <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.primary }}>Mandatory</Text>
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

          {/* Comments */}
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
                <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
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
                            <Ionicons name={repliesExpanded ? "chevron-up" : "chevron-down"} size={13} color={colors.primary} />
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
              <Ionicons name="return-down-forward-outline" size={14} color={colors.primary} />
              <Text style={styles.replyBannerText} numberOfLines={1}>
                Replying to <Text style={{ color: colors.text }}>{h.replyTo.author}</Text>
              </Text>
              <Pressable onPress={() => h.setReplyTo(null)} style={{ marginLeft: "auto" }}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
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
              placeholderTextColor={colors.textMuted}
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
