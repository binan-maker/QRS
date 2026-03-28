import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { formatCompactNumber } from "@/lib/number-format";
import PhotoModal from "@/features/profile/components/PhotoModal";
import { useProfile } from "@/hooks/useProfile";
import { getUserBio } from "@/lib/services/user-service";
import { getFriends } from "@/lib/services/friend-service";
import QRCode from "react-native-qrcode-svg";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    user,
    stats, statsLoading,
    photoURL, photoModalOpen, setPhotoModalOpen, uploadingPhoto,
    myQrCodes, myQrLoading,
    currentUsername,
    initials,
    handlePickPhoto, handleSignOut,
  } = useProfile();

  const [bio, setBio] = useState("");
  const [friendsCount, setFriendsCount] = useState(0);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;

  useEffect(() => {
    if (!user) return;
    getUserBio(user.id).then(setBio).catch(() => {});
    getFriends(user.id).then((f) => setFriendsCount(f.length)).catch(() => {});
  }, [user?.id]);

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={styles.guestWrap}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.guestInner}>
            <View style={[styles.guestIconRing, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="person-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>Not signed in</Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
              Sign in to view your profile and activity
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [styles.guestSignInBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
            >
              <Text style={[styles.guestSignInText, { color: colors.primaryText }]}>Sign In</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(auth)/register")} style={styles.guestRegBtn}>
              <Text style={[styles.guestRegText, { color: colors.primary }]}>Create Account</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  const previewQrs = myQrCodes.slice(0, 3);

  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        {/* ── TOP BAR ── */}
        <View style={styles.topBar}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/settings" as any)}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          >
            <Ionicons name="settings-outline" size={17} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── AVATAR + IDENTITY ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.avatarSection}>
          <Pressable onPress={() => setPhotoModalOpen(true)} style={styles.avatarPressable}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + "50" }]}>
              <View style={[styles.avatarInner, { backgroundColor: colors.surfaceLight }]}>
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.primary} />
                ) : photoURL ? (
                  <Image source={{ uri: photoURL }} style={styles.avatarPhoto} />
                ) : (
                  <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                )}
              </View>
            </View>
            <View style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="camera" size={11} color={colors.primaryText} />
            </View>
          </Pressable>

          <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>{user.displayName}</Text>
          {currentUsername ? (
            <Text style={[styles.usernameText, { color: colors.primary }]}>@{currentUsername}</Text>
          ) : null}
          {bio ? (
            <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2}>{bio}</Text>
          ) : null}

          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/settings" as any, params: { initialSection: "profile" } })}
            style={({ pressed }) => [styles.editProfileBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={[styles.editProfileText, { color: colors.text }]}>Edit Profile</Text>
          </Pressable>
        </Animated.View>

        {/* ── STATS ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {[
            { label: "Friends", value: friendsCount, color: colors.safe },
            { label: "Scans", value: stats.scanCount, color: colors.accent },
            { label: "Following", value: stats.followingCount, color: colors.primary },
          ].map((s, i) => (
            <View key={s.label} style={[styles.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: colors.surfaceBorder }]}>
              {statsLoading
                ? <SkeletonBox width={32} height={18} borderRadius={5} />
                : <Text style={[styles.statValue, { color: s.color }]}>{formatCompactNumber(s.value)}</Text>
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
              onPress={() => router.push("/my-qr-codes" as any)}
              style={({ pressed }) => [styles.seeAllBtn, { opacity: pressed ? 0.7 : 1 }]}
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
              onPress={() => router.push("/(tabs)/qr-generator")}
              style={({ pressed }) => [styles.emptyQrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialCommunityIcons name="qrcode-plus" size={22} color={colors.textMuted} />
              <Text style={[styles.emptyQrText, { color: colors.textMuted }]}>No QR codes yet — create one</Text>
            </Pressable>
          ) : (
            <View style={styles.qrRow}>
              {previewQrs.map((qr) => (
                <Pressable
                  key={qr.docId}
                  onPress={() => router.push(`/my-qr/${qr.docId}` as any)}
                  style={({ pressed }) => [
                    styles.qrCard,
                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.qrCodeWrap, { backgroundColor: qr.bgColor || "#F8FAFC" }]}>
                    <QRCode
                      value={qr.content || "https://qrguard.app"}
                      size={52}
                      color={qr.fgColor || "#0A0E17"}
                      backgroundColor={qr.bgColor || "#F8FAFC"}
                      quietZone={3}
                      ecl="L"
                    />
                  </View>
                  <Text style={[styles.qrCardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {qr.businessName || (qr.content.length > 14 ? qr.content.slice(0, 14) + "…" : qr.content)}
                  </Text>
                </Pressable>
              ))}
              {myQrCodes.length > 3 && (
                <Pressable
                  onPress={() => router.push("/my-qr-codes" as any)}
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

        {/* ── PEOPLE ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>People</Text>
          <View style={styles.peopleRow}>
            <Pressable
              onPress={() => router.push("/friends" as any)}
              style={({ pressed }) => [styles.peopleCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.82 : 1 }]}
            >
              <View style={[styles.peopleIconWrap, { backgroundColor: colors.safeDim }]}>
                <Ionicons name="people" size={20} color={colors.safe} />
              </View>
              <Text style={[styles.peopleCardCount, { color: colors.text }]}>{friendsCount}</Text>
              <Text style={[styles.peopleCardLabel, { color: colors.textMuted }]}>Friends</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/search" as any)}
              style={({ pressed }) => [styles.peopleCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.82 : 1 }]}
            >
              <View style={[styles.peopleIconWrap, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="person-add" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.peopleCardCount, { color: colors.text }]}>Find</Text>
              <Text style={[styles.peopleCardLabel, { color: colors.textMuted }]}>People</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── SIGN OUT ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.danger + "30", backgroundColor: colors.dangerDim, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  guestInner: { alignItems: "center", gap: 12, width: "100%" },
  guestIconRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  guestTitle: { fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  guestSignInBtn: {
    paddingVertical: 13, paddingHorizontal: 40, borderRadius: 14,
    marginTop: 6, width: "100%", alignItems: "center",
  },
  guestSignInText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  guestRegBtn: { paddingVertical: 10 },
  guestRegText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  topBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 24, marginTop: 4,
  },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },

  avatarSection: { alignItems: "center", gap: 6, marginBottom: 22 },
  avatarPressable: { position: "relative", marginBottom: 6 },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 2, padding: 3,
    alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarPhoto: { width: 76, height: 76, borderRadius: 38 },
  avatarInitials: { fontSize: 26, fontFamily: "Inter_700Bold" },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },

  displayName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  usernameText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bioText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, paddingHorizontal: 24 },

  editProfileBtn: {
    marginTop: 6, paddingHorizontal: 22, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  editProfileText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  statsRow: {
    flexDirection: "row", borderRadius: 18, borderWidth: 1,
    marginBottom: 22, overflow: "hidden",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 3 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  qrRow: { flexDirection: "row", gap: 10 },
  qrCard: {
    flex: 1, borderRadius: 14, padding: 12, borderWidth: 1,
    alignItems: "center", gap: 8,
  },
  qrCardMore: { justifyContent: "center" },
  qrCodeWrap: { borderRadius: 10, padding: 4, overflow: "hidden" },
  qrCardLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  qrMoreCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  qrMoreLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  emptyQrCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: 16, borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyQrText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  peopleRow: { flexDirection: "row", gap: 12 },
  peopleCard: {
    flex: 1, borderRadius: 18, borderWidth: 1,
    paddingVertical: 18, alignItems: "center", gap: 6,
  },
  peopleIconWrap: {
    width: 46, height: 46, borderRadius: 15,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  peopleCardCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  peopleCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 13, borderWidth: 1,
  },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
