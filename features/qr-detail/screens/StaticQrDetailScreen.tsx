import { useState, useCallback, useRef } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTopInset } from "@/shared/utils/platform";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useNetworkStatus } from "@/shared/utils/use-network";
import { makeStyles } from "@/features/qr-detail/styles";

import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import QrDetailNavBar from "@/features/qr-detail/components/QrDetailNavBar";
import DonationBanner from "@/features/qr-detail/components/DonationBanner";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  QrHeaderBanners,
  QrVerdictSection,
  QrContentSection,
  QrTrustSection,
  QrReportSection,
  QrCommentSection,
  QrOwnerSection,
  QrBottomSheets,
} from "@/features/qr-detail/sections";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

interface Props {
  id: string;
  ownerDocId?: string;
}

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

  const hasOwner = !!q.ownerInfo?.ownerId;
  const trust = q.getTrustInfo();
  const verdict = q.getCombinedVerdict();
  const isQrOwner = !!(user?.id && q.ownerInfo?.ownerId && user.id === q.ownerInfo.ownerId);

  const content = q.qrCode?.content || q.offlineContent || "";
  const contentType = q.qrCode?.contentType || q.offlineContentType || "text";
  const isDeactivated = q.ownerInfo?.isActive === false || q.qrCode?.isActive === false;
  const deactivationMsg = q.ownerInfo?.deactivationMessage || q.qrCode?.deactivationMessage || null;

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
            <QrHeaderBanners
              offlineMode={q.offlineMode}
              hasOwner={hasOwner}
              isDeactivated={isDeactivated}
              deactivationMsg={deactivationMsg}
              isDark={isDark}
              colors={colors}
            />

            <QrVerdictSection
              verdict={verdict}
              offlineMode={q.offlineMode}
              ownerInfo={q.ownerInfo}
              onOpenOwnerSheet={() => setOwnerSheetOpen(true)}
            />

            <QrContentSection
              content={content}
              contentType={contentType}
              parsedPayment={q.parsedPayment}
              isDeactivated={isDeactivated}
              onOpenContent={q.handleOpenContent}
              templateKey={(q.qrCode as any)?.templateKey}
              paymentSafety={q.paymentSafety}
              isBranded={q.ownerInfo?.isBranded}
              offlineMode={q.offlineMode}
              hasOwner={hasOwner}
              user={user}
            />

            <QrTrustSection
              offlineMode={q.offlineMode}
              trust={trust}
              reportCounts={q.reportCounts}
              totalScans={q.totalScans}
              isQrOwner={isQrOwner}
              followCount={q.followCount}
              followersModalOpen={q.followersModalOpen}
              onOpenFollowers={() => {
                q.handleLoadFollowers();
                q.setFollowersModalOpen(true);
              }}
              manipulationWarning={trust.manipulationWarning}
              scanCountFrozen={q.qrCode?.scanCountFrozen}
              ownerScanCount={q.qrCode?.ownerScanCount}
              user={user}
            />

            <QrReportSection
              user={user}
              offlineMode={q.offlineMode}
              reportCounts={q.reportCounts}
              userReport={q.userReport}
              isPayment={contentType === "payment"}
              handleReport={q.handleReport}
              showToast={showToast}
              onLayout={(e: any) => { reportSectionY.current = e.nativeEvent.layout.y; }}
              colors={colors}
              urlSafety={contentType === "url" ? q.urlSafety : undefined}
              offlineBlacklistMatch={q.offlineBlacklistMatch}
              showUrlSafety={contentType === "url"}
            />

            <QrCommentSection user={user} offlineMode={q.offlineMode} q={q} />

            <QrOwnerSection
              user={user}
              ownerInfo={q.ownerInfo}
              isQrOwner={isQrOwner}
              followCount={q.followCount}
              unreadMessages={q.unreadMessages}
              colors={colors}
              onOpenFollowers={() => {
                q.handleLoadFollowers();
                q.setFollowersModalOpen(true);
              }}
              onOpenMessages={() => q.setMessagesModalOpen(true)}
            />

            <Animated.View entering={FadeInDown.delay(120).duration(260)}>
              <DonationBanner />
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <QrBottomSheets
        ownerSheetOpen={ownerSheetOpen}
        onCloseOwnerSheet={() => setOwnerSheetOpen(false)}
        ownerInfo={q.ownerInfo}
        guardLink={null}
        q={q}
        overflowOpen={overflowOpen}
        onCloseOverflow={() => setOverflowOpen(false)}
        isFavorite={q.isFavorite}
        isFollowing={q.isFollowing}
        followLoading={q.followLoading}
        hasOwner={hasOwner}
        onFavorite={handleFavoritePress}
        onWatch={handleWatchPress}
        onReportPress={handleReportPress}
        user={user}
        isQrOwner={isQrOwner}
        creatorFollowers={{
          visible: q.creatorFollowersModalOpen,
          followerCount: q.creatorFollowerCount,
          followersList: q.creatorFollowersList,
          loading: q.creatorFollowersLoading,
          onClose: () => q.setCreatorFollowersModalOpen(false),
        }}
      />
    </View>
  );
}
