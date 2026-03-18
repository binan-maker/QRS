import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/lib/use-network";
import { formatCompactNumber } from "@/lib/number-format";
import { smartName } from "@/lib/utils/formatters";
import { useQrDetail } from "@/hooks/useQrDetail";
import { styles } from "@/features/qr-detail/styles";
import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import ContentCard from "@/features/qr-detail/components/ContentCard";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import OwnerCard from "@/features/qr-detail/components/OwnerCard";
import MerchantDashboard from "@/features/qr-detail/components/MerchantDashboard";
import CommentItem from "@/features/qr-detail/components/CommentItem";
import SafetyWarningCard from "@/features/qr-detail/components/SafetyWarningCard";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import VerificationModal from "@/features/qr-detail/components/modals/VerificationModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";

export default function QrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { recheck } = useNetworkStatus();

  const glowOpacity = useSharedValue(0.6);
  const glowScale = useSharedValue(1);
  glowOpacity.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.6, { duration: 900 })), -1, true);
  glowScale.value = withRepeat(withSequence(withTiming(1.03, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
  const signInGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const q = useQrDetail(id);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const trust = q.getTrustInfo();
  const currentContent = q.qrCode?.content || q.offlineContent || "";
  const currentContentType = q.qrCode?.contentType || q.offlineContentType;

  if (q.loading) return <LoadingSkeleton topInset={topInset} />;

  if (q.loadError) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.navTitle}>QR Details</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.dark.danger} />
          <Text style={styles.errorTitle}>QR Code Not Found</Text>
          <Text style={styles.errorSub}>This QR code doesn't exist or couldn't be loaded.</Text>
          <Pressable onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <StatusBar style="light" backgroundColor={Colors.dark.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}>
        <View style={[styles.container, { paddingTop: topInset }]}>

          {/* Nav */}
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
            </Pressable>
            <Text style={styles.navTitle}>QR Details</Text>
            <View style={styles.navActions}>
              {!q.offlineMode && (
                <Pressable onPress={q.handleToggleFavorite} disabled={q.favoriteLoading} style={styles.navActionBtn}>
                  {q.favoriteLoading ? (
                    <ActivityIndicator size="small" color={Colors.dark.danger} />
                  ) : (
                    <Ionicons
                      name={q.isFavorite ? "heart" : "heart-outline"}
                      size={22}
                      color={q.isFavorite ? Colors.dark.danger : Colors.dark.textSecondary}
                    />
                  )}
                </Pressable>
              )}
              {!q.offlineMode && (
                <Pressable
                  onPress={q.handleToggleFollow}
                  onPressIn={() => q.isFollowing && q.setFollowPressedIn(true)}
                  onPressOut={() => q.setFollowPressedIn(false)}
                  disabled={q.followLoading}
                  style={[
                    styles.followBtn,
                    q.isFollowing && styles.followBtnActive,
                    q.followPressedIn && q.isFollowing && styles.followBtnUnfollowHint,
                  ]}
                >
                  {q.followLoading ? (
                    <ActivityIndicator size="small" color={Colors.dark.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          q.followPressedIn && q.isFollowing
                            ? "notifications-off-outline"
                            : q.isFollowing ? "notifications" : "notifications-outline"
                        }
                        size={15}
                        color={
                          q.followPressedIn && q.isFollowing
                            ? Colors.dark.danger
                            : q.isFollowing ? Colors.dark.primary : Colors.dark.textSecondary
                        }
                      />
                      <Text style={[
                        styles.followBtnText,
                        q.isFollowing && styles.followBtnTextActive,
                        q.followPressedIn && q.isFollowing && { color: Colors.dark.danger },
                      ]}>
                        {q.followPressedIn && q.isFollowing ? "Unfollow" : q.isFollowing ? "Following" : "Follow"}
                      </Text>
                      {q.followCount > 0 && !(q.followPressedIn && q.isFollowing) && (
                        <View style={styles.followCountPill}>
                          <Text style={styles.followCountPillText}>{formatCompactNumber(q.followCount)}</Text>
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            ref={q.scrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => q.setCommentMenuId(null)}
          >
            {/* Disclaimer */}
            <View style={styles.disclaimerBanner}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.dark.primary} />
              <Text style={styles.disclaimerText}>
                Always verify links before clicking. QR Guard protects you with real-time safety analysis.
              </Text>
            </View>

            {/* Offline banner */}
            {q.offlineMode && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.offlineBanner}>
                  <Ionicons name="wifi-outline" size={20} color={Colors.dark.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offlineBannerTitle}>You're offline</Text>
                    <Text style={styles.offlineBannerSub}>Showing cached content. Enable internet to view community data.</Text>
                  </View>
                  <Pressable onPress={recheck} style={styles.offlineRetrySmall}>
                    <Text style={styles.offlineRetrySmallText}>Retry</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {/* Sign-in banner */}
            {!user && !q.offlineMode && (
              <Animated.View style={signInGlowStyle}>
                <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBanner}>
                  <View style={styles.signInBannerIcon}>
                    <Ionicons name="person-circle-outline" size={28} color={Colors.dark.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signInBannerTitle}>Sign in to continue</Text>
                    <Text style={styles.signInBannerSub}>Report, follow, favorite & comment</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={Colors.dark.primary} />
                </Pressable>
              </Animated.View>
            )}

            {/* Owner Card */}
            {q.ownerInfo && !q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(400)}>
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

            {/* Merchant Dashboard */}
            {q.isQrOwner && !q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(450)}>
                <MerchantDashboard
                  scanVelocity={q.scanVelocity}
                  velocityLoading={q.velocityLoading}
                  verificationStatus={q.verificationStatus}
                  onRefreshVelocity={async () => {
                    const { getScanVelocity } = await import("@/lib/firestore-service");
                    getScanVelocity(id);
                  }}
                  onRequestVerify={() => q.setVerifyModalOpen(true)}
                />
              </Animated.View>
            )}

            {/* Content Card */}
            <Animated.View entering={FadeInDown.duration(400)}>
              <ContentCard
                content={currentContent}
                contentType={currentContentType}
                parsedPayment={q.parsedPayment}
                isDeactivated={q.ownerInfo?.isActive === false}
                onOpenContent={q.handleOpenContent}
              />
            </Animated.View>

            {/* Safety Warnings */}
            {currentContentType === "payment" && q.paymentSafety?.isSuspicious && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <SafetyWarningCard
                  riskLevel={q.paymentSafety.riskLevel as "caution" | "dangerous"}
                  warnings={q.paymentSafety.warnings}
                />
              </Animated.View>
            )}
            {currentContentType === "url" && q.urlSafety?.isSuspicious && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <SafetyWarningCard
                  riskLevel={q.urlSafety.riskLevel as "caution" | "dangerous"}
                  warnings={q.urlSafety.warnings}
                />
              </Animated.View>
            )}
            {q.offlineBlacklistMatch.matched && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <SafetyWarningCard
                  riskLevel="dangerous"
                  warnings={[`This content matches a known scam pattern: ${q.offlineBlacklistMatch.reason}`]}
                />
              </Animated.View>
            )}

            {q.offlineMode ? (
              <Animated.View entering={FadeIn.duration(400)}>
                <View style={styles.offlineFeatureCard}>
                  <Ionicons name="cloud-offline-outline" size={40} color={Colors.dark.textMuted} />
                  <Text style={styles.offlineFeatureTitle}>Community Data Unavailable</Text>
                  <Text style={styles.offlineFeatureSub}>
                    Enable internet to view trust score, community reports, and comments.
                  </Text>
                  <Pressable onPress={recheck} style={styles.enableInternetBtn}>
                    <Ionicons name="wifi" size={16} color="#000" />
                    <Text style={styles.enableInternetBtnText}>Retry Connection</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              <>
                {/* Trust Score */}
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                  <TrustScoreCard
                    trustInfo={trust}
                    reportCounts={q.reportCounts}
                    totalScans={q.totalScans}
                    totalComments={q.totalComments}
                    isQrOwner={q.isQrOwner}
                    followCount={q.followCount}
                    followersModalOpen={q.followersModalOpen}
                    onOpenFollowers={() => { q.handleLoadFollowers(); q.setFollowersModalOpen(true); }}
                  />
                </Animated.View>

                {/* Report Grid */}
                <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                  <ReportGrid
                    reportCounts={q.reportCounts}
                    userReport={q.userReport}
                    reportLoading={q.reportLoading}
                    isLoggedIn={!!user}
                    onReport={q.handleReport}
                  />
                </Animated.View>

                {/* Comments */}
                <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                  <View style={styles.commentsHeader}>
                    <View style={styles.commentsTitleRow}>
                      <Text style={styles.sectionTitle}>Comments</Text>
                      {q.totalComments > 0 && (
                        <View style={styles.commentCountBadge}>
                          <Text style={styles.commentCountText}>{formatCompactNumber(q.totalComments)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Live</Text>
                    </View>
                  </View>

                  {!user && (
                    <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInToComment}>
                      <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.primary} />
                      <Text style={styles.signInToCommentText}>Sign in to comment</Text>
                      <Ionicons name="arrow-forward" size={16} color={Colors.dark.primary} style={{ marginLeft: "auto" as any }} />
                    </Pressable>
                  )}

                  {q.commentsList.length === 0 ? (
                    <View style={styles.noComments}>
                      <Ionicons name="chatbubbles-outline" size={32} color={Colors.dark.textMuted} />
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
                        <ActivityIndicator size="small" color={Colors.dark.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>Load More Comments</Text>
                      )}
                    </Pressable>
                  )}
                </Animated.View>
              </>
            )}
          </ScrollView>

          {/* Comment Input Bar */}
          {user && !q.offlineMode && (
            <View style={[styles.bottomCommentBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              {q.replyTo && (
                <View style={styles.replyBanner}>
                  <Ionicons name="return-down-forward-outline" size={14} color={Colors.dark.primary} />
                  <Text style={styles.replyBannerText} numberOfLines={1}>
                    Replying to <Text style={{ color: Colors.dark.text }}>{q.replyTo.author}</Text>
                  </Text>
                  <Pressable onPress={() => q.setReplyTo(null)} style={{ marginLeft: "auto" as any }}>
                    <Ionicons name="close" size={16} color={Colors.dark.textMuted} />
                  </Pressable>
                </View>
              )}
              <View style={styles.commentInput}>
                <TextInput
                  ref={q.commentInputRef}
                  style={styles.commentTextInput}
                  placeholder={q.replyTo ? `Reply to ${q.replyTo.author}...` : "Add a comment..."}
                  placeholderTextColor={Colors.dark.textMuted}
                  value={q.newComment}
                  onChangeText={q.setNewComment}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  onPress={q.handleSubmitComment}
                  disabled={q.submitting || !q.newComment.trim()}
                  style={({ pressed }) => [styles.sendBtn, { opacity: pressed || q.submitting || !q.newComment.trim() ? 0.5 : 1 }]}
                >
                  {q.submitting ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="send" size={18} color="#000" />}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

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
        onMarkRead={(msgId) => q.markQrMessageRead(msgId)}
        onClose={() => q.setMessagesModalOpen(false)}
      />
      <VerificationModal
        visible={q.verifyModalOpen}
        bizName={q.verifyBizName}
        docName={q.verifyDocName}
        submitting={q.verifySubmitting}
        onChangeBizName={q.setVerifyBizName}
        onPickDoc={q.handlePickVerifyDoc}
        onSubmit={q.handleVerifySubmit}
        onClose={() => q.setVerifyModalOpen(false)}
      />
    </View>
  );
}
