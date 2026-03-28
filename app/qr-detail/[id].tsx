import { useState, useEffect, useCallback } from "react";
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
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
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
  label: { fontSize: 16, fontFamily: "Inter_700Bold" },
});

function VerdictBanner({ verdict, offlineMode }: { verdict: ReturnType<ReturnType<typeof useQrDetail>["getCombinedVerdict"]>; offlineMode: boolean }) {
  const { colors, isDark } = useTheme();

  if (offlineMode) {
    return (
      <View style={[verdictStyles.banner, { backgroundColor: colors.warningDim, borderColor: colors.warning + "45" }]}>
        <View style={[verdictStyles.iconWrap, { backgroundColor: colors.warning + "25" }]}>
          <Ionicons name="cloud-offline-outline" size={22} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[verdictStyles.eyebrow, { color: colors.warning }]} maxFontSizeMultiplier={1}>OFFLINE MODE</Text>
          <Text style={[verdictStyles.label, { color: isDark ? "#fff" : "#111" }]} maxFontSizeMultiplier={1}>Cached Data Only</Text>
          <Text style={[verdictStyles.reason, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>Connect to see live safety info</Text>
        </View>
      </View>
    );
  }

  const iconName: keyof typeof Ionicons.glyphMap =
    verdict.level === "safe" ? "shield-checkmark" :
    verdict.level === "caution" ? "alert-circle" : "warning";

  const gradient: [string, string] =
    verdict.level === "safe" ? [colors.safe, colors.safeShade] :
    verdict.level === "caution" ? [colors.warning, colors.warningShade] : [colors.danger, colors.dangerShade];

  const bg =
    verdict.level === "safe" ? colors.safeDim ?? (colors.safe + "15") :
    verdict.level === "caution" ? colors.warningDim : colors.dangerDim;

  const borderColor =
    verdict.level === "safe" ? colors.safe :
    verdict.level === "caution" ? colors.warning : colors.danger;

  return (
    <View style={[verdictStyles.banner, { backgroundColor: bg, borderColor: borderColor + "45" }]}>
      <LinearGradient colors={gradient} style={verdictStyles.iconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={iconName} size={24} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[verdictStyles.eyebrow, { color: borderColor }]} maxFontSizeMultiplier={1}>
          {verdict.level === "safe" ? "VERIFIED SAFE" : verdict.level === "caution" ? "USE CAUTION" : "DANGER DETECTED"}
        </Text>
        <Text style={[verdictStyles.label, { color: isDark ? "#fff" : "#111" }]} maxFontSizeMultiplier={1}>{verdict.label}</Text>
        <Text style={[verdictStyles.reason, { color: colors.textSecondary }]} numberOfLines={2} maxFontSizeMultiplier={1}>{verdict.reason}</Text>
      </View>
    </View>
  );
}

const verdictStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  label: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
    lineHeight: 22,
  },
  reason: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});

export default function QrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);

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
              <Pressable onPress={q.handleToggleFavorite} style={styles.navActionBtn}>
                <Ionicons
                  name={q.isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={q.isFavorite ? colors.danger : colors.textSecondary}
                />
              </Pressable>
              <Pressable
                onPress={q.handleToggleFollow}
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

            {/* ── Sign-in banner ──────────────────────────────────────────── */}
            {!user && (
              <Animated.View entering={FadeIn.duration(300)} style={signInGlowStyle}>
                <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBanner}>
                  <LinearGradient colors={[colors.primary, colors.primaryShade]} style={signInBannerIconStyle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signInBannerTitle}>Sign in to continue</Text>
                    <Text style={styles.signInBannerSub}>Report, follow, favorite & comment</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </Pressable>
              </Animated.View>
            )}

            {/* ── Safety Verdict Banner ────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(250)}>
              <VerdictBanner verdict={verdict} offlineMode={q.offlineMode} />
            </Animated.View>

            {/* ── Content Card ────────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(300).delay(50)}>
              <ContentCard
                content={currentContent}
                contentType={currentContentType}
                parsedPayment={q.parsedPayment}
                isDeactivated={q.ownerInfo?.isActive === false}
                onOpenContent={q.handleOpenContent}
              />
            </Animated.View>

            {/* ── Payment Safety Warning (above trust score for payments) ──── */}
            {currentContentType === "payment" && q.paymentSafety?.isSuspicious && (() => {
              // Filter out pre-filled amount warnings — the PaymentCard already shows the amount chip inline
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

            {/* ── Community Trust ──────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <SectionHeader icon="shield-checkmark-outline" label="Trust Score" gradient={["#006FFF", "#00CFFF"]} />
              <TrustScoreCard
                trustInfo={trust}
                reportCounts={q.reportCounts}
                totalScans={q.totalScans}
                totalComments={q.totalComments}
                isQrOwner={q.isQrOwner}
                followCount={q.followCount}
                followersModalOpen={q.followersModalOpen}
                onOpenFollowers={() => { q.handleLoadFollowers(); q.setFollowersModalOpen(true); }}
                manipulationWarning={trust.manipulationWarning}
              />
            </Animated.View>

            {/* ── Rate This QR ─────────────────────────────────────────────── */}
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
                  isLoggedIn={!!user}
                  isPayment={currentContentType === "payment"}
                  onReport={q.handleReport}
                />
              )}
            </Animated.View>

            {/* ── Safety Warnings (URL + blacklist only — payment handled above) */}
            {(currentContentType === "url" && q.urlSafety?.isSuspicious) || q.offlineBlacklistMatch.matched ? (
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
                  {!user && (
                    <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInToComment}>
                      <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                      <Text style={styles.signInToCommentText}>Sign in to comment</Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginLeft: "auto" as any }} />
                    </Pressable>
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
                        onLike={q.handleCommentLike}
                        onReply={(c) => {
                          const rootId = q.getRootCommentId(c.id);
                          q.setReplyTo({
                            id: c.id,
                            author: c.userUsername ? `@${c.userUsername}` : smartName(c.user.displayName),
                            rootId,
                            isNested: !!c.parentId,
                          });
                        }}
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

            {/* ── Owner Info ───────────────────────────────────────────────── */}
            {q.ownerInfo && (
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

          {/* Comment Input Bar */}
          {user && !q.offlineMode && (
            <View style={[styles.bottomCommentBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
              {q.replyTo && (
                <View style={styles.replyBanner}>
                  <Ionicons name="return-down-forward-outline" size={14} color={colors.primary} />
                  <Text style={styles.replyBannerText} numberOfLines={1}>
                    Replying to <Text style={{ color: colors.text }}>{q.replyTo.author}</Text>
                  </Text>
                  <Pressable onPress={() => q.setReplyTo(null)} style={{ marginLeft: "auto" as any }}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
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
                  onPress={() => {
                    Keyboard.dismiss();
                    q.handleSubmitComment();
                  }}
                  disabled={q.submitting || !q.newComment.trim()}
                  style={({ pressed }) => [styles.sendBtn, { opacity: pressed || !q.newComment.trim() ? 0.5 : 1 }]}
                >
                  <Ionicons name="send" size={18} color="#000" />
                </Pressable>
              </View>
            </View>
          )}
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

const signInBannerIconStyle = {
  width: 46,
  height: 46,
  borderRadius: 23,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

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
