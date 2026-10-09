import React, { useCallback, memo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { safePush } from "@/shared/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { useFocusEffect } from "expo-router";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import PhotoModal from "@/features/profile/components/PhotoModal";
import ImageCropModal from "@/features/profile/components/ImageCropModal";
import GuestView from "@/features/profile/components/GuestView";
import ReferralModal from "@/features/profile/components/ReferralModal";
import { getUserRewardWallet, type RewardWallet } from "@/services/rewards";
import { styles } from "@/features/profile/styles";

// ── Module-level animation presets (created once, not per render) ──────────────
const ENTER_TOP_BAR      = FadeInDown.delay(0).duration(260);
const ENTER_SETTINGS_BTN = FadeIn.delay(40).duration(250);
const ENTER_AVATAR_SEC   = FadeInDown.delay(30).duration(260);
const ENTER_AVATAR_WRAP  = FadeIn.delay(40).duration(240);
const ENTER_NAME         = FadeInDown.delay(50).duration(260);
const ENTER_USERNAME     = FadeInDown.delay(60).duration(260);
const ENTER_EDIT_BTN     = FadeInDown.delay(80).duration(260);
const ENTER_SIGNOUT      = FadeInDown.delay(100).duration(260);

// ── Main screen ───────────────────────────────────────────────────────────────
function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    user,
    photoModalOpen, setPhotoModalOpen, uploadingPhoto,
    cropModalOpen, pendingImageUri, handleCropConfirm, handleCropCancel,
    currentUsername,
    initials,
    refreshing, handleRefresh,
    handlePickPhoto, handleRemovePhoto, handleSignOut,
    canRemovePhoto, hasGooglePhoto,
  } = useProfile();
  const { cachedUrl: photoURL } = useAvatar();
  // Pull auth loading state so we never flash GuestView during the initial
  // Supabase token resolve on cold start.  When isLoading is true we render
  // a transparent placeholder — the same background colour as the screen —
  // so the user sees a blank canvas rather than "Not signed in" briefly
  // followed by their profile with all animations firing from opacity:0.
  const { isLoading: authLoading } = useAuth();

  const topInset     = useTopInset();
  const tabBarHeight = 60 + insets.bottom;
  const { onTabScroll, resetTabBar } = useTabBarScroll();

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
    }, [resetTabBar])
  );

  // ── Navigation callbacks MUST be declared before any useMemo that
  // references them, otherwise the first render sees undefined and triggers
  // an extra re-render when the useCallback result is finally assigned. ──────
  const goToSettings    = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { from: "profile" } }), []);
  const goToEditProfile = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { initialSection: "profile", fromProfile: "1" } }), []);
  const goToHistory     = useCallback(() => safePush("/(tabs)/history"), []);
  const goToLogin       = useCallback(() => safePush("/(auth)/login"),        []);
  const goToRegister    = useCallback(() => safePush("/(auth)/register"),     []);

  const openPhotoModal  = useCallback(() => setPhotoModalOpen(true),  [setPhotoModalOpen]);
  const closePhotoModal = useCallback(() => setPhotoModalOpen(false), [setPhotoModalOpen]);
  const onCamera        = useCallback(() => handlePickPhoto("camera"),  [handlePickPhoto]);
  const onGallery       = useCallback(() => handlePickPhoto("gallery"), [handlePickPhoto]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [rewardWallet, setRewardWallet] = useState<RewardWallet | null>(null);

  const loadWallet = useCallback(async () => {
    if (user?.id) {
      try {
        const w = await getUserRewardWallet(user.id);
        setRewardWallet(w);
      } catch {}
    }
  }, [user?.id]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet])
  );

  // While Supabase is resolving the auth state on cold start, show a plain
  // background instead of GuestView.  This prevents the mount/unmount cycle
  // of GuestView → full profile that causes every Animated.View entering
  // animation to fire from opacity:0, creating the "blank screen" flash.
  if (authLoading) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

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
            {/* Google Pay Style Three Dots (⋮) Menu Button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMenuOpen((prev) => !prev);
              }}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
              hitSlop={8}
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-vertical" size={17} color={colors.textSecondary} />
            </Pressable>

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

        {/* Google Pay Style Dropdown Popover */}
        {menuOpen && (
          <View
            style={{
              position: "absolute",
              top: topInset + 46,
              right: 18,
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              borderWidth: 1,
              borderRadius: 16,
              padding: 6,
              minWidth: 200,
              zIndex: 9999,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 10,
            }}
          >
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setReferralModalOpen(true);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pressed ? `${colors.primary}15` : "transparent",
              })}
            >
              <Ionicons name="gift-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                  Referral code
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {rewardWallet?.isReferralEligible
                    ? "Enter code"
                    : rewardWallet?.referredByCode
                      ? "Applied"
                      : "Window closed"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                safePush("/(tabs)/rewards");
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pressed ? `${colors.primary}15` : "transparent",
              })}
            >
              <Ionicons name="sparkles-outline" size={18} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                Rewards &amp; Offers
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                goToSettings();
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pressed ? `${colors.primary}15` : "transparent",
              })}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                Settings
              </Text>
            </Pressable>
          </View>
        )}

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
                      transition={200}
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

        {/* ── HISTORY ────────────────────────────────────────────── */}
        <View style={styles.profileActions}>
          <Pressable
            onPress={goToHistory}
            accessibilityRole="button"
            accessibilityLabel="History"
            style={({ pressed }) => [
              styles.profileActionBtn,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <View style={[styles.profileActionIcon, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="time-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.profileActionLabel, { color: colors.text }]} numberOfLines={1}>History</Text>
              <Text style={[styles.profileActionSubtext, { color: colors.textMuted }]} numberOfLines={1}>Review or remove scans</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

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
        canRemove={canRemovePhoto}
        hasPhoto={!!photoURL}
        hasGooglePhoto={hasGooglePhoto}
        onClose={closePhotoModal}
        extraBottomPadding={39}
      />
      <ImageCropModal
        visible={cropModalOpen}
        imageUri={pendingImageUri}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
      <ReferralModal
        visible={referralModalOpen}
        onClose={() => setReferralModalOpen(false)}
        userId={user.id}
        wallet={rewardWallet}
        onApplied={() => {
          void loadWallet();
        }}
        colors={colors}
      />
    </View>
  );
}

export default memo(ProfileScreen);
