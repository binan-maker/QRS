import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Keyboard,
  Share,
} from "react-native";
import BottomSheet from "@/components/ui/BottomSheet";
import * as Haptics from "expo-haptics";

import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCompactNumber } from "@/lib/number-format";
import { smartName } from "@/lib/utils/formatters";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";
import { useNetworkStatus } from "@/lib/utils/use-network";
import { getGuardLink, getStandardLink, type GuardLink } from "@/lib/services/guard-service";
import { makeStyles } from "@/features/qr-detail/styles";
import LoadingSkeleton from "@/features/qr-detail/components/LoadingSkeleton";
import ContentCard from "@/features/qr-detail/components/ContentCard";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";
import OwnerCard from "@/features/qr-detail/components/OwnerCard";
import CommentItem from "@/features/qr-detail/components/CommentItem";
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

function safeBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)");
  }
}

function detectContentType(content: string): string {
  if (!content) return "text";
  const c = content.trim();
  const lower = c.toLowerCase();
  if (lower.startsWith("https://") || lower.startsWith("http://")) return "url";
  if (lower.startsWith("upi://") || lower.startsWith("tez://upi") || lower.startsWith("gpay://upi") || lower.startsWith("phonepe://pay")) return "payment";
  if (lower.startsWith("paytm://") || lower.startsWith("bhim://") || lower.startsWith("000201") || lower.startsWith("00020")) return "payment";
  if (lower.startsWith("tel:") || lower.startsWith("callto:") || lower.startsWith("facetime:")) return "phone";
  if (lower.startsWith("mailto:")) return "email";
  if (lower.startsWith("wifi:") || lower.startsWith("WIFI:")) return "wifi";
  if (lower.startsWith("geo:") || lower.startsWith("comgooglemaps://")) return "location";
  if (lower.startsWith("smsto:") || lower.startsWith("sms:")) return "sms";
  if (c.startsWith("BEGIN:VCARD") || lower.startsWith("mecard:")) return "contact";
  if (c.startsWith("BEGIN:VCALENDAR")) return "event";
  if (lower.startsWith("otpauth://")) return "otp";
  if (lower.startsWith("market://") || lower.startsWith("itms-apps://") || lower.startsWith("itms://")) return "app";
  if (lower.startsWith("instagram://") || lower.startsWith("twitter://") || lower.startsWith("fb://") ||
      lower.startsWith("linkedin://") || lower.startsWith("youtube://") || lower.startsWith("tg://") ||
      lower.startsWith("snapchat://") || lower.startsWith("tiktok://")) return "social";
  if (lower.startsWith("bitcoin:") || lower.startsWith("ethereum:") || lower.startsWith("litecoin:") ||
      lower.startsWith("monero:") || lower.startsWith("ripple:")) return "payment";
  if (/^[A-Za-z0-9+/]{40,}={0,2}$/.test(c) || /^[0-9a-fA-F]{40,}$/.test(c)) return "encrypted";
  return "text";
}


export default function QrDetailScreen() {
  const { id, guardUuid, standardUuid, ownerDocId } = useLocalSearchParams<{ id: string; guardUuid?: string; standardUuid?: string; ownerDocId?: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
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
    getGuardLink(guardUuid).then((link) => {
      setGuardLink(link);
    }).catch(() => {
      setGuardLink(null);
    }).finally(() => {
      setGuardLinkLoading(false);
    });
  }, [guardUuid]);

  useEffect(() => {
    if (!standardUuid) return;
    setStandardLinkLoading(true);
    getStandardLink(standardUuid).then((link) => {
      setStandardLinkData(link);
    }).catch(() => {
      setStandardLinkData(null);
    }).finally(() => {
      setStandardLinkLoading(false);
    });
  }, [standardUuid]);

  const q = useQrDetail(id);
  const { isOnline } = useNetworkStatus();
  const [offlineToastKey, setOfflineToastKey] = useState(0);
  const topInset = useTopInset();
  const trust = q.getTrustInfo();
  const verdict = q.getCombinedVerdict();
  const currentContent = q.qrCode?.content || q.offlineContent || "";
  const currentContentType = q.qrCode?.contentType || q.offlineContentType;

  const isGuardQr = !!guardUuid;
  const isStandardQr = !!standardUuid;
  const guardReady = isGuardQr && !guardLinkLoading && !!guardLink?.currentDestination;
  const standardReady = isStandardQr && !standardLinkLoading && !!standardLinkData?.rawContent;

  const effectiveContent = guardReady
    ? guardLink!.currentDestination
    : standardReady
      ? standardLinkData!.rawContent
      : (isGuardQr || isStandardQr)
        ? ""
        : currentContent;

  const effectiveContentType = guardReady
    ? detectContentType(guardLink!.currentDestination)
    : standardReady
      ? detectContentType(standardLinkData!.rawContent)
      : (isGuardQr || isStandardQr)
        ? "url"
        : (currentContentType || detectContentType(currentContent));

  const hasOwner = !!q.ownerInfo?.ownerId;

  const handleCreatorFollowPress = useCallback(() => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!isOnline) { setOfflineToastKey((k) => k + 1); return; }
    const willFollow = !q.isFollowingCreator;
    q.handleToggleFollowCreator();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const creatorLabel = q.ownerInfo?.businessName || q.ownerInfo?.ownerName || "Creator";
    showToast(
      willFollow ? `Following ${creatorLabel}` : `Unfollowed ${creatorLabel}`,
      willFollow ? "person-add" : "person-remove-outline"
    );
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
    const content = effectiveContent || currentContent;
    try {
      await Share.share({
        message: `Check out this QR code${label !== "QR Code" ? ` from ${label}` : ""}: ${content}`,
        title: label,
      });
    } catch {
      showToast("Could not share", "alert-circle-outline");
    }
  }, [q.ownerInfo, effectiveContent, currentContent, showToast]);

  const hasLocalWarnings =
    (effectiveContentType === "payment" && q.paymentSafety?.isSuspicious) ||
    (effectiveContentType === "url" && q.urlSafety?.isSuspicious) ||
    q.offlineBlacklistMatch.matched;

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

          {/* Nav */}
          <View style={styles.navBar}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Pressable onPress={safeBack} style={styles.navBackBtn}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.navTitle, { textAlign: "left" }]} numberOfLines={1}>
                  {hasOwner
                    ? (q.ownerInfo?.businessName || q.ownerInfo?.ownerName || "QR Details")
                    : "QR Details"}
                </Text>
                {q.offlineMode && (
                  <Text style={[navOfflineStyles.badge, { color: colors.warning }]}>● Offline</Text>
                )}
              </View>
            </View>

            <View style={styles.navActions}>
              {/* Primary action: Follow (creator) for branded QR, Watch for external */}
              {hasOwner ? (
                <Pressable
                  onPress={q.creatorFollowLoading ? undefined : handleCreatorFollowPress}
                  style={({ pressed }) => [
                    styles.followBtn,
                    q.isFollowingCreator && styles.followBtnActive,
                    q.creatorFollowLoading && { opacity: 0.55 },
                    !q.creatorFollowLoading && { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}
                >
                  {q.creatorFollowLoading ? (
                    <ActivityIndicator size={13} color={q.isFollowingCreator ? colors.primary : colors.textSecondary} />
                  ) : (
                    <Ionicons
                      name={q.isFollowingCreator ? "person-add" : "person-add-outline"}
                      size={14}
                      color={q.isFollowingCreator ? colors.primary : colors.textSecondary}
                    />
                  )}
                  <Text style={[styles.followBtnText, q.isFollowingCreator && styles.followBtnTextActive]}>
                    {q.isFollowingCreator ? "Following" : "Follow"}
                  </Text>
                  {q.creatorFollowerCount > 0 && !q.creatorFollowLoading && (
                    <Pressable
                      onPress={() => { q.handleLoadCreatorFollowers(); q.setCreatorFollowersModalOpen(true); }}
                      hitSlop={6}
                    >
                      <View style={styles.followCountPill}>
                        <Text style={styles.followCountPillText}>{formatCompactNumber(q.creatorFollowerCount)}</Text>
                      </View>
                    </Pressable>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={q.followLoading ? undefined : handleWatchPress}
                  style={({ pressed }) => [
                    styles.followBtn,
                    q.isFollowing && styles.followBtnActive,
                    q.followLoading && { opacity: 0.55 },
                    !q.followLoading && { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}
                >
                  {q.followLoading ? (
                    <ActivityIndicator size={13} color={q.isFollowing ? colors.primary : colors.textSecondary} />
                  ) : (
                    <Ionicons
                      name={q.isFollowing ? "notifications" : "notifications-outline"}
                      size={14}
                      color={q.isFollowing ? colors.primary : colors.textSecondary}
                    />
                  )}
                  <Text style={[styles.followBtnText, q.isFollowing && styles.followBtnTextActive]}>
                    {q.isFollowing ? "Watching" : "Watch"}
                  </Text>
                  {q.followCount > 0 && !q.followLoading && (
                    <View style={styles.followCountPill}>
                      <Text style={styles.followCountPillText}>{formatCompactNumber(q.followCount)}</Text>
                    </View>
                  )}
                </Pressable>
              )}

              {/* Manage button — shown only to the QR owner */}
              {user?.id && q.ownerInfo?.ownerId && user.id === q.ownerInfo.ownerId && (
                <Pressable
                  onPress={() => {
                    if (ownerDocId) {
                      router.push(`/my-qr/${ownerDocId}` as any);
                    } else {
                      router.push("/(tabs)/profile");
                    }
                  }}
                  style={({ pressed }) => [
                    styles.followBtn,
                    { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40", opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="settings-outline" size={14} color={colors.primary} />
                  <Text style={[styles.followBtnText, { color: colors.primary }]}>Manage</Text>
                </Pressable>
              )}

              {/* Overflow ⋮ — secondary actions (favorites, watch, share) */}
              <Pressable
                onPress={() => setOverflowOpen(true)}
                style={({ pressed }) => [styles.navActionBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
              </Pressable>
            </View>
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
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* ── Deactivated QR Banner ────────────────────────────────────── */}
            {q.ownerInfo?.isActive === false && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.deactivatedBanner}>
                  <LinearGradient
                    colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.08)"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
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


            {/* ── Safety Verdict Banner ────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(250)}>
              <VerdictBanner verdict={verdict} offlineMode={q.offlineMode} />
            </Animated.View>

            {/* ── Owner Circle Row (tappable, visible to all) ──────────────── */}
            {q.ownerInfo?.isBranded && (
              <Pressable
                onPress={() => setOwnerSheetOpen(true)}
                style={({ pressed }) => [ownerCircleRowStyles.row, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={q.ownerInfo.qrType === "business" ? [colors.warning, colors.warningShade] : [colors.safe, colors.safeShade]}
                  style={ownerCircleRowStyles.circle}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={q.ownerInfo.qrType === "business" ? "storefront" : "person"} size={18} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {q.ownerInfo.businessName ? (
                    <Text style={[ownerCircleRowStyles.name, { color: colors.text }]} numberOfLines={1}>{q.ownerInfo.businessName}</Text>
                  ) : null}
                  <Text style={[ownerCircleRowStyles.by, { color: colors.textSecondary }]} numberOfLines={1}>
                    by {q.ownerInfo.ownerName}
                  </Text>
                </View>
                <View style={[ownerCircleRowStyles.verifiedBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                  <Text style={[ownerCircleRowStyles.verifiedText, { color: colors.primary }]}>Verified</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )}

            {/* ── Advisory Disclaimer ──────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(250).delay(30)}>
              <Pressable
                style={[advisoryStyles.row, { borderColor: colors.surfaceBorder }]}
                onPress={() => setDisclaimerExpanded(v => !v)}
              >
                <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
                {disclaimerExpanded ? (
                  <Text style={[advisoryStyles.text, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                    QR Guard provides informational analysis only. Results are not guaranteed to be accurate or complete. Always exercise your own judgment before acting on any QR code. QR Guard is not liable for any loss or damage arising from use of this information.
                  </Text>
                ) : (
                  <Text style={[advisoryStyles.textShort, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                    Advisory only — for reference
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            {/* ── Smart Redirect / Guard Banner ────────────────────────── */}
            {isGuardQr && (
              <LivingShieldBanner guardLink={guardLink} loading={guardLinkLoading} />
            )}

            {/* ── Standard Protected QR Banner ─────────────────────────── */}
            {isStandardQr && (
              <StandardQrBanner
                loading={standardLinkLoading}
                ready={standardReady}
                ownerName={standardLinkData?.ownerName ?? null}
                isActive={standardLinkData?.isActive !== false}
              />
            )}

            {/* ── Content Card ────────────────────────────────────────────── */}
            {((!isGuardQr && !isStandardQr) || guardReady || standardReady) && (
              <Animated.View entering={FadeInDown.duration(300).delay(50)}>
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

            {/* ── Payment Safety Warning ──────────────────────────────── */}
            {effectiveContentType === "payment" && q.paymentSafety?.isSuspicious && (() => {
              const filteredWarnings = (q.paymentSafety?.warnings ?? []).filter(
                (w) => !w.toLowerCase().startsWith("pre-filled amount")
              );
              if (filteredWarnings.length === 0) return null;
              return (
                <Animated.View entering={FadeInDown.duration(300).delay(75)}>
                  <SafetyWarningCard
                    riskLevel={q.paymentSafety!.riskLevel as "caution" | "dangerous"}
                    warnings={filteredWarnings}
                    title={q.paymentSafety!.riskLevel === "dangerous" ? "Payment Security Warning" : "Payment Security Notice"}
                  />
                </Animated.View>
              );
            })()}

            {/* ── Payment Evidence ─────────────────────────────────────── */}
            {effectiveContentType === "payment" && q.paymentSafety?.evidence && q.paymentSafety.evidence.length > 0 && (
              <Animated.View entering={FadeInDown.duration(300).delay(90)}>
                <EvidenceCard title="Payment Analysis" evidence={q.paymentSafety.evidence} />
              </Animated.View>
            )}

            {/* ── External QR Warning ──────────────────────────────────── */}
            {!q.ownerInfo?.isBranded && !q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(300).delay(75)}>
                <View style={[externalQrBannerStyles.card, { backgroundColor: colors.surface, borderColor: colors.warning + "30" }]}>
                  <View style={[externalQrBannerStyles.accentStrip, { backgroundColor: colors.warning }]} />
                  <View style={externalQrBannerStyles.innerContent}>
                    <View style={[externalQrBannerStyles.iconWrap, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "35" }]}>
                      <Ionicons name="qr-code-outline" size={20} color={colors.warning} />
                    </View>
                    <View style={externalQrBannerStyles.textBlock}>
                      <Text style={[externalQrBannerStyles.title, { color: colors.text }]} maxFontSizeMultiplier={1}>Standard QR</Text>
                      <Text style={[externalQrBannerStyles.subtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>We cannot verify the owner's identity</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── Community Trust ───────────────────────────────────────── */}
            {!q.offlineMode && (
              <Animated.View entering={FadeInDown.duration(400).delay(80)}>
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

            {/* ── Sections below only for signed-in users ───────────────────── */}
            {user && (
              <>
                {/* ── Rate This QR ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.duration(400).delay(110)}>
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
                        const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                          safe: "shield-checkmark",
                          scam: "warning",
                          fake: "close-circle",
                          spam: "mail-unread",
                        };
                        showToast(`Voted ${labels[type] ?? type}`, icons[type] ?? "flag");
                      }}
                    />
                  )}
                </Animated.View>

                {/* ── Safety Warnings (URL + blacklist) ─────────────────────── */}
                {((effectiveContentType === "url" && q.urlSafety?.isSuspicious) || q.offlineBlacklistMatch.matched) ? (
                  <Animated.View entering={FadeInDown.duration(300).delay(130)}>
                    {effectiveContentType === "url" && q.urlSafety?.isSuspicious && (
                      <SafetyWarningCard
                        riskLevel={q.urlSafety.riskLevel as "caution" | "dangerous"}
                        warnings={q.urlSafety.warnings}
                        title={q.urlSafety.riskLevel === "dangerous" ? "Dangerous URL Detected" : "Proceed with Caution"}
                      />
                    )}
                    {q.offlineBlacklistMatch.matched && (
                      <SafetyWarningCard
                        riskLevel="dangerous"
                        warnings={[`Known scam pattern: ${q.offlineBlacklistMatch.reason}`]}
                        title="Known Scam Pattern"
                      />
                    )}
                  </Animated.View>
                ) : null}

                {/* ── URL Evidence ───────────────────────────────────────────── */}
                {effectiveContentType === "url" && q.urlSafety?.evidence && q.urlSafety.evidence.length > 0 && (
                  <Animated.View entering={FadeInDown.duration(300).delay(145)}>
                    <EvidenceCard title="URL Analysis" evidence={q.urlSafety.evidence} />
                  </Animated.View>
                )}
              </>
            )}

            {/* ── Comments ─────────────────────────────────────────────────── */}
            {!q.offlineMode && (
            <Animated.View entering={FadeInDown.duration(400).delay(210)}>
              <View style={styles.commentsHeader}>
                <View style={styles.commentsTitleRow}>
                  <SectionHeader icon="chatbubbles-outline" label="Comments" gradient={[colors.primary, colors.primaryShade]} inline />
                  {q.totalComments > 0 && (
                    <View style={[styles.commentCountBadge, { marginLeft: 6 }]}>
                      <Text style={styles.commentCountText}>{formatCompactNumber(q.totalComments)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {(
                <>
                  {!user ? (
                    <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.commentInput, { marginBottom: 10 }]}>
                      <Text style={[styles.commentTextInput, { color: colors.textMuted, paddingTop: 4 }]}>Add a comment…</Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.inlineCommentBar]}>
                      {q.replyTo && (
                        <View style={styles.replyBanner}>
                          <Ionicons name="return-down-forward-outline" size={13} color={colors.primary} />
                          <Text style={styles.replyBannerText} numberOfLines={1}>
                            Replying to <Text style={{ color: colors.text }}>{q.replyTo.author}</Text>
                          </Text>
                          <Pressable onPress={() => q.setReplyTo(null)} style={{ marginLeft: "auto" as any }}>
                            <Ionicons name="close" size={14} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      )}
                      <View style={styles.commentInput}>
                        <TextInput
                          ref={q.commentInputRef}
                          style={styles.commentTextInput}
                          placeholder={q.replyTo ? `Reply to ${q.replyTo.author}...` : "Add a comment..."}
                          placeholderTextColor={colors.textMuted}
                          value={q.newComment}
                          onChangeText={q.setNewComment}
                          multiline
                          maxLength={500}
                        />
                        <Pressable
                          onPress={() => { Keyboard.dismiss(); q.handleSubmitComment(); }}
                          disabled={q.submitting || !q.newComment.trim()}
                          style={({ pressed }) => [styles.sendBtn, { opacity: (pressed || q.submitting || !q.newComment.trim()) ? 0.4 : 1 }]}
                        >
                          <Ionicons name="send" size={15} color="#000" />
                        </Pressable>
                      </View>
                    </View>
                  )}
                  {q.commentsList.length === 0 ? (
                    <View style={styles.noComments}>
                      <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
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
                        allComments={q.commentsList}
                        userLikes={q.userLikes}
                        commentMenuId={q.commentMenuId}
                        deletingCommentId={q.deletingCommentId}
                        revealedComments={q.revealedComments}
                        userId={user?.id}
                        onLike={user ? q.handleCommentLike : () => router.push("/(auth)/login")}
                        onReply={user ? (c) => {
                          const rootId = q.getRootCommentId(c.id);
                          q.setReplyTo({
                            id: c.id,
                            author: c.userUsername ? `@${c.userUsername}` : smartName(c.user.displayName),
                            rootId,
                            isNested: !!c.parentId,
                          });
                        } : () => router.push("/(auth)/login")}
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
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>Load More Comments</Text>
                      )}
                    </Pressable>
                  )}
                </>
              )}
            </Animated.View>
            )}

            {/* ── Owner Info (signed-in only) ──────────────────────────────── */}
            {user && q.ownerInfo && (
              <Animated.View entering={FadeInDown.duration(400).delay(170)}>
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

            {/* ── Support the Developer ────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <Pressable
                onPress={() => router.push("/donation")}
                style={({ pressed }) => [
                  donationBannerStyles.card,
                  {
                    backgroundColor: colors.isDark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.07)",
                    borderColor: "#7C3AED30",
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={["#7C3AED", "#6366F1"]}
                  style={donationBannerStyles.iconWrap}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="heart" size={18} color="#fff" />
                </LinearGradient>
                <View style={donationBannerStyles.textWrap}>
                  <Text style={[donationBannerStyles.title, { color: colors.text }]}>
                    Support QR Guard
                  </Text>
                  <Text style={[donationBannerStyles.sub, { color: colors.textSecondary }]}>
                    Donate ₹10 · ₹50 · ₹100 via Play Store to keep this app free & secure
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </Animated.View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ── Owner Info Bottom Sheet ─────────────────────────────── */}
      <BottomSheet
        visible={ownerSheetOpen}
        onClose={() => setOwnerSheetOpen(false)}
        sheetStyle={{ paddingHorizontal: 0 }}
      >
            {q.ownerInfo && (
              <>
                <View style={ownerSheetStyles.avatarRow}>
                  <LinearGradient
                    colors={q.ownerInfo.qrType === "business" ? [colors.warning, colors.warningShade] : [colors.safe, colors.safeShade]}
                    style={ownerSheetStyles.avatar}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    {q.ownerInfo.ownerLogoBase64 && q.ownerInfo.qrType === "business" ? (
                      <View style={StyleSheet.absoluteFill}>
                        {/* logo base64 as background handled by LinearGradient overlay */}
                      </View>
                    ) : null}
                    <Ionicons
                      name={q.ownerInfo.qrType === "business" ? "storefront" : "person"}
                      size={30}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {q.ownerInfo.businessName ? (
                      <Text style={[ownerSheetStyles.bizName, { color: colors.text }]} numberOfLines={1}>
                        {q.ownerInfo.businessName}
                      </Text>
                    ) : null}
                    <Text style={[ownerSheetStyles.byName, { color: colors.textSecondary }]} numberOfLines={1}>
                      by {q.ownerInfo.ownerName}
                    </Text>
                    <View style={ownerSheetStyles.badgeRow}>
                      <View style={[ownerSheetStyles.typeBadge, { backgroundColor: (q.ownerInfo.qrType === "business" ? colors.warning : colors.safe) + "20", borderColor: (q.ownerInfo.qrType === "business" ? colors.warning : colors.safe) + "50" }]}>
                        <Text style={[ownerSheetStyles.typeBadgeText, { color: q.ownerInfo.qrType === "business" ? colors.warning : colors.safe }]}>
                          {q.ownerInfo.qrType === "business" ? "Business" : "Individual"}
                        </Text>
                      </View>
                      {q.ownerInfo.isBranded && (
                        <View style={[ownerSheetStyles.verifiedBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
                          <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                          <Text style={[ownerSheetStyles.verifiedText, { color: colors.primary }]}>Verified</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {q.ownerInfo.brandedUuid ? (
                  <View style={[ownerSheetStyles.infoRow, { borderColor: colors.surfaceBorder }]}>
                    <Ionicons name="qr-code-outline" size={14} color={colors.textMuted} />
                    <Text style={[ownerSheetStyles.infoLabel, { color: colors.textMuted }]}>QR ID</Text>
                    <Text style={[ownerSheetStyles.infoValue, { color: colors.textSecondary }]} numberOfLines={1} selectable>
                      {q.ownerInfo.brandedUuid}
                    </Text>
                  </View>
                ) : null}

                {guardLink?.currentDestination ? (
                  <View style={[ownerSheetStyles.infoRow, { borderColor: colors.surfaceBorder }]}>
                    <Ionicons name="link-outline" size={14} color={colors.textMuted} />
                    <Text style={[ownerSheetStyles.infoLabel, { color: colors.textMuted }]}>Destination</Text>
                    <Text style={[ownerSheetStyles.infoValue, { color: colors.textSecondary }]} numberOfLines={2} selectable>
                      {guardLink.currentDestination}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
            <Pressable onPress={() => setOwnerSheetOpen(false)} style={commentMenuStyles.cancelBtn}>
              <Text style={[commentMenuStyles.cancelText, { color: colors.textSecondary }]}>Close</Text>
            </Pressable>
      </BottomSheet>

      {/* Comment 3-dot Menu — YouTube-style bottom sheet */}
      <BottomSheet
        visible={q.commentMenuId !== null}
        onClose={() => q.setCommentMenuId(null)}
        sheetStyle={{ paddingHorizontal: 0 }}
      >
            {q.commentMenuOwner ? (
              <Pressable
                onPress={() => {
                  const id = q.commentMenuId!;
                  q.setCommentMenuId(null);
                  q.handleDeleteComment(id);
                }}
                style={commentMenuStyles.menuItem}
              >
                <View style={[commentMenuStyles.menuIconWrap, { backgroundColor: colors.dangerDim ?? (colors.danger + "15") }]}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </View>
                <Text style={[commentMenuStyles.menuLabel, { color: colors.danger }]}>Delete comment</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  const id = q.commentMenuId!;
                  q.setCommentMenuId(null);
                  q.setCommentReportModal(id);
                }}
                style={commentMenuStyles.menuItem}
              >
                <View style={[commentMenuStyles.menuIconWrap, { backgroundColor: colors.warningDim ?? (colors.warning + "15") }]}>
                  <Ionicons name="flag-outline" size={20} color={colors.warning} />
                </View>
                <Text style={[commentMenuStyles.menuLabel, { color: colors.text }]}>Report comment</Text>
              </Pressable>
            )}
            <Pressable onPress={() => q.setCommentMenuId(null)} style={commentMenuStyles.cancelBtn}>
              <Text style={[commentMenuStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
      </BottomSheet>

      {/* Modals */}
      {/* ── Overflow menu ─────────────────────────────────────────── */}
      <BottomSheet
        visible={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        sheetStyle={{ paddingHorizontal: 0 }}
      >

            {/* ── Favorites ── */}
            <Pressable
              style={overflowStyles.item}
              onPress={() => { setOverflowOpen(false); handleFavoritePress(); }}
            >
              <View style={[overflowStyles.iconWrap, { backgroundColor: q.isFavorite ? colors.danger + "18" : colors.surfaceLight }]}>
                <Ionicons
                  name={q.isFavorite ? "heart" : "heart-outline"}
                  size={20}
                  color={q.isFavorite ? colors.danger : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[overflowStyles.itemLabel, { color: colors.text }]}>
                  {q.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                </Text>
                <Text style={[overflowStyles.itemSub, { color: colors.textMuted }]}>
                  {q.isFavorite ? "Unpin this QR from your favorites" : "Save this QR for quick access"}
                </Text>
              </View>
              {q.isFavorite && (
                <Ionicons name="checkmark-circle" size={16} color={colors.danger} />
              )}
            </Pressable>

            <View style={[overflowStyles.separator, { backgroundColor: colors.surfaceBorder }]} />

            {/* ── Watch this QR (only for branded/internal QR — secondary action) ── */}
            {hasOwner && (
              <>
                <Pressable
                  style={[overflowStyles.item, q.followLoading && { opacity: 0.5 }]}
                  onPress={q.followLoading ? undefined : () => { setOverflowOpen(false); handleWatchPress(); }}
                >
                  <View style={[overflowStyles.iconWrap, { backgroundColor: q.isFollowing ? colors.primaryDim : colors.surfaceLight }]}>
                    {q.followLoading ? (
                      <ActivityIndicator size={18} color={q.isFollowing ? colors.primary : colors.textSecondary} />
                    ) : (
                      <Ionicons
                        name={q.isFollowing ? "notifications" : "notifications-outline"}
                        size={20}
                        color={q.isFollowing ? colors.primary : colors.textSecondary}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[overflowStyles.itemLabel, { color: colors.text }]}>
                      {q.isFollowing ? "Unwatch this QR" : "Watch this QR"}
                    </Text>
                    <Text style={[overflowStyles.itemSub, { color: colors.textMuted }]}>
                      {q.isFollowing ? "Stop alerts for this specific QR" : "Get alerts when this QR changes"}
                    </Text>
                  </View>
                  {q.isFollowing && !q.followLoading && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  )}
                </Pressable>
                <View style={[overflowStyles.separator, { backgroundColor: colors.surfaceBorder }]} />
              </>
            )}

            {/* ── Share ── */}
            <Pressable
              style={overflowStyles.item}
              onPress={() => { setOverflowOpen(false); handleSharePress(); }}
            >
              <View style={[overflowStyles.iconWrap, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[overflowStyles.itemLabel, { color: colors.text }]}>Share QR</Text>
                <Text style={[overflowStyles.itemSub, { color: colors.textMuted }]}>Send this QR code to someone</Text>
              </View>
            </Pressable>

      </BottomSheet>

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
        subtitle={`${formatCompactNumber(q.followCount)} ${q.followCount === 1 ? "person is" : "people are"} watching this QR`}
        emptyIcon="notifications-outline"
        emptyText="No watchers yet"
      />
      <FollowersModal
        visible={q.creatorFollowersModalOpen}
        followCount={q.creatorFollowerCount}
        followers={q.creatorFollowersList}
        loading={q.creatorFollowersLoading}
        onClose={() => q.setCreatorFollowersModalOpen(false)}
        title="Creator Followers"
        subtitle={`${formatCompactNumber(q.creatorFollowerCount)} ${q.creatorFollowerCount === 1 ? "person follows" : "people follow"} this creator`}
        emptyIcon="people-outline"
        emptyText="No followers yet"
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
        onMarkRead={() => {}}
        onClose={() => q.setMessagesModalOpen(false)}
      />
    </View>
  );
}


const navOfflineStyles = StyleSheet.create({
  badge: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
});

const offlineSectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});

const externalQrBannerStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
    flexDirection: "row",
  },
  accentStrip: {
    width: 3,
    alignSelf: "stretch",
    flexShrink: 0,
  },
  innerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  body: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

const advisoryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  text: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    flex: 1,
    opacity: 0.75,
  },
  textShort: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    opacity: 0.75,
  },
});

const guestModeBannerStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  lockCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  signInBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    flexShrink: 0,
  },
  signInBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

const guestBlurOverlayStyles = StyleSheet.create({
  cta: {
    alignItems: "center",
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  sub: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    opacity: 0.75,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#6366F1",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

const _signInStyles = StyleSheet.create({
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 1,
  },
  bannerCta: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    flexShrink: 0,
  },
  bannerCtaText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.1,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 12,
    borderWidth: 1,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentPlaceholder: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  commentBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 0,
    flexShrink: 0,
  },
  commentBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});

const signInBannerCardStyle = _signInStyles.bannerCard;
const signInBannerIconCircle = _signInStyles.bannerIconCircle;
const signInBannerStyles = {
  title: _signInStyles.bannerTitle,
  sub: _signInStyles.bannerSub,
  cta: _signInStyles.bannerCta,
  ctaText: _signInStyles.bannerCtaText,
};
const signInCommentStyle = _signInStyles.commentRow;
const signInCommentAvatar = _signInStyles.commentAvatar;
const signInCommentPlaceholder = _signInStyles.commentPlaceholder;
const signInCommentBtn = _signInStyles.commentBtn;
const signInCommentBtnText = _signInStyles.commentBtnText;

const commentMenuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});

const ownerCircleRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  by: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});

const ownerSheetStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bizName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    marginBottom: 2,
  },
  byName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 80,
    flexShrink: 0,
    paddingTop: 1,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },
});

const overflowStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 6,
    paddingBottom: 32,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  itemSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
});

const donationBannerStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
