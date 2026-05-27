import { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  StyleSheet, KeyboardAvoidingView, ActivityIndicator,
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
import { useQrSafety } from "@/features/qr-detail/hooks/useQrSafety";
import { useNetworkStatus } from "@/shared/utils/use-network";
import { getStandardLink } from "@/services/guard-service";
import { detectContentType } from "@/services/qr-content-type";
import { makeStyles } from "@/features/qr-detail/styles";
import { smartOpenContent } from "@/shared/utils/smart-open";

import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import DonationBanner from "@/features/qr-detail/components/DonationBanner";

import {
  QrVerdictSection,
  QrContentSection,
  QrTrustSection,
  QrReportSection,
  QrCommentSection,
  QrBottomSheets,
} from "@/features/qr-detail/sections";

const ACCENT = "#3b82f6";

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
}

export default function StandardQrDetailScreen({ id, standardUuid, ownerDocId }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
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

  useEffect(() => {
    setStandardLoading(true);
    getStandardLink(standardUuid)
      .then(setStandardData)
      .catch(() => setStandardData(null))
      .finally(() => setStandardLoading(false));
  }, [standardUuid]);

  const q = useQrDetail(id);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);

  const effectiveContent = standardData?.rawContent ?? "";
  const effectiveContentType = standardData
    ? (standardData.contentType || detectContentType(standardData.rawContent))
    : "text";

  const contentSafety = useQrSafety(effectiveContent || null, effectiveContentType || null);

  const isDeactivated = standardData?.isActive === false;
  const isQrOwner = !!(user?.id && standardData?.ownerId && user.id === standardData.ownerId);
  const trust = q.getTrustInfo();
  const baseVerdict = q.getCombinedVerdict();
  const verdict = isQrOwner
    ? { level: "safe" as const, label: "YOUR QR", reason: "You created this QR code", color: colors.safe }
    : baseVerdict;

  const ownerInfoForSheet = standardData
    ? {
        businessName: null,
        ownerName: standardData.ownerName,
        qrType: "individual",
        isBranded: true,
        ownerId: standardData.ownerId,
        brandedUuid: standardUuid,
        isActive: standardData.isActive,
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

          {/* Standard NavBar */}
          <Animated.View entering={FadeInDown.delay(0).duration(260)} style={[styles.navBar, { gap: 10 }]}>
            <Animated.View entering={FadeIn.delay(30).duration(240)}>
              <Pressable onPress={safeBack} style={styles.navBackBtn}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
            </Animated.View>
            <View style={stdStyles.navTitleRow}>
              <Text style={[stdStyles.navTitle, { color: colors.text }]} numberOfLines={1}>
                QR Guard
              </Text>
            </View>
            <Animated.View entering={FadeIn.delay(40).duration(240)}>
              <Pressable onPress={() => setOverflowOpen(true)} style={styles.navBackBtn}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
              </Pressable>
            </Animated.View>
          </Animated.View>

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
            {/* Brand header card */}
            <Animated.View entering={FadeInDown.delay(30).duration(260)}>
              <View style={[stdStyles.brandCard, {
                backgroundColor: isDark ? "#0a0f1a" : "#f0f6ff",
                borderColor: ACCENT + "28",
              }]}>
                <LinearGradient
                  colors={[ACCENT + "18", ACCENT + "05"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={stdStyles.brandHeader}>
                  <View style={[stdStyles.brandIconWrap, {
                    backgroundColor: ACCENT + "20",
                    borderColor: ACCENT + "44",
                  }]}>
                    <Ionicons name="qr-code-outline" size={22} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[stdStyles.brandLabel, { color: ACCENT }]}>QR GUARD STANDARD</Text>
                    <Text style={[stdStyles.brandSub, { color: colors.textSecondary }]}>
                      Verified QR code — content managed by owner
                    </Text>
                  </View>
                  {isDeactivated ? (
                    <View style={[stdStyles.statusChip, { backgroundColor: "#ef444420", borderColor: "#ef444440" }]}>
                      <Ionicons name="ban" size={11} color="#ef4444" />
                      <Text style={[stdStyles.statusChipText, { color: "#ef4444" }]}>Inactive</Text>
                    </View>
                  ) : (
                    <View style={[stdStyles.statusChip, { backgroundColor: "#22c55e20", borderColor: "#22c55e40" }]}>
                      <View style={[stdStyles.dot, { backgroundColor: "#22c55e" }]} />
                      <Text style={[stdStyles.statusChipText, { color: "#22c55e" }]}>Active</Text>
                    </View>
                  )}
                </View>

                {standardLoading && (
                  <View style={stdStyles.loadingRow}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={[stdStyles.loadingText, { color: colors.textSecondary }]}>
                      Loading content…
                    </Text>
                  </View>
                )}

                {!standardLoading && standardData && (
                  <View style={[stdStyles.ownerRow, { borderColor: colors.surfaceBorder + "60" }]}>
                    <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
                    <Text style={[stdStyles.ownerLabel, { color: colors.textSecondary }]}>Owner</Text>
                    <Text style={[stdStyles.ownerValue, { color: colors.text }]} numberOfLines={1}>
                      {standardData.ownerName}
                    </Text>
                  </View>
                )}

                {isDeactivated && (
                  <View style={[stdStyles.alertRow, { backgroundColor: "#ef444418", borderColor: "#ef444440" }]}>
                    <Ionicons name="ban-outline" size={14} color="#ef4444" />
                    <Text style={[stdStyles.alertText, { color: "#ef4444" }]}>
                      This QR code has been deactivated by its owner
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {!q.offlineMode && !standardLoading && (
              <QrVerdictSection
                verdict={verdict}
                offlineMode={q.offlineMode}
                ownerInfo={null}
                onOpenOwnerSheet={() => setOwnerSheetOpen(true)}
              />
            )}

            {!standardLoading && effectiveContent && (
              <QrContentSection
                content={effectiveContent}
                contentType={effectiveContentType}
                parsedPayment={contentSafety.parsedPayment}
                isDeactivated={isDeactivated}
                onOpenContent={() => smartOpenContent(effectiveContent, effectiveContentType, standardData?.templateKey)}
                templateKey={standardData?.templateKey}
                paymentSafety={contentSafety.paymentSafety}
                urlSafety={effectiveContentType === "url" ? contentSafety.urlSafety : undefined}
                isBranded={true}
                offlineMode={q.offlineMode}
                hasOwner={true}
                user={user}
              />
            )}

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
              delay={90}
            />

            <QrReportSection
              user={user}
              offlineMode={q.offlineMode}
              reportCounts={q.reportCounts}
              userReport={q.userReport}
              isPayment={false}
              handleReport={q.handleReport}
              showToast={showToast}
              onLayout={(e: any) => { reportSectionY.current = e.nativeEvent.layout.y; }}
              colors={colors}
              delay={100}
            />

            <QrCommentSection user={user} offlineMode={q.offlineMode} q={q} delay={110} />

            <Animated.View entering={FadeInDown.delay(120).duration(260)}>
              <DonationBanner />
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <QrBottomSheets
        ownerSheetOpen={ownerSheetOpen}
        onCloseOwnerSheet={() => setOwnerSheetOpen(false)}
        ownerInfo={ownerInfoForSheet ?? q.ownerInfo}
        guardLink={null}
        q={q}
        overflowOpen={overflowOpen}
        onCloseOverflow={() => setOverflowOpen(false)}
        isFavorite={q.isFavorite}
        isFollowing={q.isFollowing}
        followLoading={q.followLoading}
        hasOwner={!!ownerInfoForSheet}
        onFavorite={handleFavoritePress}
        onWatch={handleWatchPress}
        onReportPress={handleReportPress}
        user={user}
        isQrOwner={isQrOwner}
      />
    </View>
  );
}

const stdStyles = StyleSheet.create({
  navTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  brandCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12, overflow: "hidden", marginBottom: 12 },
  brandHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIconWrap: {
    width: 46, height: 46, borderRadius: 13, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  brandLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.3, marginBottom: 2 },
  brandSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  ownerRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  ownerLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 50 },
  ownerValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  alertRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
  },
  alertText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 17 },
});
