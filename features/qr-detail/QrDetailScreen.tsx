import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Share,
  type LayoutChangeEvent,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTopInset } from "@/shared/utils/platform";
import { useAndroidNavBarScreen } from "@/shared/hooks/useAndroidNavBar";
import { useNavHide } from "@/shared/hooks/useNavHide";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { makeStyles, offlineSectionStyles } from "@/features/qr-detail/styles";
import { REPORT_LABELS, REPORT_ICONS } from "@/features/qr-detail/utils/report-toast";
import { normalizeQrDetailContentType } from "@/features/qr-detail/content-types";
import { getQrShareUrl } from "@/shared/utils/qr-share";

import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import { QrContentCard } from "@/features/qr-detail/components/QrContentCard";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import EarlyCommunityCard from "@/features/qr-detail/components/EarlyCommunityCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import QrDetailNavBar from "@/features/qr-detail/components/QrDetailNavBar";
import CommentsSection from "@/features/qr-detail/components/CommentsSection";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

export interface QrDetailScreenProps {
  id?: string;
  hint?: { content: string; contentType: string };
}

export default function QrDetailScreen(props?: QrDetailScreenProps) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  useAndroidNavBarScreen(colors.background, isDark);
  const topInset = useTopInset();

  const params = useLocalSearchParams<{
    id?: string;
    hintContent?: string;
    hintContentType?: string;
  }>();

  const id = props?.id || params.id || "";
  const hint =
    props?.hint ||
    (params.hintContent
      ? {
          content: params.hintContent,
          contentType: normalizeQrDetailContentType(params.hintContentType),
        }
      : undefined);

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

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const q = useQrDetail(id, hint);

  useEffect(() => {
    if (q.reportError) showToast(q.reportError, "alert-circle-outline");
  }, [q.reportError, showToast]);

  const trust = q.trustInfo;
  const content = q.qrCode?.content || q.offlineContent || "";
  const contentType = normalizeQrDetailContentType(q.qrCode?.contentType || q.offlineContentType);
  const isPayment = (q.qrCode?.contentType || q.offlineContentType)?.toLowerCase() === "payment";
  const hasContent = content.length > 0;

  const handleReportPress = useCallback(() => {
    setOverflowOpen(false);
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    setTimeout(() => {
      q.scrollRef.current?.scrollTo({ y: reportSectionY.current, animated: true });
    }, 280);
  }, [user, q.scrollRef]);

  const handleShare = useCallback(async () => {
    const shareUrl = getQrShareUrl(id);
    if (!shareUrl) {
      showToast("This QR cannot be shared yet", "alert-circle-outline");
      return;
    }

    try {
      await Share.share({
        title: "Share QR Details",
        message: `View this QR code's safety details: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      showToast("Unable to open sharing", "alert-circle-outline");
    }
  }, [id, showToast]);

  if (q.loading || (!hasContent && !q.loadError)) {
    return <LoadingSkeleton topInset={topInset} />;
  }

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
            onLayout={(e: LayoutChangeEvent) => {
              const h = e.nativeEvent.layout.height;
              setNavBarH(h);
              setNavHeight(h);
            }}
          >
            <View style={{ paddingTop: topInset }}>
              <QrDetailNavBar
                offlineMode={q.offlineMode}
                onBack={safeBack}
                onShare={handleShare}
                onOverflowOpen={() => setOverflowOpen(true)}
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
                onRefresh={() => {
                  q.refreshComments();
                  q.refreshQrData();
                }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* Early community card when no rating exists yet */}
            {q.initialDataReady && !q.offlineMode && trust.score < 0 && (
              <EarlyCommunityCard isLoggedIn={!!user} onRatePress={handleReportPress} />
            )}

            {/* Content card */}
            <View>
              <QrContentCard
                content={content}
                contentType={contentType}
                onOpenContent={q.handleOpenContent}
                hideOpenAction={false}
              />
            </View>

            {/* Trust score & community metrics */}
            {q.initialDataReady && !q.offlineMode && (
              <View>
                <TrustScoreCard
                  trustInfo={trust}
                  reportCounts={q.reportCounts}
                  totalScans={q.totalScans}
                />
              </View>
            )}

            {/* Community report / voting section */}
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
                    isPayment={isPayment}
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

            {/* Community comments */}
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
        onShare={handleShare}
        onReport={() => showToast("Feature Coming Soon!", "time-outline")}
      />
    </View>
  );
}
