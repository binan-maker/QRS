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
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTopInset } from "@/shared/utils/platform";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useNetworkStatus } from "@/shared/utils/use-network";
import { getGuardLink, type GuardLink } from "@/services/guard-service";
import { detectContentType } from "@/services/qr-content-type";
import { makeStyles } from "@/features/qr-detail/styles";

import { OfflineToast } from "@/features/qr-detail/components/OfflineToast";
import { QrToast } from "@/features/qr-detail/components/QrToast";
import DonationBanner from "@/features/qr-detail/components/DonationBanner";

import {
  QrTrustSection,
  QrReportSection,
  QrCommentSection,
  QrBottomSheets,
} from "@/features/qr-detail/sections";

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
    setGuardLoading(true);
    getGuardLink(guardUuid)
      .then(setGuardLink)
      .catch(() => setGuardLink(null))
      .finally(() => setGuardLoading(false));
  }, [guardUuid]);

  const q = useQrDetail(id);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);

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

          {/* Guard NavBar */}
          <Animated.View entering={FadeInDown.delay(0).duration(260)} style={[styles.navBar, { gap: 10 }]}>
            <Animated.View entering={FadeIn.delay(30).duration(240)}>
              <Pressable onPress={safeBack} style={styles.navBackBtn}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
            </Animated.View>
            <View style={guardStyles.navTitleRow}>
              <View style={[guardStyles.navShieldWrap, { backgroundColor: ACCENT + "18" }]}>
                <Ionicons name="shield-checkmark" size={15} color={ACCENT} />
              </View>
              <Text style={[guardStyles.navTitle, { color: colors.text }]} numberOfLines={1}>
                Living Shield QR
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
            {/* Hero: Living Shield Card */}
            <Animated.View entering={FadeInDown.delay(30).duration(260)}>
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
                    {(guardLink.businessName || guardLink.ownerName) && (
                      <View style={[guardStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
                        <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                        <Text style={[guardStyles.infoLabel, { color: colors.textSecondary }]}>Owner</Text>
                        <Text style={[guardStyles.infoValue, { color: colors.text }]} numberOfLines={1}>
                          {guardLink.businessName || guardLink.ownerName}
                        </Text>
                      </View>
                    )}

                    <View style={[guardStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
                      <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
                      <Text style={[guardStyles.infoLabel, { color: colors.textSecondary }]}>Points to</Text>
                      <Text style={[guardStyles.infoValue, { color: colors.text }]} numberOfLines={2}>
                        {guardLink.currentDestination}
                      </Text>
                    </View>

                    {guardLink.destinationChangedAt && (
                      <View style={[guardStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[guardStyles.infoLabel, { color: colors.textSecondary }]}>Changed</Text>
                        <Text style={[guardStyles.infoValue, { color: colors.text }]}>
                          {formatRelativeTime(guardLink.destinationChangedAt)}
                        </Text>
                      </View>
                    )}

                    {recentlyChanged && (
                      <View style={[guardStyles.alertRow, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" }]}>
                        <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                        <Text style={[guardStyles.alertText, { color: "#f59e0b" }]}>
                          Destination changed within the last 24 hours — verify before opening
                        </Text>
                      </View>
                    )}

                    {isDeactivated && (
                      <View style={[guardStyles.alertRow, { backgroundColor: "#ef444418", borderColor: "#ef444440" }]}>
                        <Ionicons name="ban-outline" size={14} color="#ef4444" />
                        <Text style={[guardStyles.alertText, { color: "#ef4444" }]}>
                          This QR code has been deactivated by its owner
                        </Text>
                      </View>
                    )}

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
              delay={70}
            />

            <QrReportSection
              user={user}
              offlineMode={q.offlineMode}
              reportCounts={q.reportCounts}
              userReport={q.userReport}
              isPayment={effectiveContentType === "payment"}
              handleReport={q.handleReport}
              showToast={showToast}
              onLayout={(e: any) => { reportSectionY.current = e.nativeEvent.layout.y; }}
              colors={colors}
              delay={80}
            />

            <QrCommentSection user={user} offlineMode={q.offlineMode} q={q} delay={100} />

            <Animated.View entering={FadeInDown.delay(110).duration(260)}>
              <DonationBanner />
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <QrBottomSheets
        ownerSheetOpen={ownerSheetOpen}
        onCloseOwnerSheet={() => setOwnerSheetOpen(false)}
        ownerInfo={ownerInfoForSheet}
        guardLink={guardLink}
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
      />
    </View>
  );
}

const guardStyles = StyleSheet.create({
  navTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  navShieldWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12, overflow: "hidden", marginBottom: 12 },
  heroHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  heroLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.3, marginBottom: 2 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 58 },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  alertRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
  },
  alertText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 17 },
  openBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
  },
  openBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  historyToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  historyList: { gap: 8 },
  historyEntry: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 3 },
  historyTime: { fontSize: 11, fontFamily: "Inter_500Medium" },
  historyFrom: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyTo: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
