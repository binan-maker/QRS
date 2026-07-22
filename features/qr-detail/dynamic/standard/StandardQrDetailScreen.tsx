import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavHide } from "@/shared/utils/use-nav-hide";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  StyleSheet, KeyboardAvoidingView, type LayoutChangeEvent,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTopInset } from "@/shared/utils/platform";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useQrSafety } from "@/features/qr-detail/hooks/useQrSafety";
import { useNetworkStatus } from "@/shared/utils/use-network";
import { getStandardLink } from "@/services/guard-service";
import { detectContentType } from "@/features/qr-engine";
import { makeStyles } from "@/features/qr-detail/styles";
import { formatCompactNumber } from "@/shared/utils/number-format";
import { REPORT_LABELS, REPORT_ICONS } from "@/features/qr-detail/utils/report-toast";

import { ContentCard } from "@/features/qr-engine/content-cards";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import SafetyWarningCard from "@/features/qr-detail/components/SafetyWarningCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";
import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import CommentsSection from "@/features/qr-detail/components/CommentsSection";
import OwnerInfoSheet from "@/features/qr-detail/components/sheets/OwnerInfoSheet";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";
import { smartOpenContent } from "@/shared/utils/smart-open";


function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

interface StandardData {
  rawContent: string;
  contentType: string;
  ownerId: string;
  ownerName: string;
  isActive: boolean;
  templateKey?: string;
}

interface Props {
  id: string;
  standardUuid: string;
  ownerDocId?: string;
  hint?: { content: string; contentType: string };
}

export default function StandardQrDetailScreen({ id, standardUuid, ownerDocId, hint }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const topInset = useTopInset();

  const [standardData, setStandardData] = useState<StandardData | null>(null);
  const [standardLoading, setStandardLoading] = useState(true);
  const [ownerSheetOpen, setOwnerSheetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [toastState, setToastState] = useState<{
    message: string;
    icon: keyof typeof Ionicons.glyphMap;
    key: number;
  }>({ message: "", icon: "checkmark-circle", key: 0 });
  const showToast = useCallback(
    (message: string, icon: keyof typeof Ionicons.glyphMap = "checkmark-circle") => {
      setToastState((prev) => ({ message, icon, key: prev.key + 1 }));
    },
    []
  );

  useEffect(() => {
    setStandardLoading(true);
    getStandardLink(standardUuid)
      .then(setStandardData)
      .catch(() => setStandardData(null))
      .finally(() => setStandardLoading(false));
  }, [standardUuid]);

  const q = useQrDetail(id, hint);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);

  useEffect(() => {
    if (q.reportError) showToast(q.reportError, "alert-circle-outline");
  }, [q.reportError, showToast]);

  useEffect(() => {
    if (!q.followError) return;
    showToast(q.followError, "alert-circle-outline");
    q.clearFollowError();
  }, [q.followError, q.clearFollowError, showToast]);

  useEffect(() => {
    if (!q.favoriteError) return;
    showToast(q.favoriteError, "alert-circle-outline");
    q.clearFavoriteError();
  }, [q.favoriteError, q.clearFavoriteError, showToast]);

  // Derive content from the database record — NEVER from the scanned guard URL
  const effectiveContent = standardData?.rawContent ?? "";
  const effectiveContentType = useMemo(
    () => (standardData ? standardData.contentType || detectContentType(standardData.rawContent) : "text"),
    [standardData]
  );

  // Run safety analysis on rawContent directly, not on the scanned guard URL
  const contentSafety = useQrSafety(effectiveContent || null, effectiveContentType || null);

  const isDeactivated = standardData?.isActive === false;
  const isQrOwner = !!(user?.id && standardData?.ownerId && user.id === standardData.ownerId);
  const trust = q.trustInfo;

  const ownerInfoForSheet = useMemo(
    () =>
      standardData
        ? {
            businessName: null,
            ownerName: standardData.ownerName,
            qrType: "individual" as const,
            isBranded: true,
            ownerId: standardData.ownerId,
            brandedUuid: standardUuid,
            isActive: standardData.isActive,
          }
        : null,
    [standardData, standardUuid]
  );

  const handleOpenContent = useCallback(
    () => smartOpenContent(effectiveContent, effectiveContentType, standardData?.templateKey),
    [effectiveContent, effectiveContentType, standardData?.templateKey]
  );

  const handleWatchPress = useCallback(() => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!isOnline) { setOfflineToastKey((k) => k + 1); return; }
    const willWatch = !q.isFollowing;
    q.handleToggleFollow();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(willWatch ? "Watching this QR" : "Unwatched", willWatch ? "notifications" : "notifications-off-outline");
  }, [user, isOnline, q.isFollowing, q.handleToggleFollow, showToast]);

  const handleFavoritePress = useCallback(() => {
    if (!user) { router.push("/(auth)/login"); return; }
    const willFav = !q.isFavorite;
    q.handleToggleFavorite();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(willFav ? "Added to favorites" : "Removed from favorites", willFav ? "heart" : "heart-outline");
  }, [user, q.isFavorite, q.handleToggleFavorite, showToast]);

  const reportSectionY = useRef(0);
  const { navAnimatedStyle, onNavScroll, setNavHeight } = useNavHide();
  const [navBarH, setNavBarH] = useState(0);
  const handleReportPress = useCallback(() => {
    setOverflowOpen(false);
    if (!user) { router.push("/(auth)/login"); return; }
    setTimeout(() => {
      q.scrollRef.current?.scrollTo({ y: reportSectionY.current, animated: true });
    }, 280);
  }, [user, q.scrollRef]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineToast key={offlineToastKey} visible={offlineToastKey > 0} />
      <QrToast message={toastState.message} icon={toastState.icon} toastKey={toastState.key} />
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor="transparent" translucent />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={styles.container}>

          {/* ── Absolute animated navBar ─────────────────── */}
          <Animated.View
            style={[
              { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background },
              navAnimatedStyle,
            ]}
            onLayout={(e: LayoutChangeEvent) => { const h = e.nativeEvent.layout.height; setNavBarH(h); setNavHeight(h); }}
          >
            <View style={{ paddingTop: topInset }}>
              <Animated.View entering={FadeInDown.delay(0).duration(260)} style={[styles.navBar, { gap: 10 }]}>
                <Animated.View entering={FadeIn.delay(30).duration(240)}>
                  <Pressable onPress={safeBack} style={styles.navBackBtn} accessibilityLabel="Go back" accessibilityRole="button">
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                  </Pressable>
                </Animated.View>
                <View style={stdStyles.navTitleRow}>
                  <Text style={[stdStyles.navTitle, { color: colors.text }]} numberOfLines={1}>
                    QR Details
                  </Text>
                </View>
                <Animated.View entering={FadeIn.delay(35).duration(240)}>
                  <Pressable
                    onPress={() => router.push("/donation")}
                    style={styles.navBackBtn}
                    hitSlop={6}
                    accessibilityLabel="Donate"
                    accessibilityRole="button"
                  >
                    <Ionicons name="heart-outline" size={20} color={colors.primary} />
                  </Pressable>
                </Animated.View>
                <Animated.View entering={FadeIn.delay(40).duration(240)}>
                  <Pressable onPress={() => setOverflowOpen(true)} style={styles.navBackBtn} accessibilityLabel="More options" accessibilityRole="button">
                    <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
                  </Pressable>
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>

          <ScrollView
            ref={q.scrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingTop: navBarH }]}
            keyboardShouldPersistTaps="handled"
            onScroll={onNavScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => q.setCommentMenuId(null)}
            refreshControl={
              <RefreshControl
                refreshing={q.commentsRefreshing ?? false}
                onRefresh={() => { q.refreshComments(); q.refreshQrData(); }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* ── Deactivated notice ────────────────────── */}
            {isDeactivated && (
              <Animated.View entering={FadeInDown.delay(30).duration(260)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, backgroundColor: "#ef444418", borderColor: "#ef444440", padding: 14, marginBottom: 12 }}>
                  <Ionicons name="ban-outline" size={16} color="#ef4444" />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#ef4444", flex: 1 }}>
                    This QR code has been deactivated by its owner
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* ── Content card — shows rawContent from database, never the scanned guard URL */}
            {!standardLoading && effectiveContent && (
              <Animated.View entering={FadeInDown.delay(70).duration(260)}>
                <ContentCard
                  content={effectiveContent}
                  contentType={effectiveContentType}
                  parsedPayment={contentSafety.parsedPayment}
                  isDeactivated={isDeactivated}
                  onOpenContent={handleOpenContent}
                  hideOpenAction={false}
                  templateKey={standardData?.templateKey}
                />
              </Animated.View>
            )}

            {/* ── Payment safety — dangerous only ─── */}
            {effectiveContentType === "payment" && contentSafety.paymentSafety?.riskLevel === "dangerous" && (() => {
              const warnings = (contentSafety.paymentSafety?.warnings ?? []).filter(
                (w) => !w.toLowerCase().startsWith("pre-filled amount")
              );
              if (!warnings.length) return null;
              return (
                <Animated.View entering={FadeInDown.delay(80).duration(260)}>
                  <SafetyWarningCard
                    riskLevel="dangerous"
                    warnings={warnings}
                    title="Payment Security Warning"
                  />
                </Animated.View>
              );
            })()}

            {/* ── URL safety — dangerous only ────── */}
            {effectiveContentType === "url" && contentSafety.urlSafety?.riskLevel === "dangerous" && (
              <Animated.View entering={FadeInDown.delay(80).duration(260)}>
                <SafetyWarningCard
                  riskLevel="dangerous"
                  warnings={contentSafety.urlSafety.warnings}
                  title="Destination Warning"
                />
              </Animated.View>
            )}

            {/* ── Community: Trust score ───────────────────── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.delay(90).duration(260)}>
                <TrustScoreCard
                  trustInfo={trust}
                  reportCounts={q.reportCounts}
                  totalScans={q.totalScans}
                  isQrOwner={isQrOwner}
                  followCount={q.followCount}
                  followersModalOpen={user ? q.followersModalOpen : false}
                  onOpenFollowers={
                    user
                      ? () => { q.handleLoadFollowers(); q.setFollowersModalOpen(true); }
                      : () => {}
                  }
                  ownerScanCount={user && isQrOwner ? q.qrCode?.ownerScanCount : undefined}
                  hasOwner={true}
                />
              </Animated.View>
            )}

            {/* ── Reports (logged-in only) ─────────────────── */}
            {user && !q.offlineMode && (
              <Animated.View
                entering={FadeInDown.delay(100).duration(260)}
                onLayout={(e: LayoutChangeEvent) => { reportSectionY.current = e.nativeEvent.layout.y; }}
              >
                <ReportGrid
                  reportCounts={q.reportCounts}
                  userReport={q.userReport}
                  isLoggedIn={true}
                  isPayment={false}
                  loading={q.reportLoading}
                  onReport={(type) => {
                    const isRemoving = q.userReport === type;
                    const reported = q.handleReport(type);
                    if (!reported) return;
                    if (isRemoving) {
                      showToast(`Removed ${REPORT_LABELS[type] ?? type} vote`, "close-circle-outline");
                    } else {
                      showToast(`Voted ${REPORT_LABELS[type] ?? type}`, REPORT_ICONS[type] ?? "flag");
                    }
                  }}
                />
              </Animated.View>
            )}

            {/* ── Comments ─────────────────────────────────── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.delay(110).duration(260)}>
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

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <OwnerInfoSheet
        visible={ownerSheetOpen}
        onClose={() => setOwnerSheetOpen(false)}
        ownerInfo={ownerInfoForSheet as any}
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
        hasOwner={!!ownerInfoForSheet}
        onFavorite={handleFavoritePress}
        onWatch={handleWatchPress}
        onReport={handleReportPress}
      />

      <CommentReportModal
        commentId={q.commentReportModal}
        onReport={(commentId, reason) => {
          q.handleCommentReport(commentId, reason);
          showToast("Thanks for reporting", "flag-outline");
        }}
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
      <MessagesModal
        visible={q.messagesModalOpen}
        isQrOwner={isQrOwner}
        ownerInfo={q.ownerInfo}
        messages={q.messages}
        messageText={q.messageText}
        sendingMessage={q.sendingMessage}
        user={user}
        onChangeText={q.setMessageText}
        onSend={q.handleSendMessage}
        onClose={() => q.setMessagesModalOpen(false)}
      />
    </View>
  );
}

const stdStyles = StyleSheet.create({
  navTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  navTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
});
