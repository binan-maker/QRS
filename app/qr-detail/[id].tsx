import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Keyboard,
  Modal,
} from "react-native";

import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCompactNumber } from "@/lib/number-format";
import { smartName } from "@/lib/utils/formatters";
import { useQrDetail } from "@/hooks/useQrDetail";
import { makeStyles } from "@/features/qr-detail/styles";
import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import ContentCard from "@/features/qr-detail/components/ContentCard";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import OwnerCard from "@/features/qr-detail/components/OwnerCard";
import CommentItem from "@/features/qr-detail/components/CommentItem";
import SafetyWarningCard from "@/features/qr-detail/components/SafetyWarningCard";
import EvidenceCard from "@/features/qr-detail/components/EvidenceCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";

function safeBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)");
  }
}

function SectionHeader({
  label,
  inline,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient?: [string, string];
  inline?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <Text style={[sectionHeaderStyles.label, { color: colors.text }]} maxFontSizeMultiplier={1}>
      {label}
    </Text>
  );
  if (inline) return content;
  return <View style={sectionHeaderStyles.wrapper}>{content}</View>;
}

const sectionHeaderStyles = StyleSheet.create({
  wrapper: { marginBottom: 10, marginTop: 2 },
  label: { fontSize: 14, fontFamily: "Inter_700Bold" },
});

function VerdictBanner({ verdict, offlineMode }: { verdict: ReturnType<ReturnType<typeof useQrDetail>["getCombinedVerdict"]>; offlineMode: boolean }) {
  const { colors, isDark } = useTheme();

  if (offlineMode) {
    const accent = "#f59e0b";
    const bg = isDark ? "#14100300" : "#fffbeb";
    return (
      <View style={[verdictStyles.banner, { backgroundColor: bg, borderColor: accent + "28" }]}>
        <View style={[verdictStyles.accentBar, { backgroundColor: accent }]} />
        <View style={[verdictStyles.iconBox, { borderColor: accent + "40", backgroundColor: accent + "10" }]}>
          <Ionicons name="cloud-offline-outline" size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={verdictStyles.eyebrowRow}>
            <View style={[verdictStyles.statusDot, { backgroundColor: accent }]} />
            <Text style={[verdictStyles.eyebrow, { color: accent }]} maxFontSizeMultiplier={1}>OFFLINE MODE</Text>
          </View>
          <Text style={[verdictStyles.label, { color: isDark ? "#e2e8f0" : "#1e293b" }]} maxFontSizeMultiplier={1}>Cached Data Only</Text>
          <Text style={[verdictStyles.reason, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>Connect to see live safety info</Text>
        </View>
      </View>
    );
  }

  const accent =
    verdict.level === "safe" ? "#22c55e" : "#f59e0b";

  const iconName: keyof typeof Ionicons.glyphMap =
    verdict.level === "safe"          ? "shield-checkmark-outline" :
    verdict.label === "UNVERIFIED QR" ? "help-circle-outline"      :
                                        "information-circle-outline";

  const statusText =
    verdict.level === "safe"          ? "ANALYSIS COMPLETE"  :
    verdict.label === "UNVERIFIED QR" ? "IDENTITY UNVERIFIED" :
                                        "REVIEW ADVISED";

  const bg =
    verdict.level === "safe" ? (isDark ? "#0a1a0e" : "#f0fdf4") :
                                (isDark ? "#16120400" : "#fffbeb");

  return (
    <View style={[verdictStyles.banner, { backgroundColor: bg, borderColor: accent + "28" }]}>
      <View style={[verdictStyles.accentBar, { backgroundColor: accent }]} />
      <View style={[verdictStyles.iconBox, { borderColor: accent + "45", backgroundColor: accent + "12" }]}>
        <Ionicons name={iconName} size={22} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={verdictStyles.eyebrowRow}>
          <View style={[verdictStyles.statusDot, { backgroundColor: accent }]} />
          <Text style={[verdictStyles.eyebrow, { color: accent }]} maxFontSizeMultiplier={1}>{statusText}</Text>
        </View>
        <Text style={[verdictStyles.label, { color: isDark ? "#e2e8f0" : "#1e293b" }]} maxFontSizeMultiplier={1}>
          {verdict.label}
        </Text>
        <Text style={[verdictStyles.reason, { color: isDark ? "#94a3b8" : "#64748b" }]} numberOfLines={2} maxFontSizeMultiplier={1}>
          {verdict.reason}
        </Text>
      </View>
    </View>
  );
}

const verdictStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 0,
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 0,
    flexShrink: 0,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    flexShrink: 0,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  label: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
    lineHeight: 22,
  },
  reason: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});

export default function QrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);


  const q = useQrDetail(id);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const trust = q.getTrustInfo();
  const verdict = q.getCombinedVerdict();
  const currentContent = q.qrCode?.content || q.offlineContent || "";
  const currentContentType = q.qrCode?.contentType || q.offlineContentType;

  const hasLocalWarnings =
    (currentContentType === "payment" && q.paymentSafety?.isSuspicious) ||
    (currentContentType === "url" && q.urlSafety?.isSuspicious) ||
    q.offlineBlacklistMatch.matched;

  if (q.loading) return <LoadingSkeleton topInset={topInset} />;

  if (q.loadError) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={safeBack} style={styles.navBackBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>QR Details</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>QR Code Not Found</Text>
          <Text style={styles.errorSub}>This QR code doesn't exist or couldn't be loaded.</Text>
          <Pressable onPress={safeBack} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.isDark ? "light" : "dark"} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.container, { paddingTop: topInset }]}>

          {/* Nav */}
          <View style={styles.navBar}>
            <Pressable onPress={safeBack} style={styles.navBackBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.navTitle}>QR Details</Text>
              {q.offlineMode && (
                <Text style={[navOfflineStyles.badge, { color: colors.warning }]}>● Offline</Text>
              )}
            </View>
            <View style={styles.navActions}>
              <Pressable
                onPress={user ? q.handleToggleFavorite : () => router.push("/(auth)/login")}
                style={styles.navActionBtn}
              >
                <Ionicons
                  name={q.isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={q.isFavorite ? colors.danger : colors.textSecondary}
                />
              </Pressable>
              <Pressable
                onPress={user ? q.handleToggleFollow : () => router.push("/(auth)/login")}
                style={({ pressed }) => [
                  styles.followBtn,
                  q.isFollowing && styles.followBtnActive,
                  { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Ionicons
                  name={q.isFollowing ? "notifications" : "notifications-outline"}
                  size={15}
                  color={q.isFollowing ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.followBtnText, q.isFollowing && styles.followBtnTextActive]}>
                  {q.isFollowing ? "Following" : "Follow"}
                </Text>
                {q.followCount > 0 && (
                  <View style={styles.followCountPill}>
                    <Text style={styles.followCountPillText}>{formatCompactNumber(q.followCount)}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={q.scrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => q.setCommentMenuId(null)}
            refreshControl={
              <RefreshControl
                refreshing={q.commentsRefreshing ?? false}
                onRefresh={q.refreshComments}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* ── Deactivated QR Banner ────────────────────────────────────── */}
            {q.ownerInfo?.isActive === false && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.deactivatedBanner}>
                  <LinearGradient
                    colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.08)"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.deactivatedIconWrap}>
                    <Ionicons name="ban" size={22} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deactivatedTitle}>QR Code Deactivated</Text>
                    <Text style={styles.deactivatedSub}>The owner has turned off this QR code. Links and actions are disabled.</Text>
                  </View>
                </View>
              </Animated.View>
            )}


            {/* ── Safety Verdict Banner ────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(250)}>
              <VerdictBanner verdict={verdict} offlineMode={q.offlineMode} />
            </Animated.View>

            {/* ── Advisory Disclaimer ──────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(250).delay(30)}>
              <Pressable
                style={[advisoryStyles.row, { borderColor: colors.surfaceBorder }]}
                onPress={() => setDisclaimerExpanded(v => !v)}
              >
                <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
                {disclaimerExpanded ? (
                  <Text style={[advisoryStyles.text, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                    QR Guard provides informational analysis only. Results are not guaranteed to be accurate or complete. Always exercise your own judgment before acting on any QR code. QR Guard is not liable for any loss or damage arising from use of this information.
                  </Text>
                ) : (
                  <Text style={[advisoryStyles.textShort, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                    Advisory only — for reference
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            {/* ── Content Card ────────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(300).delay(50)}>
              <ContentCard
                content={currentContent}
                contentType={currentContentType}
                parsedPayment={q.parsedPayment}
                isDeactivated={q.ownerInfo?.isActive === false}
                onOpenContent={q.handleOpenContent}
                hideOpenAction={!user}
              />
            </Animated.View>

            {/* ── Payment Safety Warning ──────────────────────────────── */}
            {currentContentType === "payment" && q.paymentSafety?.isSuspicious && (() => {
              const filteredWarnings = (q.paymentSafety?.warnings ?? []).filter(
                (w) => !w.toLowerCase().startsWith("pre-filled amount")
              );
              if (filteredWarnings.length === 0) return null;
              return (
                <Animated.View entering={FadeInDown.duration(300).delay(75)}>
                  <SafetyWarningCard
                    riskLevel={q.paymentSafety!.riskLevel as "caution" | "dangerous"}
                    warnings={filteredWarnings}
                    title={q.paymentSafety!.riskLevel === "dangerous" ? "Payment Security Warning" : "Payment Security Notice"}
                  />
                </Animated.View>
              );
            })()}

            {/* ── Payment Evidence ─────────────────────────────────────── */}
            {currentContentType === "payment" && q.paymentSafety?.evidence && q.paymentSafety.evidence.length > 0 && (
              <Animated.View entering={FadeInDown.duration(300).delay(90)}>
                <EvidenceCard title="Payment Analysis" evidence={q.paymentSafety.evidence} />
              </Animated.View>
            )}

            {/* ── External QR Warning ──────────────────────────────────── */}
            {!q.ownerInfo?.isBranded && !q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(300).delay(75)}>
                <View style={[externalQrBannerStyles.card, { backgroundColor: colors.surface, borderColor: colors.warning + "40", borderLeftColor: colors.warning, borderLeftWidth: 3 }]}>
                  <View style={externalQrBannerStyles.iconRow}>
                    <Ionicons name="alert-circle-outline" size={15} color={colors.warning} />
                    <Text style={[externalQrBannerStyles.body, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                      <Text style={[externalQrBannerStyles.title, { color: colors.warning }]}>{"Standard QR"}</Text>
                      {" · Owner identity unverified by QR Guard"}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── Community Trust ───────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <TrustScoreCard
                trustInfo={trust}
                reportCounts={q.reportCounts}
                totalScans={q.totalScans}
                totalComments={q.totalComments}
                isQrOwner={user ? q.isQrOwner : false}
                followCount={q.followCount}
                followersModalOpen={user ? q.followersModalOpen : false}
                onOpenFollowers={user ? () => { q.handleLoadFollowers(); q.setFollowersModalOpen(true); } : () => {}}
                manipulationWarning={trust.manipulationWarning}
              />
            </Animated.View>

            {/* ── Sections below only for signed-in users ───────────────────── */}
            {user && (
              <>
                {/* ── Rate This QR ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.duration(400).delay(110)}>
                  {q.offlineMode ? (
                    <View style={offlineSectionStyles.row}>
                      <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
                      <Text style={[offlineSectionStyles.text, { color: colors.textMuted }]}>Connect to the internet to submit your rating</Text>
                    </View>
                  ) : (
                    <ReportGrid
                      reportCounts={q.reportCounts}
                      userReport={q.userReport}
                      isLoggedIn={true}
                      isPayment={currentContentType === "payment"}
                      onReport={q.handleReport}
                    />
                  )}
                </Animated.View>

                {/* ── Safety Warnings (URL + blacklist) ─────────────────────── */}
                {((currentContentType === "url" && q.urlSafety?.isSuspicious) || q.offlineBlacklistMatch.matched) ? (
                  <Animated.View entering={FadeInDown.duration(300).delay(130)}>
                    {currentContentType === "url" && q.urlSafety?.isSuspicious && (
                      <SafetyWarningCard
                        riskLevel={q.urlSafety.riskLevel as "caution" | "dangerous"}
                        warnings={q.urlSafety.warnings}
                        title={q.urlSafety.riskLevel === "dangerous" ? "Dangerous URL Detected" : "Proceed with Caution"}
                      />
                    )}
                    {q.offlineBlacklistMatch.matched && (
                      <SafetyWarningCard
                        riskLevel="dangerous"
                        warnings={[`Known scam pattern: ${q.offlineBlacklistMatch.reason}`]}
                        title="Known Scam Pattern"
                      />
                    )}
                  </Animated.View>
                ) : null}

                {/* ── URL Evidence ───────────────────────────────────────────── */}
                {currentContentType === "url" && q.urlSafety?.evidence && q.urlSafety.evidence.length > 0 && (
                  <Animated.View entering={FadeInDown.duration(300).delay(145)}>
                    <EvidenceCard title="URL Analysis" evidence={q.urlSafety.evidence} />
                  </Animated.View>
                )}
              </>
            )}

            {/* ── Comments ─────────────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(400).delay(210)}>
              <View style={styles.commentsHeader}>
                <View style={styles.commentsTitleRow}>
                  <SectionHeader icon="chatbubbles-outline" label="Comments" gradient={[colors.primary, colors.primaryShade]} inline />
                  {q.totalComments > 0 && (
                    <View style={[styles.commentCountBadge, { marginLeft: 6 }]}>
                      <Text style={styles.commentCountText}>{formatCompactNumber(q.totalComments)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {q.offlineMode ? (
                <View style={offlineSectionStyles.row}>
                  <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
                  <Text style={[offlineSectionStyles.text, { color: colors.textMuted }]}>Connect to the internet to view and post comments</Text>
                </View>
              ) : (
                <>
                  {!user ? (
                    <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.commentInput, { marginBottom: 10 }]}>
                      <Text style={[styles.commentTextInput, { color: colors.textMuted, paddingTop: 4 }]}>Add a comment…</Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.inlineCommentBar]}>
                      {q.replyTo && (
                        <View style={styles.replyBanner}>
                          <Ionicons name="return-down-forward-outline" size={13} color={colors.primary} />
                          <Text style={styles.replyBannerText} numberOfLines={1}>
                            Replying to <Text style={{ color: colors.text }}>{q.replyTo.author}</Text>
                          </Text>
                          <Pressable onPress={() => q.setReplyTo(null)} style={{ marginLeft: "auto" as any }}>
                            <Ionicons name="close" size={14} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      )}
                      <View style={styles.commentInput}>
                        <TextInput
                          ref={q.commentInputRef}
                          style={styles.commentTextInput}
                          placeholder={q.replyTo ? `Reply to ${q.replyTo.author}...` : "Add a comment..."}
                          placeholderTextColor={colors.textMuted}
                          value={q.newComment}
                          onChangeText={q.setNewComment}
                          multiline
                          maxLength={500}
                        />
                        <Pressable
                          onPress={() => { Keyboard.dismiss(); q.handleSubmitComment(); }}
                          disabled={q.submitting || !q.newComment.trim()}
                          style={({ pressed }) => [styles.sendBtn, { opacity: (pressed || q.submitting || !q.newComment.trim()) ? 0.4 : 1 }]}
                        >
                          <Ionicons name="send" size={15} color="#000" />
                        </Pressable>
                      </View>
                    </View>
                  )}
                  {q.commentsList.length === 0 ? (
                    <View style={styles.noComments}>
                      <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
                      <Text style={styles.noCommentsText}>No comments yet</Text>
                      <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts</Text>
                    </View>
                  ) : (
                    q.topLevelComments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        isReply={false}
                        currentUserLike={q.userLikes[comment.id] ?? null}
                        isMenuOpen={q.commentMenuId === comment.id}
                        isDeleting={q.deletingCommentId === comment.id}
                        isRevealed={q.revealedComments.has(comment.id)}
                        isCommentOwner={user?.id === comment.userId}
                        canDelete={user?.id === comment.userId}
                        descendants={q.getAllDescendants(comment.id)}
                        expandedReplies={q.expandedReplies}
                        visibleRepliesCount={q.visibleRepliesCount}
                        allComments={q.commentsList}
                        userLikes={q.userLikes}
                        commentMenuId={q.commentMenuId}
                        deletingCommentId={q.deletingCommentId}
                        revealedComments={q.revealedComments}
                        userId={user?.id}
                        onLike={user ? q.handleCommentLike : () => router.push("/(auth)/login")}
                        onReply={user ? (c) => {
                          const rootId = q.getRootCommentId(c.id);
                          q.setReplyTo({
                            id: c.id,
                            author: c.userUsername ? `@${c.userUsername}` : smartName(c.user.displayName),
                            rootId,
                            isNested: !!c.parentId,
                          });
                        } : () => router.push("/(auth)/login")}
                        onMenuOpen={(cid, isOwner) => { q.setCommentMenuId(cid); q.setCommentMenuOwner(isOwner); }}
                        onMenuClose={() => q.setCommentMenuId(null)}
                        onDelete={q.handleDeleteComment}
                        onReport={(cid) => q.setCommentReportModal(cid)}
                        onReveal={(cid) => q.setRevealedComments((prev) => { const next = new Set(prev); next.add(cid); return next; })}
                        onToggleReplies={q.toggleReplies}
                        onShowMoreReplies={q.showMoreReplies}
                      />
                    ))
                  )}
                  {q.hasMoreComments && (
                    <Pressable onPress={q.loadMoreComments} disabled={q.commentsLoading} style={styles.loadMoreBtn}>
                      {q.commentsLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>Load More Comments</Text>
                      )}
                    </Pressable>
                  )}
                </>
              )}
            </Animated.View>

            {/* ── Owner Info (signed-in only) ──────────────────────────────── */}
            {user && q.ownerInfo && (
              <Animated.View entering={FadeInDown.duration(400).delay(170)}>
                <SectionHeader icon="storefront-outline" label="Creator" gradient={[colors.primary, colors.primaryShade]} />
                <OwnerCard
                  ownerInfo={q.ownerInfo}
                  isQrOwner={q.isQrOwner}
                  followCount={q.followCount}
                  unreadMessages={q.unreadMessages}
                  onOpenFollowers={() => { q.handleLoadFollowers(); q.setFollowersModalOpen(true); }}
                  onOpenMessages={() => q.setMessagesModalOpen(true)}
                />
              </Animated.View>
            )}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Comment 3-dot Menu — YouTube-style bottom sheet */}
      <Modal
        visible={q.commentMenuId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => q.setCommentMenuId(null)}
      >
        <Pressable style={commentMenuStyles.backdrop} onPress={() => q.setCommentMenuId(null)}>
          <View style={[commentMenuStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={[commentMenuStyles.handle, { backgroundColor: colors.surfaceBorder }]} />
            {q.commentMenuOwner ? (
              <Pressable
                onPress={() => {
                  const id = q.commentMenuId!;
                  q.setCommentMenuId(null);
                  q.handleDeleteComment(id);
                }}
                style={commentMenuStyles.menuItem}
              >
                <View style={[commentMenuStyles.menuIconWrap, { backgroundColor: colors.dangerDim ?? (colors.danger + "15") }]}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </View>
                <Text style={[commentMenuStyles.menuLabel, { color: colors.danger }]}>Delete comment</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  const id = q.commentMenuId!;
                  q.setCommentMenuId(null);
                  q.setCommentReportModal(id);
                }}
                style={commentMenuStyles.menuItem}
              >
                <View style={[commentMenuStyles.menuIconWrap, { backgroundColor: colors.warningDim ?? (colors.warning + "15") }]}>
                  <Ionicons name="flag-outline" size={20} color={colors.warning} />
                </View>
                <Text style={[commentMenuStyles.menuLabel, { color: colors.text }]}>Report comment</Text>
              </Pressable>
            )}
            <Pressable onPress={() => q.setCommentMenuId(null)} style={commentMenuStyles.cancelBtn}>
              <Text style={[commentMenuStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modals */}
      <CommentReportModal
        commentId={q.commentReportModal}
        onReport={q.handleCommentReport}
        onClose={() => q.setCommentReportModal(null)}
      />
      <FollowersModal
        visible={q.followersModalOpen}
        followCount={q.followCount}
        followers={q.followersList}
        loading={q.followersLoading}
        onClose={() => q.setFollowersModalOpen(false)}
      />
      <MessagesModal
        visible={q.messagesModalOpen}
        isQrOwner={q.isQrOwner}
        ownerInfo={q.ownerInfo}
        messages={q.messages}
        messageText={q.messageText}
        sendingMessage={q.sendingMessage}
        user={user}
        onChangeText={q.setMessageText}
        onSend={q.handleSendMessage}
        onMarkRead={() => {}}
        onClose={() => q.setMessagesModalOpen(false)}
      />
    </View>
  );
}


const navOfflineStyles = StyleSheet.create({
  badge: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
});

const offlineSectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});

const externalQrBannerStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  body: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

const advisoryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  text: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    flex: 1,
    opacity: 0.75,
  },
  textShort: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    opacity: 0.75,
  },
});

const guestModeBannerStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  lockCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  signInBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    flexShrink: 0,
  },
  signInBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

const guestBlurOverlayStyles = StyleSheet.create({
  cta: {
    alignItems: "center",
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  sub: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    opacity: 0.75,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#6366F1",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

const _signInStyles = StyleSheet.create({
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 1,
  },
  bannerCta: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    flexShrink: 0,
  },
  bannerCtaText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.1,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 12,
    borderWidth: 1,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentPlaceholder: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  commentBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 0,
    flexShrink: 0,
  },
  commentBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});

const signInBannerCardStyle = _signInStyles.bannerCard;
const signInBannerIconCircle = _signInStyles.bannerIconCircle;
const signInBannerStyles = {
  title: _signInStyles.bannerTitle,
  sub: _signInStyles.bannerSub,
  cta: _signInStyles.bannerCta,
  ctaText: _signInStyles.bannerCtaText,
};
const signInCommentStyle = _signInStyles.commentRow;
const signInCommentAvatar = _signInStyles.commentAvatar;
const signInCommentPlaceholder = _signInStyles.commentPlaceholder;
const signInCommentBtn = _signInStyles.commentBtn;
const signInCommentBtnText = _signInStyles.commentBtnText;

const commentMenuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
