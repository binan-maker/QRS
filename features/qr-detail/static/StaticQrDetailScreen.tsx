import { useState, useCallback, useRef } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  StyleSheet, KeyboardAvoidingView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTopInset } from "@/shared/utils/platform";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useNetworkStatus } from "@/shared/utils/use-network";
import { makeStyles, offlineSectionStyles } from "@/features/qr-detail/styles";
import { formatCompactNumber } from "@/shared/utils/number-format";

import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import ContentCard from "@/features/qr-detail/content-cards";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import OwnerCard from "@/features/qr-detail/components/OwnerCard";
import SafetyWarningCard from "@/features/qr-detail/components/SafetyWarningCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import QrDetailNavBar from "@/features/qr-detail/components/QrDetailNavBar";
import OwnerCircleRow from "@/features/qr-detail/components/OwnerCircleRow";
import CommentsSection from "@/features/qr-detail/components/CommentsSection";
import DonationBanner from "@/features/qr-detail/components/DonationBanner";
import OwnerInfoSheet from "@/features/qr-detail/components/sheets/OwnerInfoSheet";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

interface Props {
  id: string;
  ownerDocId?: string;
}

// ─── Compact safety badge shown below content card ────────────────────────────
function SafetyBadge({ verdict }: { verdict: { level: string; label: string } | null }) {
  const { colors, isDark } = useTheme();
  if (!verdict || verdict.level === "safe" || verdict.level === "unknown") return null;

  const cfg = {
    dangerous: { icon: "alert-circle"    as const, color: "#EF4444", bg: isDark ? "#3B0A0A" : "#FEF2F2", border: "#EF444440" },
    caution:   { icon: "warning-outline" as const, color: "#F59E0B", bg: isDark ? "#2D1A00" : "#FFFBEB", border: "#F59E0B40" },
  }[verdict.level] ?? { icon: "information-circle-outline" as const, color: colors.textMuted, bg: colors.surface, border: colors.surfaceBorder };

  return (
    <View style={[safetyBadgeStyles.row, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
      <Text style={[safetyBadgeStyles.text, { color: cfg.color }]}>{verdict.label}</Text>
    </View>
  );
}

const safetyBadgeStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  text: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
});

export default function StaticQrDetailScreen({ id, ownerDocId }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const topInset = useTopInset();

  const [ownerSheetOpen, setOwnerSheetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [toastState, setToastState] = useState<{
    message: string;
    icon: keyof typeof Ionicons.glyphMap;
    key: number;
  }>({ message: "", icon: "checkmark-circle", key: 0 });
  const lastToastTime = useRef(0);
  const reportSectionY = useRef(0);

  const showToast = useCallback(
    (message: string, icon: keyof typeof Ionicons.glyphMap = "checkmark-circle") => {
      const now = Date.now();
      if (now - lastToastTime.current < 2200) return;
      lastToastTime.current = now;
      setToastState((prev) => ({ message, icon, key: prev.key + 1 }));
    },
    []
  );

  const q = useQrDetail(id);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);

  const hasOwner  = !!q.ownerInfo?.ownerId;
  const trust     = q.getTrustInfo();
  const verdict   = q.getCombinedVerdict();
  const isQrOwner = !!(user?.id && q.ownerInfo?.ownerId && user.id === q.ownerInfo.ownerId);

  const content     = q.qrCode?.content || q.offlineContent || "";
  const contentType = q.qrCode?.contentType || q.offlineContentType || "text";

  const isDeactivated   = q.ownerInfo?.isActive === false || q.qrCode?.isActive === false;
  const deactivationMsg = q.ownerInfo?.deactivationMessage || q.qrCode?.deactivationMessage || null;

  // Only show safety warnings for genuinely dangerous content
  const showUrlDangerWarning =
    contentType === "url" &&
    q.urlSafety?.isSuspicious &&
    q.urlSafety.riskLevel === "dangerous";

  const showPaymentDangerWarning =
    contentType === "payment" &&
    q.paymentSafety?.isSuspicious &&
    q.paymentSafety.riskLevel === "dangerous";

  const showBlacklistWarning = q.offlineBlacklistMatch.matched;

  const handleCreatorFollowPress = useCallback(() => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!isOnline) { setOfflineToastKey((k) => k + 1); return; }
    const willFollow = !q.isFollowingCreator;
    q.handleToggleFollowCreator();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const label = q.ownerInfo?.businessName || q.ownerInfo?.ownerName || "Creator";
    showToast(
      willFollow ? `Following ${label}` : `Unfollowed ${label}`,
      willFollow ? "person-add" : "person-remove-outline"
    );
  }, [user, isOnline, q.isFollowingCreator, q.handleToggleFollowCreator, q.ownerInfo, showToast]);

  const handleWatchPress = useCallback(() => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!isOnline) { setOfflineToastKey((k) => k + 1); return; }
    const willWatch = !q.isFollowing;
    q.handleToggleFollow();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(
      willWatch ? "Watching this QR" : "Unwatched",
      willWatch ? "notifications" : "notifications-off-outline"
    );
  }, [user, isOnline, q.isFollowing, q.handleToggleFollow, showToast]);

  const handleFavoritePress = useCallback(() => {
    if (!user) { router.push("/(auth)/login"); return; }
    const willFav = !q.isFavorite;
    q.handleToggleFavorite();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(
      willFav ? "Added to favorites" : "Removed from favorites",
      willFav ? "heart" : "heart-outline"
    );
  }, [user, q.isFavorite, q.handleToggleFavorite, showToast]);

  const handleReportPress = useCallback(() => {
    setOverflowOpen(false);
    if (!user) { router.push("/(auth)/login"); return; }
    setTimeout(() => {
      q.scrollRef.current?.scrollTo({ y: reportSectionY.current, animated: true });
    }, 280);
  }, [user, q.scrollRef]);

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
      <OfflineToast key={offlineToastKey} visible={offlineToastKey > 0} />
      <QrToast message={toastState.message} icon={toastState.icon} toastKey={toastState.key} />
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.container, { paddingTop: topInset }]}>

          <QrDetailNavBar
            offlineMode={q.offlineMode}
            ownerName={q.ownerInfo?.businessName || q.ownerInfo?.ownerName || null}
            hasOwner={hasOwner}
            isGuardCreatedQr={false}
            isFollowingCreator={q.isFollowingCreator}
            creatorFollowLoading={q.creatorFollowLoading}
            creatorFollowerCount={q.creatorFollowerCount}
            isFollowing={q.isFollowing}
            followLoading={q.followLoading}
            followCount={q.followCount}
            isQrOwner={isQrOwner}
            ownerDocId={ownerDocId}
            onBack={safeBack}
            onFollowCreator={handleCreatorFollowPress}
            onOpenCreatorFollowers={() => {
              q.handleLoadCreatorFollowers();
              q.setCreatorFollowersModalOpen(true);
            }}
            onWatch={handleWatchPress}
            onManage={() =>
              ownerDocId
                ? router.push(`/my-qr/${ownerDocId}` as any)
                : router.push("/(tabs)/profile")
            }
            onAnalytics={() =>
              ownerDocId ? router.push(`/my-qr-analytics/${ownerDocId}` as any) : undefined
            }
            onOverflowOpen={() => setOverflowOpen(true)}
          />

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
            {/* ── Source badge ─────────────────────────────────── */}
            {!q.offlineMode && !hasOwner && (
              <Animated.View entering={FadeIn.delay(20).duration(220)}>
                <View style={[staticStyles.sourceBadge, {
                  backgroundColor: isDark ? "#1a1208" : "#fffbeb",
                  borderColor: "#f59e0b25",
                }]}>
                  <Ionicons name="scan-outline" size={12} color="#f59e0b" />
                  <Text style={[staticStyles.sourceBadgeText, { color: "#d97706" }]}>
                    External QR · Scanned from the wild
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* ── Deactivated banner ───────────────────────────── */}
            {isDeactivated && (
              <Animated.View entering={FadeInDown.delay(20).duration(240)}>
                <View style={[styles.deactivatedBanner, { borderColor: "#ef444440" }]}>
                  <LinearGradient
                    colors={["rgba(239,68,68,0.14)", "rgba(239,68,68,0.06)"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.deactivatedIconWrap}>
                    <Ionicons name="ban" size={20} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deactivatedTitle}>QR Code Deactivated</Text>
                    <Text style={styles.deactivatedSub}>
                      {deactivationMsg || "The owner has turned off this QR code."}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── Owner branding ───────────────────────────────── */}
            {q.ownerInfo?.isBranded && (
              <Animated.View entering={FadeInDown.delay(30).duration(240)}>
                <OwnerCircleRow
                  ownerInfo={q.ownerInfo as any}
                  onPress={() => setOwnerSheetOpen(true)}
                />
              </Animated.View>
            )}

            {/* ── CONTENT CARD — HERO ──────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(40).duration(280)}>
              <ContentCard
                content={content}
                contentType={contentType}
                parsedPayment={q.parsedPayment}
                isDeactivated={isDeactivated}
                onOpenContent={q.handleOpenContent}
                hideOpenAction={false}
                templateKey={(q.qrCode as any)?.templateKey}
              />
            </Animated.View>

            {/* ── Safety badge (compact — only if flagged) ─────── */}
            {verdict && verdict.level !== "safe" && verdict.level !== "unknown" && (
              <Animated.View entering={FadeIn.delay(60).duration(220)}>
                <SafetyBadge verdict={verdict} />
              </Animated.View>
            )}

            {/* ── Dangerous URL warning (only for dangerous, not caution) ── */}
            {user && showUrlDangerWarning && (
              <Animated.View entering={FadeInDown.delay(70).duration(240)}>
                <SafetyWarningCard
                  riskLevel="dangerous"
                  warnings={q.urlSafety!.warnings}
                  title="Dangerous URL Detected"
                />
              </Animated.View>
            )}

            {/* ── Known blacklisted content ─────────────────────── */}
            {showBlacklistWarning && (
              <Animated.View entering={FadeInDown.delay(70).duration(240)}>
                <SafetyWarningCard
                  riskLevel="dangerous"
                  warnings={[`Known scam pattern: ${q.offlineBlacklistMatch.reason}`]}
                  title="Known Scam Pattern"
                />
              </Animated.View>
            )}

            {/* ── Dangerous payment warning ────────────────────── */}
            {showPaymentDangerWarning && (() => {
              const warnings = (q.paymentSafety?.warnings ?? []).filter(
                (w) => !w.toLowerCase().startsWith("pre-filled amount")
              );
              if (!warnings.length) return null;
              return (
                <Animated.View entering={FadeInDown.delay(70).duration(240)}>
                  <SafetyWarningCard
                    riskLevel="dangerous"
                    warnings={warnings}
                    title="Payment Security Warning"
                  />
                </Animated.View>
              );
            })()}

            {/* ── Trust score ──────────────────────────────────── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.delay(80).duration(260)}>
                <TrustScoreCard
                  trustInfo={trust}
                  reportCounts={q.reportCounts}
                  totalScans={q.totalScans}
                  isQrOwner={user ? q.isQrOwner : false}
                  followCount={q.followCount}
                  followersModalOpen={user ? q.followersModalOpen : false}
                  onOpenFollowers={
                    user
                      ? () => {
                          q.handleLoadFollowers();
                          q.setFollowersModalOpen(true);
                        }
                      : () => {}
                  }
                  manipulationWarning={trust.manipulationWarning}
                  scanCountFrozen={q.qrCode?.scanCountFrozen}
                  ownerScanCount={user && q.isQrOwner ? q.qrCode?.ownerScanCount : undefined}
                />
              </Animated.View>
            )}

            {/* ── Community report ─────────────────────────────── */}
            {user && (
              <Animated.View
                entering={FadeInDown.delay(90).duration(260)}
                onLayout={(e: any) => {
                  reportSectionY.current = e.nativeEvent.layout.y;
                }}
              >
                {q.offlineMode ? (
                  <View style={offlineSectionStyles.row}>
                    <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
                    <Text style={[offlineSectionStyles.text, { color: colors.textMuted }]}>
                      Connect to the internet to submit your rating
                    </Text>
                  </View>
                ) : (
                  <ReportGrid
                    reportCounts={q.reportCounts}
                    userReport={q.userReport}
                    isLoggedIn={true}
                    isPayment={contentType === "payment"}
                    onReport={(type) => {
                      const reported = q.handleReport(type);
                      if (!reported) return;
                      const labels: Record<string, string> = {
                        safe: "Safe", scam: "Scam", fake: "Fake", spam: "Spam",
                      };
                      const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                        safe: "shield-checkmark", scam: "warning",
                        fake: "close-circle", spam: "mail-unread",
                      };
                      showToast(`Voted ${labels[type] ?? type}`, icons[type] ?? "flag");
                    }}
                  />
                )}
              </Animated.View>
            )}

            {/* ── Comments ─────────────────────────────────────── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.delay(100).duration(260)}>
                <CommentsSection
                  user={user}
                  totalComments={q.totalComments}
                  commentsList={q.commentsList as any}
                  topLevelComments={q.topLevelComments as any}
                  hasMoreComments={q.hasMoreComments}
                  commentsLoading={q.commentsLoading}
                  newComment={q.newComment}
                  setNewComment={q.setNewComment}
                  replyTo={q.replyTo}
                  setReplyTo={q.setReplyTo}
                  commentMenuId={q.commentMenuId}
                  setCommentMenuId={q.setCommentMenuId}
                  setCommentMenuOwner={q.setCommentMenuOwner}
                  submitting={q.submitting}
                  commentInputRef={q.commentInputRef}
                  userLikes={q.userLikes}
                  deletingCommentId={q.deletingCommentId}
                  revealedComments={q.revealedComments}
                  setRevealedComments={q.setRevealedComments}
                  expandedReplies={q.expandedReplies as any}
                  visibleRepliesCount={q.visibleRepliesCount}
                  handleSubmitComment={q.handleSubmitComment}
                  handleCommentLike={q.handleCommentLike as any}
                  handleDeleteComment={q.handleDeleteComment}
                  setCommentReportModal={q.setCommentReportModal}
                  getAllDescendants={q.getAllDescendants as any}
                  getRootCommentId={q.getRootCommentId}
                  toggleReplies={q.toggleReplies}
                  showMoreReplies={q.showMoreReplies}
                  loadMoreComments={q.loadMoreComments}
                />
              </Animated.View>
            )}

            {/* ── Creator card ──────────────────────────────────── */}
            {user && q.ownerInfo && (
              <Animated.View entering={FadeInDown.delay(110).duration(260)}>
                <SectionHeader label="Creator" />
                <OwnerCard
                  ownerInfo={q.ownerInfo}
                  isQrOwner={q.isQrOwner}
                  followCount={q.followCount}
                  unreadMessages={q.unreadMessages}
                  onOpenFollowers={() => {
                    q.handleLoadFollowers();
                    q.setFollowersModalOpen(true);
                  }}
                  onOpenMessages={() => q.setMessagesModalOpen(true)}
                />
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(120).duration(260)}>
              <DonationBanner />
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <OwnerInfoSheet
        visible={ownerSheetOpen}
        onClose={() => setOwnerSheetOpen(false)}
        ownerInfo={q.ownerInfo as any}
        guardLink={null}
      />

      <CommentMenuSheet
        visible={q.commentMenuId !== null}
        isOwner={q.commentMenuOwner}
        onClose={() => q.setCommentMenuId(null)}
        onDelete={() => {
          const cid = q.commentMenuId!;
          q.setCommentMenuId(null);
          q.handleDeleteComment(cid);
        }}
        onReport={() => {
          const cid = q.commentMenuId!;
          q.setCommentMenuId(null);
          q.setCommentReportModal(cid);
        }}
      />

      <OverflowSheet
        visible={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        isFavorite={q.isFavorite}
        isFollowing={q.isFollowing}
        followLoading={q.followLoading}
        hasOwner={hasOwner}
        onFavorite={handleFavoritePress}
        onWatch={handleWatchPress}
        onReport={handleReportPress}
      />

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
        title="QR Watchers"
        subtitle={`${formatCompactNumber(q.followCount)} ${
          q.followCount === 1 ? "person is" : "people are"
        } watching this QR`}
        emptyIcon="notifications-outline"
        emptyText="No watchers yet"
      />
      <FollowersModal
        visible={q.creatorFollowersModalOpen}
        followCount={q.creatorFollowerCount}
        followers={q.creatorFollowersList}
        loading={q.creatorFollowersLoading}
        onClose={() => q.setCreatorFollowersModalOpen(false)}
        title="Creator Followers"
        subtitle={`${formatCompactNumber(q.creatorFollowerCount)} ${
          q.creatorFollowerCount === 1 ? "follower" : "followers"
        }`}
        emptyIcon="people-outline"
        emptyText="No followers yet"
      />
      <MessagesModal
        visible={q.messagesModalOpen}
        onClose={() => q.setMessagesModalOpen(false)}
        ownerInfo={q.ownerInfo}
        currentUserId={user?.id}
        qrCodeId={id}
      />
    </View>
  );
}

const staticStyles = StyleSheet.create({
  sourceBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 6, marginTop: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
    alignSelf: "flex-start",
  },
  sourceBadgeText: {
    fontSize: 11, fontFamily: "Inter_500Medium",
  },
});
