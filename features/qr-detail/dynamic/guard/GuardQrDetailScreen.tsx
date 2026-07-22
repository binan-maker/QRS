import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavHide } from "@/shared/hooks/useNavHide";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  StyleSheet, KeyboardAvoidingView, Linking, type LayoutChangeEvent,
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
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { getGuardLink, type GuardLink } from "@/services/guard-service";
import { detectContentType } from "@/features/qr-engine";
import { makeStyles } from "@/features/qr-detail/styles";
import { formatCompactNumber } from "@/shared/utils/number-format";
import { REPORT_LABELS, REPORT_ICONS } from "@/features/qr-detail/utils/report-toast";

import GuardHeroCard from "./GuardHeroCard";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
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


function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

function sanitizeAndOpen(dest: string) {
  const url = dest.startsWith("http") ? dest : `https://${dest}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    const h = parsed.hostname.toLowerCase();
    const privateIPs = [/^localhost$/, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./];
    if (privateIPs.some((re) => re.test(h))) return;
    Linking.openURL(parsed.href);
  } catch {}
}

interface Props {
  id: string;
  guardUuid: string;
  ownerDocId?: string;
  hint?: { content: string; contentType: string };
}

export default function GuardQrDetailScreen({ id, guardUuid, ownerDocId, hint }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const topInset = useTopInset();

  const [guardLink, setGuardLink] = useState<GuardLink | null>(null);
  const [guardLoading, setGuardLoading] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [ownerSheetOpen, setOwnerSheetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [toastState, setToastState] = useState<{
    message: string; icon: keyof typeof Ionicons.glyphMap; key: number;
  }>({ message: "", icon: "checkmark-circle", key: 0 });
  const showToast = useCallback(
    (message: string, icon: keyof typeof Ionicons.glyphMap = "checkmark-circle") => {
      setToastState((prev) => ({ message, icon, key: prev.key + 1 }));
    }, []
  );

  useEffect(() => {
    setGuardLoading(true);
    getGuardLink(guardUuid)
      .then(setGuardLink)
      .catch(() => setGuardLink(null))
      .finally(() => setGuardLoading(false));
  }, [guardUuid]);

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

  const recentlyChanged = useMemo(
    () =>
      guardLink?.destinationChangedAt
        ? Date.now() - new Date(guardLink.destinationChangedAt).getTime() < 24 * 60 * 60 * 1000
        : false,
    [guardLink?.destinationChangedAt]
  );

  const trust = q.trustInfo;
  const hasOwner = !!(guardLink?.businessName || guardLink?.ownerName);
  const isDeactivated = guardLink?.isActive === false;
  const isQrOwner = !!(user?.id && guardLink?.ownerId && user.id === guardLink.ownerId);

  const ownerInfoForSheet = useMemo(
    () =>
      guardLink
        ? {
            businessName: guardLink.businessName,
            ownerName: guardLink.ownerName,
            qrType: "guard" as const,
            isBranded: true,
            ownerId: guardLink.ownerId,
            brandedUuid: guardUuid,
            isActive: guardLink.isActive,
          }
        : null,
    [guardLink, guardUuid]
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
    setTimeout(() => { q.scrollRef.current?.scrollTo({ y: reportSectionY.current, animated: true }); }, 280);
  }, [user, q.scrollRef]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineToast key={offlineToastKey} visible={offlineToastKey > 0} />
      <QrToast message={toastState.message} icon={toastState.icon} toastKey={toastState.key} />
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor="transparent" translucent />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={styles.container}>

          {/* ── Absolute animated navBar ── */}
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
                <View style={guardNavStyles.titleRow}>
                  <View style={[guardNavStyles.shieldWrap, { backgroundColor: colors.surfaceLight }]}>
                    <Ionicons name="shield-checkmark" size={15} color={colors.safe} />
                  </View>
                  <Text style={[guardNavStyles.title, { color: colors.text }]} numberOfLines={1}>
                    Living Shield QR
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
            {/* ── Hero Card ── */}
            <Animated.View entering={FadeInDown.delay(30).duration(260)}>
              <GuardHeroCard
                guardLink={guardLink}
                guardLoading={guardLoading}
                isDeactivated={isDeactivated}
                recentlyChanged={recentlyChanged}
                historyExpanded={historyExpanded}
                onToggleHistory={() => setHistoryExpanded((v) => !v)}
                onOpenDestination={() => guardLink && sanitizeAndOpen(guardLink.currentDestination)}
                colors={colors}
                isDark={isDark}
              />
            </Animated.View>

            {/* ── Trust Score ── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.delay(70).duration(260)}>
                <TrustScoreCard
                  trustInfo={trust}
                  reportCounts={q.reportCounts}
                  totalScans={q.totalScans}
                  isQrOwner={isQrOwner}
                  followCount={q.followCount}
                  followersModalOpen={user ? q.followersModalOpen : false}
                  onOpenFollowers={user ? () => { q.handleLoadFollowers(); q.setFollowersModalOpen(true); } : () => {}}
                  ownerScanCount={user && isQrOwner ? q.qrCode?.ownerScanCount : undefined}
                  hasOwner={true}
                />
              </Animated.View>
            )}

            {/* ── Reports ── */}
            {user && !q.offlineMode && (
              <Animated.View
                entering={FadeInDown.delay(80).duration(260)}
                onLayout={(e: LayoutChangeEvent) => { reportSectionY.current = e.nativeEvent.layout.y; }}
              >
                <ReportGrid
                  reportCounts={q.reportCounts}
                  userReport={q.userReport}
                  isLoggedIn
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

            {/* ── Comments ── */}
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

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <OwnerInfoSheet
        visible={ownerSheetOpen}
        onClose={() => setOwnerSheetOpen(false)}
        ownerInfo={ownerInfoForSheet as any}
        guardLink={guardLink}
      />
      <CommentMenuSheet
        visible={q.commentMenuId !== null}
        isOwner={q.commentMenuOwner}
        onClose={() => q.setCommentMenuId(null)}
        onDelete={() => { const cid = q.commentMenuId!; q.setCommentMenuId(null); q.handleDeleteComment(cid); }}
        onReport={() => { const cid = q.commentMenuId!; q.setCommentMenuId(null); q.setCommentReportModal(cid); }}
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
        subtitle={`${formatCompactNumber(q.followCount)} ${q.followCount === 1 ? "person is" : "people are"} watching this QR`}
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

const guardNavStyles = StyleSheet.create({
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  shieldWrap: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
});
