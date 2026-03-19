import React from "react";
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
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";
import PhotoModal from "@/features/profile/components/PhotoModal";
import UsernameEditor from "@/features/profile/components/UsernameEditor";
import { useProfile } from "@/hooks/useProfile";

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
    editingUsername, setEditingUsername,
    newUsernameInput, setNewUsernameInput,
    usernameAvailable, checkingUsername,
    savingUsername, usernameError, setUsernameError,
    daysUntilEdit, initials,
    handleSaveName, handleSaveUsername, handleCancelUsername, handlePickPhoto, handleSignOut,
  } = useProfile();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;
  const styles = makeStyles(colors);

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Text style={styles.navTitle}>Profile</Text>
        </View>
        <View style={styles.centeredBox}>
          <View style={styles.guestAvatar}>
            <Ionicons name="person-outline" size={52} color={colors.textMuted} />
          </View>
          <Text style={styles.guestTitle}>You're not signed in</Text>
          <Text style={styles.guestSub}>Sign in to view your profile, stats, and activity</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBtn}>
            <Ionicons name="log-in-outline" size={20} color={colors.primaryText} />
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(auth)/register")} style={styles.registerBtn}>
            <Text style={styles.registerBtnText}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Profile</Text>
        <Pressable
          onPress={() => router.push("/settings")}
          style={styles.settingsBtn}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.heroCard}>
            <Pressable onPress={() => setPhotoModalOpen(true)} style={styles.avatarWrapper}>
              {uploadingPhoto ? (
                <View style={styles.avatarLarge}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatarLargeImg} />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={13} color={colors.primaryText} />
              </View>
            </Pressable>

            <View style={styles.heroInfo}>
              {editingName ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    maxLength={40}
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <Pressable onPress={handleSaveName} disabled={savingName} style={styles.saveNameBtn}>
                    {savingName ? (
                      <ActivityIndicator size="small" color={colors.primaryText} />
                    ) : (
                      <Text style={styles.saveNameBtnText}>Save</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => { setEditingName(false); setNewName(user.displayName); }}
                    style={styles.cancelNameBtn}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => { setEditingName(true); setNewName(user.displayName); }}
                  style={styles.nameRow}
                >
                  <Text style={styles.displayName} numberOfLines={1}>{user.displayName}</Text>
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} style={{ marginLeft: 6 }} />
                </Pressable>
              )}
              {currentUsername ? (
                <Text style={styles.usernameHeroText} numberOfLines={1}>@{currentUsername}</Text>
              ) : null}
              <Text style={styles.emailText} numberOfLines={1}>{user.email}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <View style={styles.statsRow}>
            {[
              { label: "Following QRs", value: stats.followingCount, icon: "notifications" as const, color: colors.primary },
              { label: "Total Scans", value: stats.scanCount, icon: "scan-outline" as const, color: colors.accent },
              { label: "Comments", value: stats.commentCount, icon: "chatbubble-outline" as const, color: colors.safe },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                {statsLoading ? (
                  <SkeletonBox width={36} height={20} borderRadius={6} style={{ alignSelf: "center" }} />
                ) : (
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                )}
                <Ionicons name={s.icon as any} size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(140)}>
          <View style={styles.likesCard}>
            <View style={styles.likesLeft}>
              <View style={styles.likesIconWrap}>
                <Ionicons name="thumbs-up" size={22} color={colors.safe} />
              </View>
              <View>
                <Text style={styles.likesTitle}>Total Likes Received</Text>
                <Text style={styles.likesSub}>From your comments across the app</Text>
              </View>
            </View>
            {statsLoading ? (
              <SkeletonBox width={40} height={22} borderRadius={6} />
            ) : (
              <Text style={styles.likesValue}>{stats.totalLikesReceived}</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
          <Pressable
            onPress={() => router.push("/my-qr-codes" as any)}
            style={({ pressed }) => [styles.myQrViewAllBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.myQrViewAllLeft}>
              <View style={styles.myQrViewAllIcon}>
                <MaterialCommunityIcons name="qrcode-edit" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.myQrViewAllTitle}>My QR Codes</Text>
                <Text style={styles.myQrViewAllSub}>
                  {myQrLoading ? "Loading…" : `${myQrCodes.length} code${myQrCodes.length !== 1 ? "s" : ""} — Individual & Business`}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(170)}>
          <Pressable
            onPress={() => router.push("/favorites" as any)}
            style={({ pressed }) => [styles.myQrViewAllBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.myQrViewAllLeft}>
              <View style={[styles.myQrViewAllIcon, { backgroundColor: colors.dangerDim }]}>
                <Ionicons name="heart" size={22} color={colors.danger} />
              </View>
              <View>
                <Text style={styles.myQrViewAllTitle}>Favorite QR Codes</Text>
                <Text style={styles.myQrViewAllSub}>QR codes you've saved as favorites</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(180)}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            <Pressable style={styles.menuRow} onPress={() => router.push("/(tabs)/history")}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuRowText}>Scan History</Text>
                <Text style={styles.menuRowSub}>View all your scanned QR codes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            <View style={styles.cardDivider} />
            <Pressable style={styles.menuRow} onPress={() => router.push("/(tabs)/qr-generator")}>
              <View style={[styles.menuIcon, { backgroundColor: colors.accentDim }]}>
                <MaterialCommunityIcons name="qrcode-edit" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuRowText}>Create QR Code</Text>
                <Text style={styles.menuRowSub}>Generate branded or private QR codes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(220)}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Display Name</Text>
                <Text style={styles.infoValue}>{user.displayName}</Text>
              </View>
              <Pressable onPress={() => { setEditingName(true); setNewName(user.displayName); }}>
                <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.cardDivider} />

            <UsernameEditor
              currentUsername={currentUsername}
              daysUntilEdit={daysUntilEdit}
              editing={editingUsername}
              input={newUsernameInput}
              checking={checkingUsername}
              available={usernameAvailable}
              error={usernameError}
              saving={savingUsername}
              onStartEdit={() => {
                setNewUsernameInput(currentUsername || "");
                setEditingUsername(true);
                setUsernameError("");
              }}
              onChangeInput={(v) => {
                setNewUsernameInput(v);
                setUsernameError("");
              }}
              onSave={handleSaveUsername}
              onCancel={handleCancelUsername}
            />

            <View style={styles.cardDivider} />
            <View style={styles.infoRow}>
              <View style={[styles.menuIcon, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="mail-outline" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{user.email}</Text>
              </View>
              {user.emailVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.safe} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(280)}>
          <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
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

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    navBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.surfaceBorder,
    },
    navTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.text },
    settingsBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      alignItems: "center", justifyContent: "center",
    },
    scrollContent: { padding: 20 },
    centeredBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
    guestAvatar: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 8,
    },
    guestTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text, textAlign: "center" },
    guestSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.textSecondary, textAlign: "center" },
    signInBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primary, paddingVertical: 14, paddingHorizontal: 32,
      borderRadius: 16, marginTop: 8,
    },
    signInBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.primaryText },
    registerBtn: { paddingVertical: 12, paddingHorizontal: 24 },
    registerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.primary },
    heroCard: {
      backgroundColor: c.surface, borderRadius: 20, padding: 20,
      borderWidth: 1, borderColor: c.surfaceBorder,
      flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16,
    },
    avatarWrapper: { position: "relative" },
    avatarLarge: {
      width: 76, height: 76, borderRadius: 38,
      backgroundColor: c.primaryDim, alignItems: "center", justifyContent: "center",
      borderWidth: 2.5, borderColor: c.primary,
    },
    avatarLargeImg: { width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, borderColor: c.primary },
    avatarLargeText: { fontSize: 28, fontFamily: "Inter_700Bold", color: c.primary },
    avatarEditBadge: {
      position: "absolute", bottom: 0, right: 0,
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: c.surface,
    },
    heroInfo: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text, flexShrink: 1 },
    emailText: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 6 },
    editNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    nameInput: {
      flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text,
      backgroundColor: c.inputBackground, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
      borderWidth: 1, borderColor: c.primary,
    },
    saveNameBtn: { backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexShrink: 0 },
    saveNameBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: c.primaryText },
    cancelNameBtn: { padding: 6 },
    usernameHeroText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.primary, marginBottom: 2 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    statCard: {
      flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 14,
      alignItems: "center", borderWidth: 1, borderColor: c.surfaceBorder, gap: 2,
    },
    statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "center" },
    likesCard: {
      backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: c.surfaceBorder,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    likesLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    likesIconWrap: {
      width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
      backgroundColor: c.safeDim,
    },
    likesTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
    likesSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary },
    likesValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.safe },
    myQrViewAllBtn: {
      backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: c.surfaceBorder,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    myQrViewAllLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    myQrViewAllIcon: {
      width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
      backgroundColor: c.primaryDim,
    },
    myQrViewAllTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
    myQrViewAllSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary },
    sectionTitle: {
      fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.textMuted,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 4,
    },
    card: {
      backgroundColor: c.surface, borderRadius: 16, marginBottom: 16,
      borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden",
    },
    cardDivider: { height: 1, backgroundColor: c.surfaceBorder },
    menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
    menuIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuRowText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
    menuRowSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 1 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
    infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, marginBottom: 2 },
    infoValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.text },
    verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    verifiedText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.safe },
    signOutBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.surface, padding: 16, borderRadius: 16, marginBottom: 8,
      borderWidth: 1, borderColor: c.danger + "40",
    },
    signOutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.danger },
  });
}
