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
  Alert,
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
import { updateBio, getUserBio } from "@/lib/services/user-service";
import { getFriends } from "@/lib/services/friend-service";
import QRCode from "react-native-qrcode-svg";

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
            onPress={() => router.push("/settings" as any)}
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

          {/* Name */}
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]}
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
                  : <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save</Text>
                }
              </Pressable>
              <Pressable onPress={() => { setEditingName(false); setNewName(user.displayName); }} style={styles.cancelBtn}>
                <Ionicons name="close" size={17} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setEditingName(true); setNewName(user.displayName); }} style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>{user.displayName}</Text>
              <Ionicons name="pencil" size={13} color={colors.textMuted} style={{ marginLeft: 6 }} />
            </Pressable>
          )}

          {currentUsername ? (
            <Text style={[styles.usernameText, { color: colors.primary }]}>@{currentUsername}</Text>
          ) : null}

          {/* Bio */}
          {editingBio ? (
            <View style={[styles.bioEditWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <TextInput
                style={[styles.bioInput, { color: colors.text }]}
                value={newBio}
                onChangeText={setNewBio}
                placeholder="Add a short bio…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={150}
                autoFocus
              />
              <View style={styles.bioEditActions}>
                <Text style={[styles.bioCharCount, { color: colors.textMuted }]}>{newBio.length}/150</Text>
                <Pressable onPress={() => { setEditingBio(false); setNewBio(bio); }}>
                  <Text style={[styles.bioActionText, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSaveBio} disabled={savingBio} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  {savingBio
                    ? <ActivityIndicator size="small" color={colors.primaryText} />
                    : <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save</Text>
                  }
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => { setNewBio(bio); setEditingBio(true); }} style={styles.bioRow}>
              <Text style={[styles.bioText, { color: bio ? colors.textSecondary : colors.textMuted }]}>
                {bio || "Add a bio"}
              </Text>
              <Ionicons name="pencil" size={11} color={colors.textMuted} style={{ marginLeft: 5 }} />
            </Pressable>
          )}
        </Animated.View>

        {/* ── STATS ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.statsRow}>
          {[
            { label: "Friends", value: friendsCount, color: colors.safe, onPress: () => router.push("/friends" as any) },
            { label: "Scans", value: stats.scanCount, color: colors.accent, onPress: undefined },
            { label: "Following", value: stats.followingCount, color: colors.primary, onPress: undefined },
          ].map((s) => (
            <Pressable
              key={s.label}
              onPress={s.onPress}
              style={({ pressed }) => [styles.statItem, { opacity: pressed && s.onPress ? 0.7 : 1 }]}
            >
              {statsLoading
                ? <SkeletonBox width={32} height={18} borderRadius={5} />
                : <Text style={[styles.statValue, { color: s.color }]}>{formatCompactNumber(s.value)}</Text>
              }
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </Pressable>
          ))}
        </Animated.View>

        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

        {/* ── MY QR CODES (inline) ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
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

        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

        {/* ── MENU ITEMS ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.menuGroup}>
          {[
            {
              icon: <Ionicons name="shield-checkmark" size={17} color={colors.accent} />,
              bg: colors.accentDim,
              title: "Privacy",
              sub: "Manage your profile visibility",
              onPress: () => router.push("/privacy-settings" as any),
            },
            {
              icon: <Ionicons name="people-outline" size={17} color={colors.safe} />,
              bg: colors.safeDim,
              title: "Friends",
              sub: `${friendsCount} friend${friendsCount !== 1 ? "s" : ""}`,
              onPress: () => router.push("/friends" as any),
            },
          ].map((item, idx) => (
            <Pressable
              key={idx}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>{item.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
            </Pressable>
          ))}
        </Animated.View>

        {/* ── SIGN OUT ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
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

  avatarSection: { alignItems: "center", gap: 6, marginBottom: 24 },
  avatarPressable: { position: "relative", marginBottom: 6 },
  avatarRing: {
    width: 82, height: 82, borderRadius: 41,
    borderWidth: 2, padding: 3,
    alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 74, height: 74, borderRadius: 37,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarPhoto: { width: 74, height: 74, borderRadius: 37 },
  avatarInitials: { fontSize: 26, fontFamily: "Inter_700Bold" },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },

  nameRow: { flexDirection: "row", alignItems: "center" },
  displayName: { fontSize: 19, fontFamily: "Inter_700Bold" },
  usernameText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  editRow: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  nameInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold",
    borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8,
    borderWidth: 1,
  },
  saveBtn: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  cancelBtn: { padding: 6 },

  bioRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  bioText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 },
  bioEditWrap: {
    width: "100%", borderRadius: 12, borderWidth: 1,
    padding: 12, gap: 8,
  },
  bioInput: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    minHeight: 60, textAlignVertical: "top", lineHeight: 18,
  },
  bioEditActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  bioCharCount: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  bioActionText: { fontSize: 12, fontFamily: "Inter_500Medium", paddingHorizontal: 4 },

  statsRow: {
    flexDirection: "row", justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: { alignItems: "center", gap: 3, flex: 1 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  divider: { height: 1, marginBottom: 20 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  qrRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  qrCard: {
    flex: 1, borderRadius: 14, padding: 12, borderWidth: 1,
    alignItems: "center", gap: 8,
  },
  qrCardMore: {
    justifyContent: "center",
  },
  qrCodeWrap: {
    borderRadius: 10, padding: 4, overflow: "hidden",
  },
  qrCardLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center",
  },
  qrMoreCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  qrMoreLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  emptyQrCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: 16, borderWidth: 1,
    borderStyle: "dashed", marginBottom: 20,
  },
  emptyQrText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  menuGroup: { gap: 8, marginBottom: 24 },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 13, borderWidth: 1,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menuSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 13, borderWidth: 1,
  },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
