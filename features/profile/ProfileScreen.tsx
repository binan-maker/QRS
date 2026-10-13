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
import { getUserRewardWallet, type RewardWallet } from "@/services/referrals";
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
        {/* ── TOP BAR (Three dots removed, settings preserved) ── */}
        <Animated.View entering={ENTER_TOP_BAR} style={styles.topBar}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.topBarActions}>
            <Animated.View entering={ENTER_SETTINGS_BTN}>
              <Pressable
                onPress={goToSettings}
                style={[
                  styles.iconBtn,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
                hitSlop={8}
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={18} color={colors.text} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ── IDENTITY SECTION (Seamless background, no white/surface card box) ── */}
        <Animated.View
          entering={ENTER_AVATAR_SEC}
          style={styles.heroSection}
        >
          <View style={styles.avatarContainer}>
            <Pressable
              onPress={openPhotoModal}
              style={styles.avatarPressable}
              accessibilityLabel="Change profile photo"
            >
              <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
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
                    <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                      {initials}
                    </Text>
                  )}
                  {uploadingPhoto && (
                    <View style={styles.avatarUploadOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
              </View>
              <View
                style={[
                  styles.cameraBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={14} color={colors.text} />
              </View>
            </Pressable>
          </View>

          <View style={styles.identityMeta}>
            <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
              {user.displayName || "User"}
            </Text>
            {currentUsername ? (
              <View style={styles.identitySubRow}>
                <Text style={[styles.usernameText, { color: colors.primary }]}>
                  @{currentUsername}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Edit Profile Quick Action */}
          <View style={styles.heroActions}>
            <Pressable
              onPress={goToEditProfile}
              style={({ pressed }) => [
                styles.heroActionBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
            >
              <Ionicons name="create-outline" size={14} color={colors.text} />
              <Text style={[styles.heroActionText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── SEPARATE BUTTONS / TILES (No "Activity & Rewards" heading, distinct cards) ── */}
        <Animated.View entering={ENTER_EDIT_BTN} style={styles.actionsList}>
          {/* 1. Scan History */}
          <Pressable
            onPress={goToHistory}
            style={({ pressed }) => [
              styles.separateCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Scan History"
          >
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: colors.surfaceLight },
              ]}
            >
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Scan History
              </Text>
              <Text style={[styles.menuSublabel, { color: colors.textSecondary }]}>
                Past scans and verdicts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {/* 2. Referral */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              safePush("/referrals");
            }}
            style={({ pressed }) => [
              styles.separateCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Referral"
          >
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: colors.surfaceLight },
              ]}
            >
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Referral
              </Text>
              <Text style={[styles.menuSublabel, { color: colors.textSecondary }]}>
                Invite friends & share safety
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {/* ── SIGN OUT (Matches website) ────────────────────────── */}
        <Animated.View entering={ENTER_SIGNOUT}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              {
                borderColor: colors.surfaceBorder,
                backgroundColor: pressed ? `${colors.danger}15` : colors.surface,
              },
            ]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Sign Out"
          >
            <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.signOutText, { color: colors.textSecondary }]}>Sign Out</Text>
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
