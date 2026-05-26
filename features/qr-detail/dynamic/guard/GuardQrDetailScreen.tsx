import { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  StyleSheet, KeyboardAvoidingView, ActivityIndicator, Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTopInset } from "@/lib/utils/platform";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useNetworkStatus } from "@/lib/utils/use-network";
import { getGuardLink, type GuardLink } from "@/lib/services/guard-service";
import { detectContentType } from "@/lib/services/qr-content-type";
import { makeStyles, offlineSectionStyles } from "@/features/qr-detail/styles";
import { formatCompactNumber } from "@/lib/number-format";

import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";
import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import OwnerCircleRow from "@/features/qr-detail/components/OwnerCircleRow";
import CommentsSection from "@/features/qr-detail/components/CommentsSection";
import DonationBanner from "@/features/qr-detail/components/DonationBanner";
import OwnerInfoSheet from "@/features/qr-detail/components/sheets/OwnerInfoSheet";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";

const ACCENT = "#6366f1";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
}

export default function GuardQrDetailScreen({ id, guardUuid, ownerDocId }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const topInset = useTopInset();

  const [guardLink, setGuardLink] = useState<GuardLink | null>(null);
  const [guardLoading, setGuardLoading] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [ownerSheetOpen, setOwnerSheetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [toastState, setToastState] = useState<{
    message: string;
    icon: keyof typeof Ionicons.glyphMap;
    key: number;
  }>({ message: "", icon: "checkmark-circle", key: 0 });
  const lastToastTime = useRef(0);

  const showToast = useCallback(
    (message: string, icon: keyof typeof Ionicons.glyphMap = "checkmark-circle") => {
      const now = Date.now();
      if (now - lastToastTime.current < 2200) return;
      lastToastTime.current = now;
      setToastState((prev) => ({ message, icon, key: prev.key + 1 }));
    },
    []
  );

  useEffect(() => {
    setGuardLoading(true);
    getGuardLink(guardUuid)
      .then(setGuardLink)
      .catch(() => setGuardLink(null))
      .finally(() => setGuardLoading(false));
  }, [guardUuid]);

  const q = useQrDetail(id);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);

  const effectiveContent = guardLink?.currentDestination ?? "";
  const effectiveContentType = guardLink
    ? (guardLink.contentType || detectContentType(guardLink.currentDestination))
    : "url";

  const recentlyChanged = guardLink?.destinationChangedAt
    ? Date.now() - new Date(guardLink.destinationChangedAt).getTime() < 24 * 60 * 60 * 1000
    : false;

  const trust = q.getTrustInfo();
  const hasOwner = !!(guardLink?.businessName || guardLink?.ownerName);
  const isDeactivated = guardLink?.isActive === false;
  const isQrOwner = !!(user?.id && guardLink?.ownerId && user.id === guardLink.ownerId);

  const ownerInfoForSheet = guardLink
    ? {
        businessName: guardLink.businessName,
        ownerName: guardLink.ownerName,
        qrType: "guard",
        isBranded: true,
        ownerId: guardLink.ownerId,
        brandedUuid: guardUuid,
        isActive: guardLink.isActive,
      }
    : null;

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
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.container, { paddingTop: topInset }]}>

          {/* ── Guard NavBar ─────────────────────────────────── */}
          <View style={[styles.navBar, { gap: 10 }]}>
            <Pressable onPress={safeBack} style={styles.navBackBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={guardStyles.navTitleRow}>
              <View style={[guardStyles.navShieldWrap, { backgroundColor: ACCENT + "18" }]}>
                <Ionicons name="shield-checkmark" size={15} color={ACCENT} />
              </View>
              <Text style={[guardStyles.navTitle, { color: colors.text }]} numberOfLines={1}>
                Living Shield QR
              </Text>
            </View>
            <Pressable onPress={() => setOverflowOpen(true)} style={styles.navBackBtn}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </Pressable>
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
                tintColor={ACCENT}
                colors={[ACCENT]}
              />
            }
          >
            {/* ── Hero: Living Shield Card ─────────────────── */}
            <Animated.View entering={FadeInDown.duration(220)}>
              <View style={[guardStyles.heroCard, {
                backgroundColor: isDark ? "#0d0d1a" : "#f5f5ff",
                borderColor: ACCENT + "28",
              }]}>
                <LinearGradient
                  colors={[ACCENT + "1a", ACCENT + "06"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />

                {/* Header row */}
                <View style={guardStyles.heroHeader}>
                  <View style={[guardStyles.heroIconWrap, {
                    backgroundColor: ACCENT + "22",
                    borderColor: ACCENT + "44",
                  }]}>
                    <Ionicons name="git-branch-outline" size={24} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[guardStyles.heroLabel, { color: ACCENT }]}>SMART REDIRECT QR</Text>
                    <Text style={[guardStyles.heroSub, { color: colors.textSecondary }]}>
                      Destination is owner-controlled &amp; verified by QR Guard
                    </Text>
                  </View>
                  {isDeactivated && (
                    <View style={[guardStyles.statusPill, { backgroundColor: "#ef444422", borderColor: "#ef444440" }]}>
                      <Ionicons name="ban" size={12} color="#ef4444" />
                      <Text style={[guardStyles.statusPillText, { color: "#ef4444" }]}>Inactive</Text>
                    </View>
                  )}
                  {!isDeactivated && !guardLoading && guardLink && (
                    <View style={[guardStyles.statusPill, { backgroundColor: "#22c55e22", borderColor: "#22c55e40" }]}>
                      <View style={[guardStyles.statusDot, { backgroundColor: "#22c55e" }]} />
                      <Text style={[guardStyles.statusPillText, { color: "#22c55e" }]}>Active</Text>
                    </View>
                  )}
                </View>

                {guardLoading && (
                  <View style={guardStyles.loadingRow}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={[guardStyles.loadingText, { color: colors.textSecondary }]}>
                      Loading destination…
                    </Text>
                  </View>
                )}

                {!guardLoading && guardLink && (
                  <>
                    {/* Owner */}
                    {(guardLink.businessName || guardLink.ownerName) && (
                      <View style={[guardStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
                        <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                        <Text style={[guardStyles.infoLabel, { color: colors.textSecondary }]}>Owner</Text>
                        <Text style={[guardStyles.infoValue, { color: colors.text }]} numberOfLines={1}>
                          {guardLink.businessName || guardLink.ownerName}
                        </Text>
                      </View>
                    )}

                    {/* Current destination */}
                    <View style={[guardStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
                      <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
                      <Text style={[guardStyles.infoLabel, { color: colors.textSecondary }]}>Points to</Text>
                      <Text style={[guardStyles.infoValue, { color: colors.text }]} numberOfLines={2}>
                        {guardLink.currentDestination}
                      </Text>
                    </View>

                    {/* Last changed timestamp */}
                    {guardLink.destinationChangedAt && (
                      <View style={[guardStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[guardStyles.infoLabel, { color: colors.textSecondary }]}>Changed</Text>
                        <Text style={[guardStyles.infoValue, { color: colors.text }]}>
                          {formatRelativeTime(guardLink.destinationChangedAt)}
                        </Text>
                      </View>
                    )}

                    {/* Recently changed warning */}
                    {recentlyChanged && (
                      <View style={[guardStyles.alertRow, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" }]}>
                        <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                        <Text style={[guardStyles.alertText, { color: "#f59e0b" }]}>
                          Destination changed within the last 24 hours — verify before opening
                        </Text>
                      </View>
                    )}

                    {/* Deactivated state */}
                    {isDeactivated && (
                      <View style={[guardStyles.alertRow, { backgroundColor: "#ef444418", borderColor: "#ef444440" }]}>
                        <Ionicons name="ban-outline" size={14} color="#ef4444" />
                        <Text style={[guardStyles.alertText, { color: "#ef4444" }]}>
                          This QR code has been deactivated by its owner
                        </Text>
                      </View>
                    )}

                    {/* Open destination button */}
                    {!isDeactivated && (
                      <Pressable
                        style={({ pressed }) => [
                          guardStyles.openBtn,
                          { backgroundColor: ACCENT, opacity: pressed ? 0.82 : 1 },
                        ]}
                        onPress={() => sanitizeAndOpen(guardLink.currentDestination)}
                      >
                        <Ionicons name="open-outline" size={16} color="#fff" />
                        <Text style={guardStyles.openBtnText}>Open Destination</Text>
                      </Pressable>
                    )}

                    {/* Change history accordion */}
                    {guardLink.changeLog && guardLink.changeLog.length > 0 && (
                      <>
                        <Pressable
                          style={[guardStyles.historyToggle, { borderColor: colors.surfaceBorder + "60" }]}
                          onPress={() => setHistoryExpanded((v) => !v)}
                        >
                          <Ionicons name="time-outline" size={14} color={ACCENT} />
                          <Text style={[guardStyles.historyToggleText, { color: ACCENT }]}>
                            Change history ({guardLink.changeLog.length})
                          </Text>
                          <Ionicons
                            name={historyExpanded ? "chevron-up" : "chevron-down"}
                            size={14}
                            color={ACCENT}
                          />
                        </Pressable>

                        {historyExpanded && (
                          <View style={guardStyles.historyList}>
                            {[...guardLink.changeLog].reverse().map((entry, i) => (
                              <View
                                key={i}
                                style={[guardStyles.historyEntry, {
                                  borderColor: colors.surfaceBorder + "40",
                                  backgroundColor: isDark ? "#ffffff06" : "#00000004",
                                }]}
                              >
                                <Text style={[guardStyles.historyTime, { color: colors.textSecondary }]}>
                                  {formatRelativeTime(entry.changedAt)}
                                </Text>
                                <Text style={[guardStyles.historyFrom, { color: colors.textMuted }]} numberOfLines={1}>
                                  ← {entry.from}
                                </Text>
                                <Text style={[guardStyles.historyTo, { color: colors.text }]} numberOfLines={1}>
                                  → {entry.to}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}

                {!guardLoading && !guardLink && (
                  <Text style={[guardStyles.loadingText, { color: colors.textSecondary }]}>
                    Could not load guard link data
                  </Text>
                )}
              </View>
            </Animated.View>

            {/* ── Owner row ────────────────────────────────── */}
            {hasOwner && ownerInfoForSheet && (
              <Animated.View entering={FadeInDown.duration(240)}>
                <OwnerCircleRow
                  ownerInfo={ownerInfoForSheet as any}
                  onPress={() => setOwnerSheetOpen(true)}
                />
              </Animated.View>
            )}

            {/* ── Community: Trust score ───────────────────── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(280)}>
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
                  manipulationWarning={trust.manipulationWarning}
                  scanCountFrozen={q.qrCode?.scanCountFrozen}
                  ownerScanCount={user && isQrOwner ? q.qrCode?.ownerScanCount : undefined}
                />
              </Animated.View>
            )}

            {/* ── Reports (logged-in only) ─────────────────── */}
            {user && !q.offlineMode && (
              <Animated.View
                entering={FadeInDown.duration(290)}
                onLayout={(e: any) => { reportSectionY.current = e.nativeEvent.layout.y; }}
              >
                <ReportGrid
                  reportCounts={q.reportCounts}
                  userReport={q.userReport}
                  isLoggedIn={true}
                  isPayment={false}
                  onReport={(type) => {
                    const reported = q.handleReport(type);
                    if (!reported) return;
                    const labels: Record<string, string> = { safe: "Safe", scam: "Scam", fake: "Fake", spam: "Spam" };
                    const icons: Record<string, keyof typeof Ionicons.glyphMap> = { safe: "shield-checkmark", scam: "warning", fake: "close-circle", spam: "mail-unread" };
                    showToast(`Voted ${labels[type] ?? type}`, icons[type] ?? "flag");
                  }}
                />
              </Animated.View>
            )}

            {/* ── Comments ─────────────────────────────────── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(300)}>
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

            <Animated.View entering={FadeInDown.duration(300)}>
              <DonationBanner />
            </Animated.View>
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
        onMarkRead={() => {}}
        onClose={() => q.setMessagesModalOpen(false)}
      />
    </View>
  );
}

const guardStyles = StyleSheet.create({
  navTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  navShieldWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  heroHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.3,
    marginBottom: 2,
  },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 66, flexShrink: 0, marginTop: 1 },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertText: { fontSize: 12.5, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 2,
  },
  openBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historyToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  historyList: { gap: 6, marginTop: 4 },
  historyEntry: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  historyTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historyFrom: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyTo: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
