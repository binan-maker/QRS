import { useState, useCallback, useRef } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  StyleSheet, Share, KeyboardAvoidingView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTopInset } from "@/lib/utils/platform";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useNetworkStatus } from "@/lib/utils/use-network";
import { getGuardLink, getStandardLink, type GuardLink } from "@/lib/services/guard-service";
import { detectContentType } from "@/lib/services/qr-content-type";
import { makeStyles, offlineSectionStyles, guestModeBannerStyles } from "@/features/qr-detail/styles";

import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import ContentCard from "@/features/qr-detail/components/ContentCard";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import OwnerCard from "@/features/qr-detail/components/OwnerCard";
import SafetyWarningCard from "@/features/qr-detail/components/SafetyWarningCard";
import EvidenceCard from "@/features/qr-detail/components/EvidenceCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";
import { SectionHeader } from "@/features/qr-detail/components/SectionHeader";
import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import { VerdictBanner } from "@/features/qr-detail/components/VerdictBanner";
import { LivingShieldBanner } from "@/features/qr-detail/components/banners/LivingShieldBanner";
import { StandardQrBanner } from "@/features/qr-detail/components/banners/StandardQrBanner";
import { formatCompactNumber } from "@/lib/number-format";

import QrDetailNavBar from "@/features/qr-detail/components/QrDetailNavBar";
import OwnerCircleRow from "@/features/qr-detail/components/OwnerCircleRow";
import AdvisoryDisclaimer from "@/features/qr-detail/components/AdvisoryDisclaimer";
import ExternalQrBanner from "@/features/qr-detail/components/ExternalQrBanner";
import CommentsSection from "@/features/qr-detail/components/CommentsSection";
import DonationBanner from "@/features/qr-detail/components/DonationBanner";
import OwnerInfoSheet from "@/features/qr-detail/components/sheets/OwnerInfoSheet";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

export default function QrDetailScreen() {
  const { id, guardUuid, standardUuid, ownerDocId } = useLocalSearchParams<{
    id: string; guardUuid?: string; standardUuid?: string; ownerDocId?: string;
  }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const topInset = useTopInset();

  const [guardLink, setGuardLink] = useState<GuardLink | null>(null);
  const [guardLinkLoading, setGuardLinkLoading] = useState(!!guardUuid);
  const [standardLinkData, setStandardLinkData] = useState<{ rawContent: string; contentType: string; ownerName: string; isActive: boolean } | null>(null);
  const [standardLinkLoading, setStandardLinkLoading] = useState(!!standardUuid);
  const [ownerSheetOpen, setOwnerSheetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [toastState, setToastState] = useState<{ message: string; icon: keyof typeof Ionicons.glyphMap; key: number }>({ message: "", icon: "checkmark-circle", key: 0 });
  const lastToastTime = useRef(0);

  const showToast = useCallback((message: string, icon: keyof typeof Ionicons.glyphMap = "checkmark-circle") => {
    const now = Date.now();
    if (now - lastToastTime.current < 2200) return;
    lastToastTime.current = now;
    setToastState(prev => ({ message, icon, key: prev.key + 1 }));
  }, []);

  useEffect(() => {
    if (!guardUuid) return;
    setGuardLinkLoading(true);
    getGuardLink(guardUuid).then(setGuardLink).catch(() => setGuardLink(null)).finally(() => setGuardLinkLoading(false));
  }, [guardUuid]);

  useEffect(() => {
    if (!standardUuid) return;
    setStandardLinkLoading(true);
    getStandardLink(standardUuid).then(setStandardLinkData).catch(() => setStandardLinkData(null)).finally(() => setStandardLinkLoading(false));
  }, [standardUuid]);

  const q = useQrDetail(id);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);

  const isGuardQr = !!guardUuid;
  const isStandardQr = !!standardUuid;
  const guardReady = isGuardQr && !guardLinkLoading && !!guardLink?.currentDestination;
  const standardReady = isStandardQr && !standardLinkLoading && !!standardLinkData?.rawContent;

  const effectiveContent = guardReady ? guardLink!.currentDestination
    : standardReady ? standardLinkData!.rawContent
    : (isGuardQr || isStandardQr) ? ""
    : (q.qrCode?.content || q.offlineContent || "");

  const effectiveContentType = guardReady ? detectContentType(guardLink!.currentDestination)
    : standardReady ? detectContentType(standardLinkData!.rawContent)
    : (isGuardQr || isStandardQr) ? "url"
    : (q.qrCode?.contentType || q.offlineContentType || detectContentType(q.qrCode?.content || q.offlineContent || ""));

  const hasOwner = !!q.ownerInfo?.ownerId;
  const trust = q.getTrustInfo();
  const verdict = q.getCombinedVerdict();
  const isQrOwner = !!(user?.id && q.ownerInfo?.ownerId && user.id === q.ownerInfo.ownerId);

  const handleCreatorFollowPress = useCallback(() => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!isOnline) { setOfflineToastKey((k) => k + 1); return; }
    const willFollow = !q.isFollowingCreator;
    q.handleToggleFollowCreator();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const label = q.ownerInfo?.businessName || q.ownerInfo?.ownerName || "Creator";
    showToast(willFollow ? `Following ${label}` : `Unfollowed ${label}`, willFollow ? "person-add" : "person-remove-outline");
  }, [user, isOnline, q.isFollowingCreator, q.handleToggleFollowCreator, q.ownerInfo, showToast]);

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

  const handleSharePress = useCallback(async () => {
    const label = q.ownerInfo?.businessName || q.ownerInfo?.ownerName || "QR Code";
    const content = effectiveContent || (q.qrCode?.content || q.offlineContent || "");
    try {
      await Share.share({
        message: `Check out this QR code${label !== "QR Code" ? ` from ${label}` : ""}: ${content}`,
        title: label,
      });
    } catch { showToast("Could not share", "alert-circle-outline"); }
  }, [q.ownerInfo, effectiveContent, q.qrCode, q.offlineContent, showToast]);

  if (q.loading) return <LoadingSkeleton topInset={topInset} />;

  if (q.loadError && !isGuardQr && !isStandardQr) {
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
      <StatusBar style={colors.isDark ? "light" : "dark"} backgroundColor={colors.background} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.container, { paddingTop: topInset }]}>

          <QrDetailNavBar
            offlineMode={q.offlineMode}
            ownerName={q.ownerInfo?.businessName || q.ownerInfo?.ownerName || null}
            hasOwner={hasOwner}
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
            onOpenCreatorFollowers={() => { q.handleLoadCreatorFollowers(); q.setCreatorFollowersModalOpen(true); }}
            onWatch={handleWatchPress}
            onManage={() => ownerDocId ? router.push(`/my-qr/${ownerDocId}` as any) : router.push("/(tabs)/profile")}
            onAnalytics={() => ownerDocId ? router.push(`/my-qr-analytics/${ownerDocId}` as any) : undefined}
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
              <RefreshControl refreshing={q.commentsRefreshing ?? false} onRefresh={q.refreshComments} tintColor={colors.primary} colors={[colors.primary]} />
            }
          >
            {/* Deactivated banner */}
            {q.ownerInfo?.isActive === false && (
              <Animated.View entering={FadeIn.duration(150)}>
                <View style={styles.deactivatedBanner}>
                  <LinearGradient colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.08)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
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

            <Animated.View entering={FadeInDown.duration(250)}>
              <VerdictBanner verdict={verdict} offlineMode={q.offlineMode} />
            </Animated.View>

            {q.ownerInfo?.isBranded && (
              <OwnerCircleRow ownerInfo={q.ownerInfo as any} onPress={() => setOwnerSheetOpen(true)} />
            )}

            <Animated.View entering={FadeInDown.duration(250)}>
              <AdvisoryDisclaimer />
            </Animated.View>

            {isGuardQr && <LivingShieldBanner guardLink={guardLink} loading={guardLinkLoading} />}

            {isStandardQr && (
              <StandardQrBanner
                loading={standardLinkLoading}
                ready={standardReady}
                ownerName={standardLinkData?.ownerName ?? null}
                isActive={standardLinkData?.isActive !== false}
                qrId={standardUuid}
              />
            )}

            {((!isGuardQr && !isStandardQr) || guardReady || standardReady) && (
              <Animated.View entering={FadeInDown.duration(150)}>
                <ContentCard
                  content={effectiveContent}
                  contentType={effectiveContentType}
                  parsedPayment={q.parsedPayment}
                  isDeactivated={q.ownerInfo?.isActive === false || standardLinkData?.isActive === false}
                  onOpenContent={q.handleOpenContent}
                  hideOpenAction={!user || isGuardQr}
                />
              </Animated.View>
            )}

            {effectiveContentType === "payment" && q.paymentSafety?.isSuspicious && (() => {
              const warnings = (q.paymentSafety?.warnings ?? []).filter((w) => !w.toLowerCase().startsWith("pre-filled amount"));
              if (!warnings.length) return null;
              return (
                <Animated.View entering={FadeInDown.duration(150)}>
                  <SafetyWarningCard riskLevel={q.paymentSafety!.riskLevel as "caution" | "dangerous"} warnings={warnings} title={q.paymentSafety!.riskLevel === "dangerous" ? "Payment Security Warning" : "Payment Security Notice"} />
                </Animated.View>
              );
            })()}

            {effectiveContentType === "payment" && q.paymentSafety?.evidence && q.paymentSafety.evidence.length > 0 && (
              <Animated.View entering={FadeInDown.duration(150)}>
                <EvidenceCard title="Payment Analysis" evidence={q.paymentSafety.evidence} />
              </Animated.View>
            )}

            {!q.ownerInfo?.isBranded && !q.offlineMode && !hasOwner && (
              <Animated.View entering={FadeInDown.duration(150)}>
                <ExternalQrBanner />
              </Animated.View>
            )}

            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(180)}>
                <TrustScoreCard
                  trustInfo={trust}
                  reportCounts={q.reportCounts}
                  totalScans={q.totalScans}
                  isQrOwner={user ? q.isQrOwner : false}
                  followCount={q.followCount}
                  followersModalOpen={user ? q.followersModalOpen : false}
                  onOpenFollowers={user ? () => { q.handleLoadFollowers(); q.setFollowersModalOpen(true); } : () => {}}
                  manipulationWarning={trust.manipulationWarning}
                  scanCountFrozen={q.qrCode?.scanCountFrozen}
                  ownerScanCount={user && q.isQrOwner ? q.qrCode?.ownerScanCount : undefined}
                />
              </Animated.View>
            )}

            {user && (
              <>
                <Animated.View entering={FadeInDown.duration(180)}>
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
                      isPayment={effectiveContentType === "payment"}
                      onReport={(type) => {
                        q.handleReport(type);
                        const labels: Record<string, string> = { safe: "Safe", scam: "Scam", fake: "Fake", spam: "Spam" };
                        const icons: Record<string, keyof typeof Ionicons.glyphMap> = { safe: "shield-checkmark", scam: "warning", fake: "close-circle", spam: "mail-unread" };
                        showToast(`Voted ${labels[type] ?? type}`, icons[type] ?? "flag");
                      }}
                    />
                  )}
                </Animated.View>

                {((effectiveContentType === "url" && q.urlSafety?.isSuspicious) || q.offlineBlacklistMatch.matched) && (
                  <Animated.View entering={FadeInDown.duration(150)}>
                    {effectiveContentType === "url" && q.urlSafety?.isSuspicious && (
                      <SafetyWarningCard riskLevel={q.urlSafety.riskLevel as "caution" | "dangerous"} warnings={q.urlSafety.warnings} title={q.urlSafety.riskLevel === "dangerous" ? "Dangerous URL Detected" : "Proceed with Caution"} />
                    )}
                    {q.offlineBlacklistMatch.matched && (
                      <SafetyWarningCard riskLevel="dangerous" warnings={[`Known scam pattern: ${q.offlineBlacklistMatch.reason}`]} title="Known Scam Pattern" />
                    )}
                  </Animated.View>
                )}

                {effectiveContentType === "url" && q.urlSafety?.evidence && q.urlSafety.evidence.length > 0 && (
                  <Animated.View entering={FadeInDown.duration(150)}>
                    <EvidenceCard title="URL Analysis" evidence={q.urlSafety.evidence} />
                  </Animated.View>
                )}
              </>
            )}

            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(180)}>
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

            {user && q.ownerInfo && (
              <Animated.View entering={FadeInDown.duration(180)}>
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

            <Animated.View entering={FadeInDown.duration(180)}>
              <DonationBanner />
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <OwnerInfoSheet visible={ownerSheetOpen} onClose={() => setOwnerSheetOpen(false)} ownerInfo={q.ownerInfo as any} guardLink={guardLink} />

      <CommentMenuSheet
        visible={q.commentMenuId !== null}
        isOwner={q.commentMenuOwner}
        onClose={() => q.setCommentMenuId(null)}
        onDelete={() => { const id = q.commentMenuId!; q.setCommentMenuId(null); q.handleDeleteComment(id); }}
        onReport={() => { const id = q.commentMenuId!; q.setCommentMenuId(null); q.setCommentReportModal(id); }}
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
        onShare={handleSharePress}
      />

      <CommentReportModal commentId={q.commentReportModal} onReport={q.handleCommentReport} onClose={() => q.setCommentReportModal(null)} />
      <FollowersModal visible={q.followersModalOpen} followCount={q.followCount} followers={q.followersList} loading={q.followersLoading} onClose={() => q.setFollowersModalOpen(false)} title="QR Watchers" subtitle={`${formatCompactNumber(q.followCount)} ${q.followCount === 1 ? "person is" : "people are"} watching this QR`} emptyIcon="notifications-outline" emptyText="No watchers yet" />
      <FollowersModal visible={q.creatorFollowersModalOpen} followCount={q.creatorFollowerCount} followers={q.creatorFollowersList} loading={q.creatorFollowersLoading} onClose={() => q.setCreatorFollowersModalOpen(false)} title="Creator Followers" subtitle={`${formatCompactNumber(q.creatorFollowerCount)} ${q.creatorFollowerCount === 1 ? "person follows" : "people follow"} this creator`} emptyIcon="people-outline" emptyText="No followers yet" />
      <MessagesModal visible={q.messagesModalOpen} isQrOwner={q.isQrOwner} ownerInfo={q.ownerInfo} messages={q.messages} messageText={q.messageText} sendingMessage={q.sendingMessage} user={user} onChangeText={q.setMessageText} onSend={q.handleSendMessage} onMarkRead={() => {}} onClose={() => q.setMessagesModalOpen(false)} />
    </View>
  );
}
