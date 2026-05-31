import React, { useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { safePush } from "@/shared/utils/navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Animated, {
  FadeInDown,
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import SkeletonBox from "@/shared/components/ui/SkeletonBox";
import { formatCompactNumber } from "@/shared/utils/number-format";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { useNotifications } from "@/shared/components/notifications/hooks/useNotifications";
import PhotoModal from "@/features/profile/components/PhotoModal";
import GuestView from "@/features/profile/components/GuestView";
import QrPreviewCard from "@/features/profile/components/QrPreviewCard";
import NotificationsModal from "@/shared/components/notifications/NotificationsModal";
import { styles } from "@/features/profile/styles";

// ── Module-level animation presets (created once, not per render) ──────────────
const ENTER_TOP_BAR      = FadeInDown.delay(0).duration(260);
const ENTER_NOTIF_BTN    = FadeIn.delay(40).duration(250);
const ENTER_SETTINGS_BTN = FadeIn.delay(50).duration(250);
const ENTER_AVATAR_SEC   = FadeInDown.delay(30).duration(260);
const ENTER_AVATAR_WRAP  = FadeIn.delay(40).duration(240);
const ENTER_NAME         = FadeInDown.delay(50).duration(260);
const ENTER_USERNAME     = FadeInDown.delay(60).duration(260);
const ENTER_BIO          = FadeInDown.delay(70).duration(260);
const ENTER_EDIT_BTN     = FadeInDown.delay(80).duration(260);
const ENTER_STATS_GRID   = FadeInDown.delay(50).duration(260);
const ENTER_QR_SECTION   = FadeInDown.delay(70).duration(260);
const ENTER_QR_EMPTY     = FadeInDown.delay(80).duration(260);
const ENTER_QR_MORE      = FadeIn.delay(40).duration(240);
const ENTER_NOTIF_DOT    = FadeIn.duration(240);
const ENTER_DONATION     = FadeInDown.delay(80).duration(260);
const ENTER_SIGNOUT      = FadeInDown.delay(100).duration(260);

// Per-index stat cell entering (max 5 items, pre-built)
const STAT_CELL_ENTER = [0, 1, 2, 3, 4].map((i) =>
  FadeInDown.delay(Math.min(i, 4) * 25).duration(260),
);
const QR_SKELETON_ENTER = FadeIn.delay(0).duration(240);

// ── Animated stat cell with number reveal ─────────────────────────────────────
const StatCell = React.memo(function StatCell({
  label, formatted, color, loading, index,
}: {
  label: string;
  formatted: string;
  color: string;
  loading: boolean;
  index: number;
}) {
  const { colors } = useTheme();
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    if (!loading) {
      opacity.value    = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      opacity.value    = 0;
      translateY.value = 10;
    }
  }, [loading]);

  const anim = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      entering={STAT_CELL_ENTER[Math.min(index, 4)]}
      style={[
        styles.statCell,
        index % 2 === 0 && { borderRightWidth: 1, borderRightColor: colors.surfaceBorder },
      ]}
    >
      {loading ? (
        <SkeletonBox width={36} height={18} borderRadius={6} />
      ) : (
        <Animated.Text style={[styles.statValue, { color }, anim]}>
          {formatted}
        </Animated.Text>
      )}
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </Animated.View>
  );
});

// ── QR skeleton tile ───────────────────────────────────────────────────────────
const QrSkeletonCard = React.memo(function QrSkeletonCard({ index }: { index: number }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={QR_SKELETON_ENTER}
      style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
    >
      <SkeletonBox width={58} height={58} borderRadius={12} />
    </Animated.View>
  );
});

// ── Donation entry card (clean, theme-aware, low visual weight) ────────────────
const DonationCard = React.memo(function DonationCard() {
  const { colors } = useTheme();
  const onPress = useCallback(() => safePush("/donation"), []);
  return (
    <Animated.View entering={ENTER_DONATION}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.donationBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary + "30",
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.donationIconWrap, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="shield-checkmark" size={17} color={colors.primary} />
        </View>
        <View style={styles.donationTextWrap}>
          <Text style={[styles.donationTitle, { color: colors.text }]}>Support QR Guard</Text>
          <Text style={[styles.donationSub, { color: colors.textMuted }]}>Help keep the app free &amp; independent</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
});

// ── QR skeleton list (3 items, stable) ────────────────────────────────────────
const QR_SKELETON_INDICES = [0, 1, 2];

// ── Main screen ───────────────────────────────────────────────────────────────
function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    user,
    stats, statsLoading,
    photoModalOpen, setPhotoModalOpen, uploadingPhoto,
    myQrCodes, myQrLoading,
    currentUsername,
    initials,
    bio,
    refreshing, handleRefresh,
    handlePickPhoto, handleRemovePhoto, handleSignOut,
  } = useProfile();
  const { cachedUrl: photoURL } = useAvatar();
  const {
    notifCount, notifOpen, setNotifOpen,
    notifications, markingRead,
    handleOpenNotifications, handleClearNotifications,
  } = useNotifications();

  const topInset     = useTopInset();
  const tabBarHeight = 60 + insets.bottom;
  const { onTabScroll } = useTabBarScroll();

  const previewQrs   = useMemo(() => myQrCodes.slice(0, 3), [myQrCodes]);
  const totalQrScans = useMemo(
    () => myQrCodes.reduce((sum, qr) => sum + (qr.scanCount || 0), 0),
    [myQrCodes],
  );

  const formattedStats = useMemo(() => [
    {
      label:     "QR Hits",
      value:     totalQrScans,
      color:     colors.accent,
      loading:   myQrLoading,
      formatted: formatCompactNumber(totalQrScans),
    },
    {
      label:     "Following",
      value:     stats.followingCount ?? 0,
      color:     colors.primary,
      loading:   statsLoading,
      formatted: formatCompactNumber(stats.followingCount ?? 0),
    },
  ], [totalQrScans, myQrLoading, stats.followingCount, statsLoading, colors.accent, colors.primary]);

  const openPhotoModal  = useCallback(() => setPhotoModalOpen(true),  [setPhotoModalOpen]);
  const closePhotoModal = useCallback(() => setPhotoModalOpen(false), [setPhotoModalOpen]);
  const closeNotifModal = useCallback(() => setNotifOpen(false),      [setNotifOpen]);
  const onCamera        = useCallback(() => handlePickPhoto("camera"),  [handlePickPhoto]);
  const onGallery       = useCallback(() => handlePickPhoto("gallery"), [handlePickPhoto]);

  const goToSettings    = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { from: "profile" } }), []);
  const goToEditProfile = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { initialSection: "profile", fromProfile: "1" } }), []);
  const goToLogin       = useCallback(() => safePush("/(auth)/login"),        []);
  const goToRegister    = useCallback(() => safePush("/(auth)/register"),     []);
  const goToMyQrCodes   = useCallback(() => safePush("/my-qr-codes"),         []);
  const goToGenerator   = useCallback(() => safePush("/(tabs)/qr-generator"), []);

  if (!user) {
    return (
      <GuestView
        colors={colors}
        topInset={topInset}
        onSignIn={goToLogin}
        onRegister={goToRegister}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 8, paddingBottom: tabBarHeight + 60 }]}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── TOP BAR ──────────────────────────────────────────── */}
        <Animated.View entering={ENTER_TOP_BAR} style={styles.topBar}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.topBarActions}>
            <Animated.View entering={ENTER_NOTIF_BTN}>
              <Pressable
                onPress={handleOpenNotifications}
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                accessibilityLabel="Notifications"
                hitSlop={8}
              >
                <Ionicons
                  name={notifCount > 0 ? "notifications" : "notifications-outline"}
                  size={17}
                  color={notifCount > 0 ? colors.primary : colors.textSecondary}
                />
                {notifCount > 0 && (
                  <Animated.View
                    entering={ENTER_NOTIF_DOT}
                    style={[styles.notifDot, { backgroundColor: colors.primary, borderColor: colors.background }]}
                  >
                    <Text style={[styles.notifDotText, { color: "#fff" }]}>
                      {notifCount > 9 ? "9+" : notifCount}
                    </Text>
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
            <Animated.View entering={ENTER_SETTINGS_BTN}>
              <Pressable
                onPress={goToSettings}
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                hitSlop={8}
              >
                <Ionicons name="settings-outline" size={17} color={colors.textSecondary} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ── AVATAR + IDENTITY ─────────────────────────────────── */}
        <Animated.View entering={ENTER_AVATAR_SEC} style={styles.avatarSection}>
          {/* Avatar */}
          <Animated.View entering={ENTER_AVATAR_WRAP}>
            <Pressable onPress={openPhotoModal} style={styles.avatarPressable}>
              <View style={[styles.avatarRing, { borderColor: colors.primary + "50" }]}>
                <View style={[styles.avatarInner, { backgroundColor: colors.surfaceLight }]}>
                  {photoURL ? (
                    <Image
                      source={{ uri: photoURL }}
                      style={styles.avatarPhoto}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      key={photoURL}
                    />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                  )}
                  {uploadingPhoto && (
                    <View style={styles.avatarUploadOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Ionicons name="camera" size={11} color={colors.primaryText} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Name */}
          <Animated.Text
            entering={ENTER_NAME}
            style={[styles.displayName, { color: colors.text }]}
            numberOfLines={1}
          >
            {user.displayName}
          </Animated.Text>

          {/* Username */}
          {currentUsername ? (
            <Animated.Text
              entering={ENTER_USERNAME}
              style={[styles.usernameText, { color: colors.primary }]}
            >
              @{currentUsername}
            </Animated.Text>
          ) : null}

          {/* Bio */}
          <Animated.View entering={ENTER_BIO}>
            {bio ? (
              <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2}>{bio}</Text>
            ) : (
              <Pressable onPress={goToEditProfile} hitSlop={8}>
                <Text style={[styles.bioHint, { color: colors.textMuted }]}>+ Add a bio</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Edit profile button */}
          <Animated.View entering={ENTER_EDIT_BTN}>
            <Pressable
              onPress={goToEditProfile}
              style={({ pressed }) => [
                styles.editProfileBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.editProfileText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ── STATS GRID ────────────────────────────────────────── */}
        <Animated.View
          entering={ENTER_STATS_GRID}
          style={[styles.statsGrid, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          {formattedStats.map((s, i) => (
            <StatCell
              key={s.label}
              label={s.label}
              formatted={s.formatted}
              color={s.color}
              loading={s.loading}
              index={i}
            />
          ))}
        </Animated.View>

        {/* ── MY QR CODES ───────────────────────────────────────── */}
        <Animated.View entering={ENTER_QR_SECTION} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My QR Codes</Text>
            <Pressable
              onPress={goToMyQrCodes}
              style={({ pressed }) => [styles.seeAllBtn, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={8}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </Pressable>
          </View>

          {myQrLoading ? (
            <View style={styles.qrRow}>
              {QR_SKELETON_INDICES.map((i) => (
                <QrSkeletonCard key={i} index={i} />
              ))}
            </View>
          ) : previewQrs.length === 0 ? (
            <Animated.View entering={ENTER_QR_EMPTY}>
              <Pressable
                onPress={goToGenerator}
                style={({ pressed }) => [
                  styles.emptyQrCard,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="qrcode-plus" size={22} color={colors.textMuted} />
                <Text style={[styles.emptyQrText, { color: colors.textMuted }]}>No QR codes yet — create one</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.qrRow}>
              {previewQrs.map((qr, i) => (
                <QrPreviewCard key={qr.docId} qr={qr} colors={colors} />
              ))}
              {myQrCodes.length > 3 && (
                <Animated.View entering={ENTER_QR_MORE} style={{ flex: 1 }}>
                  <Pressable
                    onPress={goToMyQrCodes}
                    style={({ pressed }) => [
                      styles.qrCard, styles.qrCardMore,
                      {
                        backgroundColor: colors.primaryDim,
                        borderColor:     colors.primary + "30",
                        opacity:         pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.qrMoreCount, { color: colors.primary }]}>+{myQrCodes.length - 3}</Text>
                    <Text style={[styles.qrMoreLabel,  { color: colors.primary }]}>more</Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── SUPPORT QR GUARD ──────────────────────────────────── */}
        <DonationCard />

        {/* ── SIGN OUT ──────────────────────────────────────────── */}
        <Animated.View entering={ENTER_SIGNOUT}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.danger + "30", backgroundColor: colors.dangerDim, opacity: pressed ? 0.8 : 1 },
            ]}
            hitSlop={4}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* ── MODALS ── */}
      <PhotoModal
        visible={photoModalOpen}
        onCamera={onCamera}
        onGallery={onGallery}
        onRemove={handleRemovePhoto}
        hasPhoto={!!photoURL && photoURL.includes("firebasestorage")}
        onClose={closePhotoModal}
      />
      <NotificationsModal
        visible={notifOpen}
        notifications={notifications}
        markingRead={markingRead}
        onClose={closeNotifModal}
        onClearAll={handleClearNotifications}
      />
    </View>
  );
}

export default React.memo(ProfileScreen);
