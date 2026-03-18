import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
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
import { formatCompactNumber, formatIndianNumber } from "@/lib/number-format";
import { smartName } from "@/lib/utils/formatters";
import { useQrDetail } from "@/hooks/useQrDetail";
import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import ContentCard from "@/features/qr-detail/components/ContentCard";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import OwnerCard from "@/features/qr-detail/components/OwnerCard";
import MerchantDashboard from "@/features/qr-detail/components/MerchantDashboard";
import CommentItem from "@/features/qr-detail/components/CommentItem";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import VerificationModal from "@/features/qr-detail/components/modals/VerificationModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";

const REPORT_TYPES = [
  { key: "safe", label: "Safe", icon: "shield-checkmark", color: Colors.dark.safe, bg: Colors.dark.safeDim },
  { key: "scam", label: "Scam", icon: "warning", color: Colors.dark.danger, bg: Colors.dark.dangerDim },
  { key: "fake", label: "Fake", icon: "close-circle", color: Colors.dark.warning, bg: Colors.dark.warningDim },
  { key: "spam", label: "Spam", icon: "mail-unread", color: Colors.dark.accent, bg: Colors.dark.accentDim },
];

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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

            {/* Payment safety warnings */}
            {currentContentType === "payment" && q.paymentSafety?.isSuspicious && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={[styles.safetyWarningCard, {
                  borderColor: q.paymentSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                  backgroundColor: q.paymentSafety.riskLevel === "dangerous" ? Colors.dark.dangerDim : Colors.dark.warningDim,
                }]}>
                  <View style={styles.safetyWarningHeader}>
                    <Ionicons
                      name={q.paymentSafety.riskLevel === "dangerous" ? "warning" : "alert-circle"}
                      size={22}
                      color={q.paymentSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning}
                    />
                    <Text style={[styles.safetyWarningTitle, {
                      color: q.paymentSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                    }]}>
                      {q.paymentSafety.riskLevel === "dangerous" ? "⚠ Payment Risk Detected" : "⚠ Payment Caution"}
                    </Text>
                  </View>
                  {q.paymentSafety.warnings.map((w, i) => (
                    <View key={i} style={styles.safetyWarningRow}>
                      <Ionicons name="ellipse" size={6} color={q.paymentSafety!.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning} style={{ marginTop: 5 }} />
                      <Text style={styles.safetyWarningText}>{w}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* URL safety warnings */}
            {currentContentType === "url" && q.urlSafety?.isSuspicious && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={[styles.safetyWarningCard, {
                  borderColor: q.urlSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                  backgroundColor: q.urlSafety.riskLevel === "dangerous" ? Colors.dark.dangerDim : Colors.dark.warningDim,
                }]}>
                  <View style={styles.safetyWarningHeader}>
                    <Ionicons
                      name={q.urlSafety.riskLevel === "dangerous" ? "warning" : "alert-circle"}
                      size={22}
                      color={q.urlSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning}
                    />
                    <Text style={[styles.safetyWarningTitle, {
                      color: q.urlSafety.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning,
                    }]}>
                      {q.urlSafety.riskLevel === "dangerous" ? "⚠ Suspicious URL Detected" : "⚠ URL Caution"}
                    </Text>
                  </View>
                  {q.urlSafety.warnings.map((w, i) => (
                    <View key={i} style={styles.safetyWarningRow}>
                      <Ionicons name="ellipse" size={6} color={q.urlSafety!.riskLevel === "dangerous" ? Colors.dark.danger : Colors.dark.warning} style={{ marginTop: 5 }} />
                      <Text style={styles.safetyWarningText}>{w}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Offline blacklist match */}
            {q.offlineBlacklistMatch.matched && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={[styles.safetyWarningCard, { borderColor: Colors.dark.danger, backgroundColor: Colors.dark.dangerDim }]}>
                  <View style={styles.safetyWarningHeader}>
                    <Ionicons name="shield-outline" size={22} color={Colors.dark.danger} />
                    <Text style={[styles.safetyWarningTitle, { color: Colors.dark.danger }]}>⚠ Known Scam Pattern</Text>
                  </View>
                  <View style={styles.safetyWarningRow}>
                    <Ionicons name="ellipse" size={6} color={Colors.dark.danger} style={{ marginTop: 5 }} />
                    <Text style={styles.safetyWarningText}>
                      This content matches a known scam pattern: {q.offlineBlacklistMatch.reason}
                    </Text>
                  </View>
                </View>
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
                  <Text style={styles.sectionTitle}>Report This QR</Text>
                  <Text style={styles.sectionSubtext}>
                    {user ? "Tap to submit your report" : "Sign in to report this QR code"}
                  </Text>
                  <View style={styles.reportGrid}>
                    {REPORT_TYPES.map((rt) => {
                      const count = q.reportCounts[rt.key] || 0;
                      const isSelected = q.userReport === rt.key;
                      return (
                        <Pressable
                          key={rt.key}
                          onPress={() => q.handleReport(rt.key)}
                          disabled={!!q.reportLoading}
                          style={({ pressed }) => [
                            styles.reportCard,
                            {
                              borderColor: isSelected ? rt.color : Colors.dark.surfaceBorder,
                              backgroundColor: isSelected ? rt.bg : Colors.dark.surface,
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          {q.reportLoading === rt.key ? (
                            <ActivityIndicator size="small" color={rt.color} />
                          ) : (
                            <Ionicons name={rt.icon as any} size={24} color={rt.color} />
                          )}
                          <Text style={[styles.reportLabel, { color: rt.color }]}>{rt.label}</Text>
                          <Text style={styles.reportCount}>{formatCompactNumber(count)}</Text>
                          {isSelected && <View style={[styles.selectedDot, { backgroundColor: rt.color }]} />}
                        </Pressable>
                      );
                    })}
                  </View>
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
                        <Text style={styles.loadMoreText}>Load more comments</Text>
                      )}
                    </Pressable>
                  )}
                </Animated.View>
              </>
            )}

            <View style={{ height: user ? 100 : 32 }} />
          </ScrollView>

          {/* Comment input bar */}
          {user && !q.offlineMode && (
            <View style={[styles.bottomCommentBar, { paddingBottom: insets.bottom || 12 }]}>
              {q.replyTo && (
                <View style={styles.replyBanner}>
                  <Ionicons name="return-down-forward" size={14} color={Colors.dark.primary} />
                  <Text style={styles.replyBannerText} numberOfLines={1}>
                    Replying to{" "}
                    <Text style={{ color: Colors.dark.primary, fontFamily: "Inter_600SemiBold" }}>{q.replyTo.author}</Text>
                  </Text>
                  <Pressable onPress={() => { q.setReplyTo(null); q.setNewComment(""); }} style={{ marginLeft: "auto" as any }}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  navBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  navTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  navActionBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  followBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  followBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  followBtnUnfollowHint: { backgroundColor: Colors.dark.dangerDim, borderColor: Colors.dark.danger },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  followBtnTextActive: { color: Colors.dark.primary },
  followCountPill: {
    backgroundColor: Colors.dark.primary, borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  followCountPillText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#000" },
  scrollContent: { padding: 16, paddingBottom: 32 },
  disclaimerBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 17 },
  offlineBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.warningDim, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.dark.warning + "40",
  },
  offlineBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.warning },
  offlineBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },
  offlineRetrySmall: {
    backgroundColor: Colors.dark.warning, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  offlineRetrySmallText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#000" },
  signInBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  signInBannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.primary + "20", alignItems: "center", justifyContent: "center",
  },
  signInBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  signInBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },
  safetyWarningCard: {
    borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, gap: 8,
  },
  safetyWarningHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  safetyWarningTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  safetyWarningRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  safetyWarningText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.text, lineHeight: 18 },
  offlineFeatureCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 24,
    alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 16,
  },
  offlineFeatureTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  offlineFeatureSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, textAlign: "center", lineHeight: 19 },
  enableInternetBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4,
  },
  enableInternetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#000" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 4 },
  sectionSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 12 },
  reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  reportCard: {
    width: "47%", borderRadius: 14, padding: 14, alignItems: "center", gap: 6,
    borderWidth: 1.5, position: "relative",
  },
  reportLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reportCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  selectedDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  commentsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
  },
  commentsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentCountBadge: {
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  commentCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.dark.safe },
  liveText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.safe },
  signInToComment: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.dark.surface, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  signInToCommentText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.text, flex: 1 },
  noComments: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 28, alignItems: "center",
    gap: 8, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 12,
  },
  noCommentsText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  noCommentsSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  loadMoreBtn: {
    backgroundColor: Colors.dark.surface, borderRadius: 12, padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginTop: 8, marginBottom: 12,
  },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.primary },
  bottomCommentBar: {
    backgroundColor: Colors.dark.surface, borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
    paddingTop: 8, paddingHorizontal: 12,
  },
  replyBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 8, padding: 8, marginBottom: 6,
  },
  replyBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary },
  commentInput: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingBottom: 4 },
  commentTextInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center",
  },
  errorCard: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  errorTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  errorSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, textAlign: "center" },
  retryBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
});
