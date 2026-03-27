import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { formatCompactNumber } from "@/lib/number-format";
import PhotoModal from "@/features/profile/components/PhotoModal";
import { useProfile } from "@/hooks/useProfile";
import {
  updateBio,
  getUserBio,
  getFriendsLeaderboard,
} from "@/lib/services/user-service";
import { getFriends } from "@/lib/services/friend-service";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    user,
    editingName, setEditingName, newName, setNewName, savingName,
    stats, statsLoading,
    photoURL, photoModalOpen, setPhotoModalOpen, uploadingPhoto,
    myQrCodes, myQrLoading,
    currentUsername,
    initials,
    handleSaveName, handlePickPhoto, handleSignOut,
  } = useProfile();

  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;
  const { width } = useWindowDimensions();
  const styles = makeStyles(colors, width);

  useEffect(() => {
    if (!user) return;
    getUserBio(user.id).then(setBio).catch(() => {});
    getFriends(user.id).then((f) => setFriendsCount(f.length)).catch(() => {});
  }, [user?.id]);

  async function handleSaveBio() {
    if (!user) return;
    setSavingBio(true);
    try {
      await updateBio(user.id, newBio);
      setBio(newBio.trim().slice(0, 150));
      setEditingBio(false);
    } catch {
      Alert.alert("Error", "Could not update bio.");
    } finally {
      setSavingBio(false);
    }
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.guestWrap}>
          <Animated.View entering={FadeInUp.duration(500)} style={styles.guestInner}>
            <View style={[styles.guestIconRing, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="person-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]} maxFontSizeMultiplier={1}>You're not signed in</Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>
              Sign in to view your profile, stats, and activity
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [styles.guestSignInBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.primaryText} />
              <Text style={[styles.guestSignInText, { color: colors.primaryText }]} maxFontSizeMultiplier={1}>Sign In</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(auth)/register")} style={styles.guestRegBtn}>
              <Text style={[styles.guestRegText, { color: colors.primary }]} maxFontSizeMultiplier={1}>Create Account</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        {/* ── HERO BANNER ── */}
        <Animated.View entering={FadeInDown.duration(450)} style={[styles.heroBanner, { backgroundColor: colors.surface }]}>
          <View style={[styles.heroBannerBorder, { borderColor: colors.primary + "22" }]} />

          <View style={styles.bannerTopRow}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => router.push("/privacy-settings" as any)}
              style={[styles.settingsBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}
            >
              <Ionicons name="shield-outline" size={18} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings" as any)}
              style={[styles.settingsBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, marginLeft: 8 }]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Avatar */}
          <View style={styles.avatarArea}>
            <Pressable onPress={() => setPhotoModalOpen(true)} style={styles.avatarPressable}>
              <View style={[styles.avatarGradientRing, { backgroundColor: colors.primary }]}>
                <View style={[styles.avatarInner, { backgroundColor: colors.surface }]}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : photoURL ? (
                    <Image source={{ uri: photoURL }} style={styles.avatarPhoto} />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: colors.primary }]} maxFontSizeMultiplier={1}>{initials}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.cameraBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={12} color={colors.primaryText} />
              </View>
            </Pressable>

            {/* Name */}
            {editingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: colors.inputBackground, borderColor: colors.primary, color: colors.text }]}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  maxLength={40}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <Pressable onPress={handleSaveName} disabled={savingName} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  {savingName
                    ? <ActivityIndicator size="small" color={colors.primaryText} />
                    : <Text style={[styles.saveBtnText, { color: colors.primaryText }]} maxFontSizeMultiplier={1}>Save</Text>
                  }
                </Pressable>
                <Pressable onPress={() => { setEditingName(false); setNewName(user.displayName); }} style={styles.cancelBtn}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => { setEditingName(true); setNewName(user.displayName); }}
                style={styles.nameRow}
              >
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                  {user.displayName}
                </Text>
                <View style={[styles.editPencil, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons name="pencil" size={11} color={colors.primary} />
                </View>
              </Pressable>
            )}

            {currentUsername ? (
              <Text style={[styles.usernameText, { color: colors.primary }]} maxFontSizeMultiplier={1}>@{currentUsername}</Text>
            ) : null}

            {/* Bio */}
            {editingBio ? (
              <View style={styles.bioEditWrap}>
                <TextInput
                  style={[styles.bioInput, { backgroundColor: colors.inputBackground, borderColor: colors.primary, color: colors.text }]}
                  value={newBio}
                  onChangeText={setNewBio}
                  placeholder="Tell people about yourself…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={150}
                  autoFocus
                />
                <View style={styles.bioEditActions}>
                  <Text style={[styles.bioCharCount, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>{newBio.length}/150</Text>
                  <Pressable onPress={() => { setEditingBio(false); setNewBio(bio); }} style={styles.cancelBtn}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                  <Pressable onPress={handleSaveBio} disabled={savingBio} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                    {savingBio
                      ? <ActivityIndicator size="small" color={colors.primaryText} />
                      : <Text style={[styles.saveBtnText, { color: colors.primaryText }]} maxFontSizeMultiplier={1}>Save</Text>
                    }
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => { setNewBio(bio); setEditingBio(true); }} style={styles.bioRow}>
                {bio ? (
                  <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2} maxFontSizeMultiplier={1}>{bio}</Text>
                ) : (
                  <Text style={[styles.bioPlaceholder, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Add a bio…</Text>
                )}
                <View style={[styles.editPencil, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons name="pencil" size={11} color={colors.primary} />
                </View>
              </Pressable>
            )}

            <Text style={[styles.emailText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
              {user.email}
            </Text>
          </View>

          {/* View Public Profile button */}
          {currentUsername && (
            <Pressable
              onPress={() => router.push(`/profile/${currentUsername}` as any)}
              style={({ pressed }) => [
                styles.viewPublicBtn,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
              <Text style={[styles.viewPublicText, { color: colors.primary }]} maxFontSizeMultiplier={1}>View My Public Profile</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          )}
        </Animated.View>

        {/* ── STATS ROW ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(80)}>
          <View style={styles.statsRow}>
            {[
              { label: "Friends", value: friendsCount, icon: "people" as const, color: colors.safe, bg: colors.safeDim, onPress: () => router.push("/friends" as any) },
              { label: "My Scans", value: stats.scanCount, icon: "scan-outline" as const, color: colors.accent, bg: colors.accentDim, onPress: undefined },
              { label: "Following", value: stats.followingCount, icon: "notifications" as const, color: colors.primary, bg: colors.primaryDim, onPress: undefined },
            ].map((s) => (
              <Pressable
                key={s.label}
                onPress={s.onPress}
                style={({ pressed }) => [
                  styles.statCard,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed && s.onPress ? 0.8 : 1 },
                ]}
              >
                <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={14} color={s.color} />
                </View>
                {statsLoading
                  ? <SkeletonBox width={36} height={22} borderRadius={6} style={{ alignSelf: "center" }} />
                  : <Text style={[styles.statValue, { color: s.color }]} maxFontSizeMultiplier={1}>{formatCompactNumber(s.value)}</Text>
                }
                <Text style={[styles.statLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── LIKES CARD ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(140)}>
          <View style={[styles.likesCard, { backgroundColor: colors.surface, borderColor: colors.safeDim }]}>
            <View style={[styles.likesIconWrap, { backgroundColor: colors.safeDim }]}>
              <Ionicons name="thumbs-up" size={20} color={colors.safe} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.likesTitle, { color: colors.text }]} maxFontSizeMultiplier={1}>Total Likes Received</Text>
              <Text style={[styles.likesSub, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>From your comments</Text>
            </View>
            {statsLoading
              ? <SkeletonBox width={44} height={26} borderRadius={8} />
              : <Text style={[styles.likesValue, { color: colors.safe }]} maxFontSizeMultiplier={1}>{formatCompactNumber(stats.totalLikesReceived)}</Text>
            }
          </View>
        </Animated.View>

        {/* ── MY QR CODES + FAVORITES ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(170)}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Library</Text>
          <View style={styles.linksGroup}>
            {[
              {
                icon: <MaterialCommunityIcons name="qrcode-edit" size={20} color={colors.primary} />,
                bg: colors.primaryDim,
                title: "My QR Codes",
                sub: myQrLoading ? "Loading…" : `${myQrCodes.length} code${myQrCodes.length !== 1 ? "s" : ""} — Individual & Business`,
                onPress: () => router.push("/my-qr-codes" as any),
                accent: colors.primary,
              },
              {
                icon: <Ionicons name="heart" size={20} color={colors.danger} />,
                bg: colors.dangerDim,
                title: "Favorites",
                sub: "QR codes you've saved",
                onPress: () => router.push("/favorites" as any),
                accent: colors.danger,
              },
              {
                icon: <Ionicons name="shield-checkmark" size={20} color={colors.accent} />,
                bg: colors.accentDim,
                title: "Privacy & Settings",
                sub: "Manage who sees your profile",
                onPress: () => router.push("/privacy-settings" as any),
                accent: colors.accent,
              },
            ].map((item, idx) => (
              <Pressable
                key={idx}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.linkCard,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.982 : 1 }] },
                ]}
              >
                <View style={[styles.linkIcon, { backgroundColor: item.bg }]}>{item.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.linkTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.linkSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                </View>
                <View style={[styles.linkChevron, { backgroundColor: item.accent + "18" }]}>
                  <Ionicons name="chevron-forward" size={14} color={item.accent} />
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── SIGN OUT ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(270)}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.danger + "40", backgroundColor: colors.dangerDim, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.signOutGradient}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
            </View>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <PhotoModal
        visible={photoModalOpen}
        onCamera={() => handlePickPhoto("camera")}
        onGallery={() => handlePickPhoto("gallery")}
        onClose={() => setPhotoModalOpen(false)}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"], width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: 18, paddingTop: 0 },

    guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    guestInner: { alignItems: "center", gap: 14, width: "100%" },
    guestIconRing: {
      width: 100, height: 100, borderRadius: 50,
      alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    guestTitle: { fontSize: rf(22), fontFamily: "Inter_700Bold", textAlign: "center" },
    guestSub: { fontSize: rf(14), fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: Math.round(20 * s) },
    guestSignInBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingVertical: 15, paddingHorizontal: 40, borderRadius: 18, marginTop: 8, width: "100%", justifyContent: "center",
    },
    guestSignInText: { fontSize: rf(16), fontFamily: "Inter_700Bold" },
    guestRegBtn: { paddingVertical: 12, paddingHorizontal: 24 },
    guestRegText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold" },

    heroBanner: {
      borderRadius: 24, overflow: "hidden",
      marginHorizontal: -18, marginBottom: 20,
      paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24,
    },
    heroBannerBorder: {
      position: "absolute", inset: 0, borderBottomWidth: 1,
    } as any,
    bannerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    settingsBtn: {
      width: 36, height: 36, borderRadius: 12,
      alignItems: "center", justifyContent: "center", borderWidth: 1,
    },

    avatarArea: { alignItems: "center", gap: 6 },
    avatarPressable: { position: "relative", marginBottom: 4 },
    avatarGradientRing: {
      width: 90, height: 90, borderRadius: 45,
      padding: 2.5, alignItems: "center", justifyContent: "center",
    },
    avatarInner: {
      width: 85, height: 85, borderRadius: 42.5,
      alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    avatarPhoto: { width: 85, height: 85, borderRadius: 42.5 },
    avatarInitials: { fontSize: rf(32), fontFamily: "Inter_700Bold" },
    cameraBtn: {
      position: "absolute", bottom: 2, right: 2,
      width: 26, height: 26, borderRadius: 13,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: c.background,
    },

    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    displayName: { fontSize: rf(22), fontFamily: "Inter_700Bold", flexShrink: 1 },
    editPencil: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    usernameText: { fontSize: rf(13), fontFamily: "Inter_500Medium" },
    emailText: { fontSize: rf(12), fontFamily: "Inter_400Regular" },
    editNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    nameInput: {
      flex: 1, fontSize: rf(15), fontFamily: "Inter_600SemiBold",
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
      borderWidth: 1,
    },
    saveBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, flexShrink: 0 },
    saveBtnText: { fontSize: rf(13), fontFamily: "Inter_700Bold" },
    cancelBtn: { padding: 6 },

    bioRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
    bioText: { flex: 1, fontSize: rf(13), fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
    bioPlaceholder: { flex: 1, fontSize: rf(12), fontFamily: "Inter_400Regular", textAlign: "center", fontStyle: "italic" },
    bioEditWrap: { width: "100%", gap: 8 },
    bioInput: {
      fontSize: rf(13), fontFamily: "Inter_400Regular",
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
      borderWidth: 1, minHeight: 68, textAlignVertical: "top",
    },
    bioEditActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    bioCharCount: { flex: 1, fontSize: rf(12), fontFamily: "Inter_400Regular" },

    viewPublicBtn: {
      flexDirection: "row", alignItems: "center", gap: 10,
      marginTop: 16, paddingVertical: 12, paddingHorizontal: 16,
      borderRadius: 16, borderWidth: 1,
    },
    viewPublicText: { flex: 1, fontSize: rf(14), fontFamily: "Inter_600SemiBold" },

    statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
    statCard: {
      flex: 1, borderRadius: 18, padding: 14, alignItems: "center",
      borderWidth: 1, gap: 4, overflow: "hidden",
    },
    statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: rf(22), fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: rf(12), fontFamily: "Inter_400Regular", textAlign: "center" },

    likesCard: {
      flexDirection: "row", alignItems: "center", gap: 14,
      borderRadius: 18, padding: 16, marginBottom: 22,
      borderWidth: 1, overflow: "hidden",
    },
    likesIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    likesTitle: { fontSize: rf(14), fontFamily: "Inter_600SemiBold" },
    likesSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginTop: 1 },
    likesValue: { fontSize: rf(28), fontFamily: "Inter_700Bold" },

    sectionLabel: {
      fontSize: rf(11), fontFamily: "Inter_700Bold",
      textTransform: "uppercase", letterSpacing: 1.4,
      marginBottom: 10, marginTop: 2,
    },
    linksGroup: { gap: 8, marginBottom: 22 },
    linkCard: {
      flexDirection: "row", alignItems: "center", gap: 14,
      borderRadius: 18, padding: 14, borderWidth: 1,
    },
    linkIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    linkTitle: { fontSize: rf(15), fontFamily: "Inter_600SemiBold" },
    linkSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginTop: 2 },
    linkChevron: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },

    privacyCard: {
      borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 22,
    },
    privacyCardHeader: {
      flexDirection: "row", alignItems: "center", gap: 12,
      padding: 16, borderBottomWidth: 1,
    },
    privacyCardIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    privacyCardTitle: { fontSize: rf(14), fontFamily: "Inter_700Bold" },
    privacyCardSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginTop: 1 },
    privacyRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    privacyRowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    privacyRowLabel: { fontSize: rf(14), fontFamily: "Inter_600SemiBold" },
    privacyRowSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginTop: 1 },
    privacyDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

    infoCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 22 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    infoIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    infoLabel: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginBottom: 2 },
    infoValue: { fontSize: rf(14), fontFamily: "Inter_600SemiBold" },
    infoEditBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    infoDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
    verifiedChip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100,
    },
    verifiedText: { fontSize: rf(12), fontFamily: "Inter_600SemiBold" },

    signOutBtn: { borderRadius: 18, overflow: "hidden", borderWidth: 1, marginBottom: 8 },
    signOutGradient: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, justifyContent: "center" },
    signOutText: { fontSize: rf(15), fontFamily: "Inter_700Bold" },
  });
}
