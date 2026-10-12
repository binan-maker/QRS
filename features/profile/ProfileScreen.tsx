import React, { useCallback, memo } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Animated, { FadeInDown } from "react-native-reanimated";
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
import { styles } from "@/features/profile/styles";

const MENU_ITEMS = [
  { id: "history", icon: "time-outline", label: "Scan History", sub: "Past scans and verdicts", route: "/(tabs)/history", haptic: false },
  { id: "rewards", icon: "gift-outline", label: "Milestones & Rewards", sub: "Daily milestones and deals", route: "/(tabs)/rewards", haptic: false },
  { id: "referrals", icon: "people-outline", label: "Referral", sub: "Invite friends, earn Gold cards", route: "/referrals", haptic: true },
] as const;

function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    user,
    photoModalOpen, setPhotoModalOpen, uploadingPhoto,
    cropModalOpen, pendingImageUri, handleCropConfirm, handleCropCancel,
    currentUsername, initials, refreshing, handleRefresh,
    handlePickPhoto, handleRemovePhoto, handleSignOut,
    canRemovePhoto, hasGooglePhoto,
  } = useProfile();
  const { cachedUrl: photoURL } = useAvatar();
  const { isLoading: authLoading } = useAuth();
  const topInset = useTopInset();
  const tabBarHeight = 60 + insets.bottom;
  const { onTabScroll, resetTabBar } = useTabBarScroll();

  useFocusEffect(useCallback(() => { resetTabBar(); }, [resetTabBar]));

  const openSettings = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { from: "profile" } }), []);
  const openEditProfile = useCallback(() => safePush({ pathname: "/(tabs)/settings" as any, params: { initialSection: "profile", fromProfile: "1" } }), []);

  if (authLoading) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!user) {
    return (
      <GuestView
        colors={colors}
        topInset={topInset}
        onSignIn={() => safePush("/(auth)/login")}
        onRegister={() => safePush("/(auth)/register")}
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
        {/* Top Bar */}
        <Animated.View entering={FadeInDown.duration(260)} style={styles.topBar}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>
          <Pressable
            onPress={openSettings}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            hitSlop={8}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={18} color={colors.text} />
          </Pressable>
        </Animated.View>

        {/* Identity Hero */}
        <Animated.View entering={FadeInDown.delay(30).duration(260)} style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <Pressable onPress={() => setPhotoModalOpen(true)} style={styles.avatarPressable} accessibilityLabel="Change profile photo">
              <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
                <View style={[styles.avatarInner, { backgroundColor: colors.surfaceLight }]}>
                  {photoURL ? (
                    <Image source={{ uri: photoURL }} style={styles.avatarPhoto} cachePolicy="memory-disk" contentFit="cover" transition={200} />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                  )}
                  {uploadingPhoto && (
                    <View style={styles.avatarUploadOverlay}><ActivityIndicator size="small" color="#fff" /></View>
                  )}
                </View>
              </View>
              <View style={[styles.cameraBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="camera-outline" size={14} color={colors.text} />
              </View>
            </Pressable>
          </View>

          <View style={styles.identityMeta}>
            <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>{user.displayName || "User"}</Text>
            {currentUsername ? (
              <View style={styles.identitySubRow}>
                <Text style={[styles.usernameText, { color: colors.primary }]}>@{currentUsername}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroActions}>
            <Pressable
              onPress={openEditProfile}
              style={({ pressed }) => [
                styles.heroActionBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
            >
              <Ionicons name="create-outline" size={14} color={colors.text} />
              <Text style={[styles.heroActionText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Action Cards */}
        <Animated.View entering={FadeInDown.delay(70).duration(260)} style={styles.actionsList}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (item.haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                safePush(item.route as any);
              }}
              style={({ pressed }) => [
                styles.separateCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuSublabel, { color: colors.textSecondary }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.delay(100).duration(260)}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.surfaceBorder, backgroundColor: pressed ? `${colors.danger}15` : colors.surface },
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

      {/* Modals */}
      <PhotoModal
        visible={photoModalOpen}
        onCamera={() => handlePickPhoto("camera")}
        onGallery={() => handlePickPhoto("gallery")}
        onRemove={handleRemovePhoto}
        canRemove={canRemovePhoto}
        hasPhoto={!!photoURL}
        hasGooglePhoto={hasGooglePhoto}
        onClose={() => setPhotoModalOpen(false)}
        extraBottomPadding={39}
      />
      <ImageCropModal
        visible={cropModalOpen}
        imageUri={pendingImageUri}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </View>
  );
}

export default memo(ProfileScreen);
