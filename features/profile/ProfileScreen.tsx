import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { safePush } from "@/lib/utils/navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { formatCompactNumber } from "@/lib/number-format";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { useAvatar } from "@/contexts/AvatarContext";
import { useNotifications } from "@/components/notifications/hooks/useNotifications";
import PhotoModal from "@/features/profile/components/PhotoModal";
import GuestView from "@/features/profile/components/GuestView";
import QrPreviewCard from "@/features/profile/components/QrPreviewCard";
import NotificationsModal from "@/components/notifications/NotificationsModal";
import { styles } from "@/features/profile/styles";

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

  const topInset = useTopInset();
  const tabBarHeight = 60 + insets.bottom;

  // ── Derived data ──────────────────────────────────────────────────────────

  const previewQrs = useMemo(() => myQrCodes.slice(0, 3), [myQrCodes]);
  const totalQrScans = useMemo(
    () => myQrCodes.reduce((sum, qr) => sum + (qr.scanCount || 0), 0),
    [myQrCodes],
  );

  const formattedStats = useMemo(() => [
    { label: "QR Hits",   value: totalQrScans,        color: colors.accent,  loading: myQrLoading,   formatted: formatCompactNumber(totalQrScans) },
    { label: "Following", value: stats.followingCount ?? 0, color: colors.primary, loading: statsLoading,  formatted: formatCompactNumber(stats.followingCount ?? 0) },
  ], [totalQrScans, myQrLoading, stats.followingCount, statsLoading, colors.accent, colors.primary]);

  // ── Stable callbacks ──────────────────────────────────────────────────────

  const openPhotoModal  = useCallback(() => setPhotoModalOpen(true),  [setPhotoModalOpen]);
  const closePhotoModal = useCallback(() => setPhotoModalOpen(false), [setPhotoModalOpen]);
  const closeNotifModal = useCallback(() => setNotifOpen(false),      [setNotifOpen]);
  const onCamera        = useCallback(() => handlePickPhoto("camera"),  [handlePickPhoto]);
  const onGallery       = useCallback(() => handlePickPhoto("gallery"), [handlePickPhoto]);

  const goToSettings    = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { from: "profile" } }), []);
  const goToEditProfile = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { initialSection: "profile", fromProfile: "1" } }), []);
  const goToLogin       = useCallback(() => safePush("/(auth)/login"),         []);
  const goToRegister    = useCallback(() => safePush("/(auth)/register"),      []);
  const goToMyQrCodes   = useCallback(() => safePush("/my-qr-codes"),          []);
  const goToGenerator   = useCallback(() => safePush("/(tabs)/qr-generator"),  []);

  // ── Guest view ────────────────────────────────────────────────────────────

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

  // ── Authenticated view ────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 60 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── TOP BAR ── */}
        <View style={styles.topBar}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.topBarActions}>
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
                <View style={[styles.notifDot, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                  <Text style={[styles.notifDotText, { color: "#fff" }]}>
                    {notifCount > 9 ? "9+" : notifCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={goToSettings}
              style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={17} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ── AVATAR + IDENTITY ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.avatarSection}>
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

          <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
            {user.displayName}
          </Text>
          {currentUsername ? (
            <Text style={[styles.usernameText, { color: colors.primary }]}>@{currentUsername}</Text>
          ) : null}
          {bio ? (
            <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2}>{bio}</Text>
          ) : (
            <Pressable onPress={goToEditProfile} hitSlop={8}>
              <Text style={[styles.bioHint, { color: colors.textMuted }]}>+ Add a bio</Text>
            </Pressable>
          )}
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

        {/* ── STATS GRID ── */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(60)}
          style={[styles.statsGrid, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          {formattedStats.map((s, i) => (
            <View
              key={s.label}
              style={[
                styles.statCell,
                i % 2 === 0 && { borderRightWidth: 1, borderRightColor: colors.surfaceBorder },
              ]}
            >
              {s.loading
                ? <SkeletonBox width={28} height={16} borderRadius={5} />
                : <Text style={[styles.statValue, { color: s.color }]}>{s.formatted}</Text>
              }
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── MY QR CODES ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.section}>
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
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <SkeletonBox width={52} height={52} borderRadius={10} />
                  <SkeletonBox width={50} height={10} borderRadius={4} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          ) : previewQrs.length === 0 ? (
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
          ) : (
            <View style={styles.qrRow}>
              {previewQrs.map((qr) => (
                <QrPreviewCard key={qr.docId} qr={qr} colors={colors} />
              ))}
              {myQrCodes.length > 3 && (
                <Pressable
                  onPress={goToMyQrCodes}
                  style={({ pressed }) => [
                    styles.qrCard, styles.qrCardMore,
                    { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30", opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.qrMoreCount, { color: colors.primary }]}>+{myQrCodes.length - 3}</Text>
                  <Text style={[styles.qrMoreLabel, { color: colors.primary }]}>more</Text>
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── SUPPORT QR GUARD ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(120)}>
          <Pressable
            onPress={() => safePush("/donation")}
            style={({ pressed }) => [styles.donationBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={["#6D28D9", "#7C3AED", "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.donationGrad}
            >
              <View style={styles.donationTopRow}>
                <View style={styles.donationHeartRow}>
                  <View style={styles.donationIconWrap}>
                    <Ionicons name="heart" size={16} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.donationTitle}>Support QR Guard</Text>
                    <Text style={styles.donationSub}>Help keep the app free &amp; secure</Text>
                  </View>
                </View>
                <View style={styles.donationArrow}>
                  <Ionicons name="arrow-forward" size={15} color="#fff" />
                </View>
              </View>
              <View style={styles.donationPillRow}>
                {["₹10", "₹50", "₹100"].map((amt) => (
                  <View key={amt} style={styles.donationPill}>
                    <Text style={styles.donationPillText}>{amt}</Text>
                  </View>
                ))}
                <View style={[styles.donationPill, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                  <Text style={styles.donationPillText}>via Play Store ›</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── SIGN OUT ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)}>
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
