import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { useNavHide } from "@/shared/hooks/useNavHide";
import {
  View, Text, Pressable, RefreshControl,
  StyleSheet, KeyboardAvoidingView, type LayoutChangeEvent,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTopInset } from "@/shared/utils/platform";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { makeStyles, offlineSectionStyles } from "@/features/qr-detail/styles";
import { REPORT_LABELS, REPORT_ICONS } from "@/features/qr-detail/utils/report-toast";

import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import { ContentCard } from "@/features/qr-engine/content-cards";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import EarlyCommunityCard from "@/features/qr-detail/components/EarlyCommunityCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import QrDetailNavBar from "@/features/qr-detail/components/QrDetailNavBar";
import CommentsSection from "@/features/qr-detail/components/CommentsSection";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

// Keep the existing verdict presentation for rated non-owner QRs.
const TrustVerdictBanner = memo(function TrustVerdictBanner({
  trust,
  isDark,
}: {
  trust: { score: number; label?: string } | null;
  isDark: boolean;
}) {
  const score = trust?.score ?? -1;
  const accent = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#94A3B8";
  const iconName: keyof typeof Ionicons.glyphMap =
    score >= 70 ? "shield-checkmark-outline"
    : score >= 40 ? "information-circle-outline"
    : "help-circle-outline";
  const statusLabel = score >= 70 ? "COMMUNITY TRUSTED" : score >= 40 ? "COMMUNITY CAUTION" : "NO COMMUNITY SIGNAL";
  const bg = score >= 70
    ? (isDark ? "#0a1a0e" : "#f0fdf4")
    : score >= 40
    ? (isDark ? "#161204" : "#fffbeb")
    : (isDark ? "#0f172a" : "#f8fafc");

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[verdictBannerStyles.banner, { backgroundColor: bg, borderColor: accent + "28" }]}>
        <View style={[verdictBannerStyles.accentBar, { backgroundColor: accent }]} />
        <View style={[verdictBannerStyles.iconBox, { borderColor: accent + "45", backgroundColor: accent + "12" }]}>
          <Ionicons name={iconName} size={22} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={verdictBannerStyles.eyebrowRow}>
            <View style={[verdictBannerStyles.dot, { backgroundColor: accent }]} />
            <Text style={[verdictBannerStyles.eyebrow, { color: accent }]}>{statusLabel}</Text>
          </View>
          <Text style={[verdictBannerStyles.scoreText, { color: isDark ? "#e2e8f0" : "#1e293b" }]}>
            {trust?.label ?? "Rated"}
          </Text>
          <Text style={[verdictBannerStyles.sub, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            Based on {score} community trust points
          </Text>
        </View>
      </View>
    </View>
  );
});

interface Props {
  id: string;
  hint?: { content: string; contentType: string };
}

export default function StaticQrDetailScreen({ id, hint }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const topInset = useTopInset();

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [toastState, setToastState] = useState<{
    message: string;
    icon: keyof typeof Ionicons.glyphMap;
    key: number;
  }>({ message: "", icon: "checkmark-circle", key: 0 });
  const reportSectionY = useRef(0);
  const { navAnimatedStyle, onNavAnimatedScroll, setNavHeight } = useNavHide();
  const [navBarH, setNavBarH] = useState(0);

  const showToast = useCallback(
    (message: string, icon: keyof typeof Ionicons.glyphMap = "checkmark-circle") => {
      setToastState((prev) => ({ message, icon, key: prev.key + 1 }));
    },
    []
  );

  // Memoize styles so makeStyles() isn't called on every render (colors is stable
  // across renders unless the user switches themes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const q = useQrDetail(id, hint);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);

  useEffect(() => {
    if (q.reportError) showToast(q.reportError, "alert-circle-outline");
  }, [q.reportError, showToast]);

  useEffect(() => {
    if (!q.favoriteError) return;
    showToast(q.favoriteError, "alert-circle-outline");
    q.clearFavoriteError();
  }, [q.favoriteError]);

  // trustInfo and combinedVerdict are pre-memoized in useQrDetail — calling the
  // function wrappers is free (they just return the cached value).
  const trust     = q.trustInfo;

  const content     = q.qrCode?.content || q.offlineContent || "";
  const contentType = q.qrCode?.contentType || q.offlineContentType || "text";

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

  if (q.loading || (!q.initialDataReady && !q.loadError)) return <LoadingSkeleton topInset={topInset} />;

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
          <Text style={styles.errorSub}>This QR code doesn&apos;t exist or couldn&apos;t be loaded.</Text>
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
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor="transparent" translucent />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={styles.container}>

          {/* Absolute animated navBar */}
          <Animated.View
            style={[
              { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background },
              navAnimatedStyle,
            ]}
            onLayout={(e: LayoutChangeEvent) => { const h = e.nativeEvent.layout.height; setNavBarH(h); setNavHeight(h); }}
          >
            <View style={{ paddingTop: topInset }}>
              <QrDetailNavBar
                offlineMode={q.offlineMode}
                onBack={safeBack}
                onOverflowOpen={() => setOverflowOpen(true)}
                onDonate={() => router.push("/donation")}
              />
            </View>
          </Animated.View>

          <Animated.ScrollView
            ref={q.scrollRef}
            style={{ flex: 1 }}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingTop: navBarH }]}
            keyboardShouldPersistTaps="handled"
            onScroll={onNavAnimatedScroll}
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
            {/* ── Community trust verdict ──────────────────────── */}
            {q.initialDataReady && !q.offlineMode && (
              trust.score < 0 ? (
                <EarlyCommunityCard
                  isLoggedIn={!!user}
                  onRatePress={handleReportPress}
                />
              ) : (
                <TrustVerdictBanner trust={trust} isDark={isDark} />
              )
            )}

            {/* ── CONTENT CARD — HERO ──────────────────────────── */}
            <View>
              <ContentCard
                content={content}
                contentType={contentType}
                parsedPayment={q.parsedPayment}
                isDeactivated={false}
                onOpenContent={q.handleOpenContent}
                hideOpenAction={false}
                templateKey={(q.qrCode as any)?.templateKey}
              />
            </View>

            {/* ── Trust score ──────────────────────────────────── */}
            {q.initialDataReady && !q.offlineMode && (
              <View>
                <TrustScoreCard
                  trustInfo={trust}
                  reportCounts={q.reportCounts}
                  totalScans={q.totalScans}
                />
              </View>
            )}

            {/* ── Community report ─────────────────────────────── */}
            {user && (
              <View
                onLayout={(e: LayoutChangeEvent) => {
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
                )}
              </View>
            )}

            {/* ── Comments ─────────────────────────────────────── */}
            {!q.offlineMode && (
              <View>
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
                  getAllDescendants={q.getAllDescendants as any}
                  getRootCommentId={q.getRootCommentId}
                  toggleReplies={q.toggleReplies}
                  showMoreReplies={q.showMoreReplies}
                  loadMoreComments={q.loadMoreComments}
                />
              </View>
            )}

          </Animated.ScrollView>
        </View>
      </KeyboardAvoidingView>

      <CommentMenuSheet
        visible={q.commentMenuId !== null}
        isOwner={q.commentMenuOwner}
        onClose={() => q.setCommentMenuId(null)}
        onDelete={() => {
          const cid = q.commentMenuId!;
          q.setCommentMenuId(null);
          q.handleDeleteComment(cid);
        }}
      />

      <OverflowSheet
        visible={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        isFavorite={q.isFavorite}
        onFavorite={handleFavoritePress}
         onReport={() => showToast("Feature Coming Soon!", "time-outline")}
      />

    </View>
  );
}

const verdictBannerStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    paddingVertical: 14,
    paddingRight: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
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
  dot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  scoreText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
    lineHeight: 21,
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});

