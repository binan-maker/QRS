import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
  useWindowDimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";
import PhotoModal from "@/features/profile/components/PhotoModal";
import UsernameEditor from "@/features/profile/components/UsernameEditor";
import { useProfile } from "@/hooks/useProfile";
import {
  updatePrivacySettings,
  updateBio,
  getPrivacySettings,
  getUserBio,
  type PrivacySettings,
} from "@/lib/services/user-service";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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

  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const [privacy, setPrivacy] = useState<PrivacySettings>({ isPrivate: false, showQrCodes: true, showStats: true, showActivity: true });
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;
  const { width } = useWindowDimensions();
  const styles = makeStyles(colors, width);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPrivacySettings(user.id), getUserBio(user.id)])
      .then(([p, b]) => { setPrivacy(p); setBio(b); })
      .catch(() => {});
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

  async function handlePrivacyToggle(key: keyof PrivacySettings, value: boolean) {
    if (!user) return;
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    setSavingPrivacy(true);
    try {
      await updatePrivacySettings(user.id, updated);
    } catch {
      setPrivacy(privacy);
      Alert.alert("Error", "Could not update privacy settings.");
    } finally {
      setSavingPrivacy(false);
    }
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <LinearGradient
          colors={isDark ? ["#050B18", "#061527"] : ["#F4F8FF", "#EAF2FF"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.guestWrap}>
          <Animated.View entering={FadeInUp.duration(500)} style={styles.guestInner}>
            <LinearGradient
              colors={isDark
                ? ["rgba(0,229,255,0.12)", "rgba(176,96,255,0.08)"]
                : ["rgba(0,111,255,0.07)", "rgba(124,58,237,0.05)"]}
              style={styles.guestIconRing}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-outline" size={48} color={colors.primary} />
            </LinearGradient>
            <Text style={[styles.guestTitle, { color: colors.text }]}>You're not signed in</Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
              Sign in to view your profile, stats, and activity
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [styles.guestSignInBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.primaryText} />
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

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        {/* ── HERO BANNER ── */}
        <Animated.View entering={FadeInDown.duration(450)} style={styles.heroBanner}>
          <LinearGradient
            colors={isDark
              ? ["#061929", "#050F1C", "#04090F"]
              : ["#E4F0FF", "#EDF5FF", "#F4F8FF"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <View style={[styles.heroBannerBorder, { borderColor: colors.primary + "22" }]} />

          <View style={styles.bannerTopRow}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => router.push("/settings")}
              style={[styles.settingsBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Avatar */}
          <View style={styles.avatarArea}>
            <Pressable onPress={() => setPhotoModalOpen(true)} style={styles.avatarPressable}>
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={styles.avatarGradientRing}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={[styles.avatarInner, { backgroundColor: colors.surface }]}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : photoURL ? (
                    <Image source={{ uri: photoURL }} style={styles.avatarPhoto} />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                  )}
                </View>
              </LinearGradient>
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
                    : <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save</Text>
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
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                  {user.displayName}
                </Text>
                <View style={[styles.editPencil, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons name="pencil" size={11} color={colors.primary} />
                </View>
              </Pressable>
            )}

            {currentUsername ? (
              <Text style={[styles.usernameText, { color: colors.primary }]}>@{currentUsername}</Text>
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
                  <Text style={[styles.bioCharCount, { color: colors.textMuted }]}>{newBio.length}/150</Text>
                  <Pressable onPress={() => { setEditingBio(false); setNewBio(bio); }} style={styles.cancelBtn}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
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
                {bio ? (
                  <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2}>{bio}</Text>
                ) : (
                  <Text style={[styles.bioPlaceholder, { color: colors.textMuted }]}>Add a bio…</Text>
                )}
                <View style={[styles.editPencil, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons name="pencil" size={11} color={colors.primary} />
                </View>
              </Pressable>
            )}

            <Text style={[styles.emailText, { color: colors.textMuted }]}>
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
              <Text style={[styles.viewPublicText, { color: colors.primary }]}>View My Public Profile</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          )}
        </Animated.View>

        {/* ── STATS ROW ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(80)}>
          <View style={styles.statsRow}>
            {[
              { label: "Following", value: stats.followingCount, icon: "notifications" as const, color: colors.primary, bg: colors.primaryDim },
              { label: "Scans", value: stats.scanCount, icon: "scan-outline" as const, color: colors.accent, bg: colors.accentDim },
              { label: "Comments", value: stats.commentCount, icon: "chatbubble-outline" as const, color: colors.safe, bg: colors.safeDim },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <LinearGradient
                  colors={[s.bg, "transparent"]}
                  style={styles.statGlow}
                  start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                />
                <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={14} color={s.color} />
                </View>
                {statsLoading
                  ? <SkeletonBox width={36} height={22} borderRadius={6} style={{ alignSelf: "center" }} />
                  : <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                }
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── LIKES CARD ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(140)}>
          <View style={[styles.likesCard, { backgroundColor: colors.surface, borderColor: colors.safeDim }]}>
            <LinearGradient
              colors={[colors.safeDim, "transparent"]}
              style={styles.likesGlow}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            <View style={[styles.likesIconWrap, { backgroundColor: colors.safeDim }]}>
              <Ionicons name="thumbs-up" size={20} color={colors.safe} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.likesTitle, { color: colors.text }]}>Total Likes Received</Text>
              <Text style={[styles.likesSub, { color: colors.textSecondary }]}>From your comments</Text>
            </View>
            {statsLoading
              ? <SkeletonBox width={44} height={26} borderRadius={8} />
              : <Text style={[styles.likesValue, { color: colors.safe }]}>{stats.totalLikesReceived}</Text>
            }
          </View>
        </Animated.View>

        {/* ── MY QR CODES + FAVORITES ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(170)}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Library</Text>
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

        {/* ── QUICK ACTIONS ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(200)}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Quick Actions</Text>
          <View style={styles.linksGroup}>
            {[
              {
                icon: <Ionicons name="time-outline" size={20} color={colors.primary} />,
                bg: colors.primaryDim,
                title: "Scan History",
                sub: "All your scanned QR codes",
                onPress: () => router.push("/(tabs)/history"),
                accent: colors.primary,
              },
              {
                icon: <MaterialCommunityIcons name="qrcode-edit" size={20} color={colors.accent} />,
                bg: colors.accentDim,
                title: "Create QR Code",
                sub: "Generate branded or private codes",
                onPress: () => router.push("/(tabs)/qr-generator"),
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

        {/* ── PRIVACY SETTINGS ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(220)}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Public Profile Privacy</Text>
          <View style={[styles.privacyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={[styles.privacyCardHeader, { borderBottomColor: colors.surfaceBorder }]}>
              <LinearGradient colors={["#B060FF", "#FF4D6A"]} style={styles.privacyCardIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="lock-closed" size={14} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.privacyCardTitle, { color: colors.text }]}>Control Your Visibility</Text>
                <Text style={[styles.privacyCardSub, { color: colors.textMuted }]}>Choose what others see on your profile</Text>
              </View>
              {savingPrivacy && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Private Profile toggle — shown at the top, separate */}
            <View style={[styles.privacyRow, { backgroundColor: privacy.isPrivate ? colors.dangerDim : "transparent", borderRadius: 12 }]}>
              <View style={[styles.privacyRowIcon, { backgroundColor: (privacy.isPrivate ? colors.danger : colors.textMuted) + "20" }]}>
                <Ionicons name={privacy.isPrivate ? "lock-closed" : "lock-open-outline"} size={16} color={privacy.isPrivate ? colors.danger : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.privacyRowLabel, { color: privacy.isPrivate ? colors.danger : colors.text }]}>Private Profile</Text>
                <Text style={[styles.privacyRowSub, { color: colors.textMuted }]}>
                  {privacy.isPrivate ? "Your profile is hidden from everyone" : "Your profile is visible to everyone"}
                </Text>
              </View>
              <Switch
                value={privacy.isPrivate}
                onValueChange={(v) => handlePrivacyToggle("isPrivate", v)}
                trackColor={{ false: colors.surfaceLight, true: colors.danger + "80" }}
                thumbColor={privacy.isPrivate ? colors.danger : colors.textMuted}
                ios_backgroundColor={colors.surfaceLight}
              />
            </View>

            <View style={[styles.privacyDivider, { backgroundColor: colors.surfaceBorder }]} />

            {([
              { key: "showQrCodes" as const, label: "QR Codes", sub: "Show your public QR codes", icon: "qr-code-outline" as const, color: colors.primary },
              { key: "showStats" as const, label: "Stats & Scans", sub: "Show scan counts, likes & reports", icon: "bar-chart-outline" as const, color: colors.accent },
              { key: "showActivity" as const, label: "Activity", sub: "Show your community contributions", icon: "pulse-outline" as const, color: colors.safe },
            ]).map((item, idx, arr) => (
              <React.Fragment key={item.key}>
                <View style={[styles.privacyRow, { opacity: privacy.isPrivate ? 0.45 : 1 }]}>
                  <View style={[styles.privacyRowIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.privacyRowLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.privacyRowSub, { color: colors.textMuted }]}>{item.sub}</Text>
                  </View>
                  <Switch
                    value={privacy[item.key]}
                    onValueChange={(v) => handlePrivacyToggle(item.key, v)}
                    disabled={privacy.isPrivate}
                    trackColor={{ false: colors.surfaceLight, true: colors.primary + "80" }}
                    thumbColor={privacy[item.key] ? colors.primary : colors.textMuted}
                    ios_backgroundColor={colors.surfaceLight}
                  />
                </View>
                {idx < arr.length - 1 && <View style={[styles.privacyDivider, { backgroundColor: colors.surfaceBorder }]} />}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* ── ACCOUNT INFO ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(240)}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Account</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Display Name</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user.displayName}</Text>
              </View>
              <Pressable
                onPress={() => { setEditingName(true); setNewName(user.displayName); }}
                style={[styles.infoEditBtn, { backgroundColor: colors.primaryDim }]}
              >
                <Ionicons name="pencil-outline" size={14} color={colors.primary} />
              </Pressable>
            </View>

            <View style={[styles.infoDivider, { backgroundColor: colors.surfaceBorder }]} />

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

            <View style={[styles.infoDivider, { backgroundColor: colors.surfaceBorder }]} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="mail-outline" size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
                {user.emailVerified && (
                  <View style={[styles.verifiedChip, { backgroundColor: colors.safeDim, alignSelf: "flex-start", marginTop: 5 }]}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.safe} />
                    <Text style={[styles.verifiedText, { color: colors.safe }]}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── SIGN OUT ── */}
        <Animated.View entering={FadeInDown.duration(450).delay(270)}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.danger + "40", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <LinearGradient
              colors={[colors.danger + "12", colors.danger + "06"]}
              style={styles.signOutGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
            </LinearGradient>
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
  const s = Math.min(Math.max(width / 390, 0.82), 1.15);
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
    bioCharCount: { flex: 1, fontSize: rf(11), fontFamily: "Inter_400Regular" },

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
    statGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 38 },
    statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: rf(22), fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: rf(10), fontFamily: "Inter_400Regular", textAlign: "center" },

    likesCard: {
      flexDirection: "row", alignItems: "center", gap: 14,
      borderRadius: 18, padding: 16, marginBottom: 22,
      borderWidth: 1, overflow: "hidden",
    },
    likesGlow: { position: "absolute", top: 0, left: 0, bottom: 0, width: 80 },
    likesIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    likesTitle: { fontSize: rf(14), fontFamily: "Inter_600SemiBold" },
    likesSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginTop: 1 },
    likesValue: { fontSize: rf(28), fontFamily: "Inter_700Bold" },

    sectionLabel: {
      fontSize: rf(10), fontFamily: "Inter_700Bold",
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
    privacyCardSub: { fontSize: rf(11), fontFamily: "Inter_400Regular", marginTop: 1 },
    privacyRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    privacyRowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    privacyRowLabel: { fontSize: rf(14), fontFamily: "Inter_600SemiBold" },
    privacyRowSub: { fontSize: rf(11), fontFamily: "Inter_400Regular", marginTop: 1 },
    privacyDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

    infoCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 22 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    infoIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    infoLabel: { fontSize: rf(11), fontFamily: "Inter_400Regular", marginBottom: 2 },
    infoValue: { fontSize: rf(14), fontFamily: "Inter_600SemiBold" },
    infoEditBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    infoDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
    verifiedChip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100,
    },
    verifiedText: { fontSize: rf(11), fontFamily: "Inter_600SemiBold" },

    signOutBtn: { borderRadius: 18, overflow: "hidden", borderWidth: 1, marginBottom: 8 },
    signOutGradient: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, justifyContent: "center" },
    signOutText: { fontSize: rf(15), fontFamily: "Inter_700Bold" },
  });
}
