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
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { useProfile } from "@/hooks/useProfile";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Text style={styles.navTitle}>Profile</Text>
        </View>
        <View style={styles.centeredBox}>
          <View style={styles.guestAvatar}>
            <Ionicons name="person-outline" size={52} color={Colors.dark.textMuted} />
          </View>
          <Text style={styles.guestTitle}>You're not signed in</Text>
          <Text style={styles.guestSub}>Sign in to view your profile, stats, and activity</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBtn}>
            <Ionicons name="log-in-outline" size={20} color="#000" />
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
      {/* Nav */}
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Profile</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/settings")}
          style={styles.settingsBtn}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        {/* Hero card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.heroCard}>
            <Pressable onPress={() => setPhotoModalOpen(true)} style={styles.avatarWrapper}>
              {uploadingPhoto ? (
                <View style={styles.avatarLarge}>
                  <ActivityIndicator color={Colors.dark.primary} />
                </View>
              ) : photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatarLargeImg} />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={13} color="#000" />
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
                    placeholderTextColor={Colors.dark.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <Pressable onPress={handleSaveName} disabled={savingName} style={styles.saveNameBtn}>
                    {savingName ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveNameBtnText}>Save</Text>}
                  </Pressable>
                  <Pressable onPress={() => { setEditingName(false); setNewName(user.displayName); }} style={styles.cancelNameBtn}>
                    <Ionicons name="close" size={18} color={Colors.dark.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => { setEditingName(true); setNewName(user.displayName); }} style={styles.nameRow}>
                  <Text style={styles.displayName} numberOfLines={1}>{user.displayName}</Text>
                  <Ionicons name="pencil-outline" size={15} color={Colors.dark.primary} style={{ marginLeft: 6 }} />
                </Pressable>
              )}
              {currentUsername ? (
                <Text style={styles.usernameHeroText} numberOfLines={1}>@{currentUsername}</Text>
              ) : null}
              <Text style={styles.emailText} numberOfLines={1}>{user.email}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <View style={styles.statsRow}>
            {[
              { label: "Following QRs", value: stats.followingCount, icon: "notifications" as const, color: Colors.dark.primary },
              { label: "Total Scans", value: stats.scanCount, icon: "scan-outline" as const, color: Colors.dark.accent },
              { label: "Comments", value: stats.commentCount, icon: "chatbubble-outline" as const, color: Colors.dark.safe },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                {statsLoading ? (
                  <SkeletonBox width={36} height={20} borderRadius={6} style={{ alignSelf: "center" }} />
                ) : (
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                )}
                <Ionicons name={s.icon as any} size={14} color={Colors.dark.textMuted} style={{ marginTop: 2 }} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Total Likes card */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)}>
          <View style={styles.likesCard}>
            <View style={styles.likesLeft}>
              <View style={styles.likesIconWrap}>
                <Ionicons name="thumbs-up" size={22} color={Colors.dark.safe} />
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

        {/* My QR Codes */}
        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
          <Pressable
            onPress={() => router.push("/my-qr-codes" as any)}
            style={({ pressed }) => [styles.myQrViewAllBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.myQrViewAllLeft}>
              <View style={styles.myQrViewAllIcon}>
                <MaterialCommunityIcons name="qrcode-edit" size={22} color={Colors.dark.primary} />
              </View>
              <View>
                <Text style={styles.myQrViewAllTitle}>My QR Codes</Text>
                <Text style={styles.myQrViewAllSub}>
                  {myQrLoading ? "Loading…" : `${myQrCodes.length} code${myQrCodes.length !== 1 ? "s" : ""} — Individual & Business`}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
          </Pressable>
        </Animated.View>

        {/* Favorites */}
        <Animated.View entering={FadeInDown.duration(400).delay(170)}>
          <Pressable
            onPress={() => router.push("/favorites" as any)}
            style={({ pressed }) => [styles.myQrViewAllBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.myQrViewAllLeft}>
              <View style={[styles.myQrViewAllIcon, { backgroundColor: Colors.dark.dangerDim }]}>
                <Ionicons name="heart" size={22} color={Colors.dark.danger} />
              </View>
              <View>
                <Text style={styles.myQrViewAllTitle}>Favorite QR Codes</Text>
                <Text style={styles.myQrViewAllSub}>QR codes you've saved as favorites</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
          </Pressable>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            <Pressable style={styles.menuRow} onPress={() => router.push("/(tabs)/history")}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                <Ionicons name="time-outline" size={18} color={Colors.dark.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuRowText}>Scan History</Text>
                <Text style={styles.menuRowSub}>View all your scanned QR codes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
            </Pressable>
            <View style={styles.cardDivider} />
            <Pressable style={styles.menuRow} onPress={() => router.push("/(tabs)/qr-generator")}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.accentDim }]}>
                <MaterialCommunityIcons name="qrcode-edit" size={18} color={Colors.dark.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuRowText}>Create QR Code</Text>
                <Text style={styles.menuRowSub}>Generate branded or private QR codes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Account info */}
        <Animated.View entering={FadeInDown.duration(400).delay(220)}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                <Ionicons name="person-outline" size={18} color={Colors.dark.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Display Name</Text>
                <Text style={styles.infoValue}>{user.displayName}</Text>
              </View>
              <Pressable onPress={() => { setEditingName(true); setNewName(user.displayName); }}>
                <Ionicons name="pencil-outline" size={18} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
            <View style={styles.cardDivider} />

            {/* Username row */}
            {editingUsername ? (
              <View style={[styles.infoRow, { flexDirection: "column", alignItems: "stretch", gap: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                    <Ionicons name="at" size={18} color={Colors.dark.primary} />
                  </View>
                  <View style={[styles.usernameInputContainer, { flex: 1 }]}>
                    <Text style={styles.usernameAtSign}>@</Text>
                    <TextInput
                      style={styles.usernameInput}
                      value={newUsernameInput}
                      onChangeText={(v) => {
                        setNewUsernameInput(v.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                        setUsernameError("");
                      }}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={20}
                      placeholderTextColor={Colors.dark.textMuted}
                      placeholder="username"
                    />
                    {checkingUsername ? (
                      <ActivityIndicator size="small" color={Colors.dark.textMuted} />
                    ) : usernameAvailable === true ? (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.dark.safe} />
                    ) : usernameAvailable === false ? (
                      <Ionicons name="close-circle" size={18} color={Colors.dark.danger} />
                    ) : null}
                  </View>
                </View>
                {usernameError ? (
                  <Text style={styles.usernameError}>{usernameError}</Text>
                ) : null}
                {daysUntilEdit > 0 ? (
                  <Text style={styles.usernameLockNote}>
                    <Ionicons name="time-outline" size={12} /> Next change available in {daysUntilEdit} day{daysUntilEdit === 1 ? "" : "s"}
                  </Text>
                ) : (
                  <Text style={styles.usernameHint}>3-20 chars · letters, numbers, underscores · starts with a letter</Text>
                )}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={handleSaveUsername}
                    disabled={savingUsername || usernameAvailable === false || daysUntilEdit > 0 || !newUsernameInput}
                    style={[styles.usernameSaveBtn, (savingUsername || usernameAvailable === false || daysUntilEdit > 0 || !newUsernameInput) && { opacity: 0.5 }]}
                  >
                    {savingUsername ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.usernameSaveBtnText}>Save</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={handleCancelUsername} style={styles.usernameCancelBtn}>
                    <Text style={styles.usernameCancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                  <Ionicons name="at" size={18} color={Colors.dark.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Username</Text>
                  <Text style={styles.infoValue}>
                    {currentUsername ? `@${currentUsername}` : "Not set"}
                  </Text>
                  {daysUntilEdit > 0 ? (
                    <Text style={styles.usernameLockNote}>{daysUntilEdit} day{daysUntilEdit === 1 ? "" : "s"} until next change</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => {
                    setNewUsernameInput(currentUsername || "");
                    setEditingUsername(true);
                    setUsernameError("");
                  }}
                  disabled={daysUntilEdit > 0}
                >
                  <Ionicons name="pencil-outline" size={18} color={Colors.dark.textMuted} />
                </Pressable>
              </View>
            )}

            <View style={styles.cardDivider} />
            <View style={styles.infoRow}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.accentDim }]}>
                <Ionicons name="mail-outline" size={18} color={Colors.dark.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{user.email}</Text>
              </View>
              {user.emailVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.dark.safe} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.duration(400).delay(280)}>
          <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.dark.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Photo picker modal */}
      <Modal
        visible={photoModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPhotoModalOpen(false)}>
          <Pressable style={styles.photoSheet} onPress={() => {}}>
            <View style={styles.photoSheetHandle} />
            <Text style={styles.photoSheetTitle}>Change Profile Photo</Text>
            <Pressable style={styles.photoOption} onPress={() => handlePickPhoto("camera")}>
              <View style={[styles.photoOptionIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                <Ionicons name="camera-outline" size={22} color={Colors.dark.primary} />
              </View>
              <View>
                <Text style={styles.photoOptionText}>Take Photo</Text>
                <Text style={styles.photoOptionSub}>Use your camera</Text>
              </View>
            </Pressable>
            <View style={styles.cardDivider} />
            <Pressable style={styles.photoOption} onPress={() => handlePickPhoto("gallery")}>
              <View style={[styles.photoOptionIcon, { backgroundColor: Colors.dark.accentDim }]}>
                <Ionicons name="images-outline" size={22} color={Colors.dark.accent} />
              </View>
              <View>
                <Text style={styles.photoOptionText}>Choose from Gallery</Text>
                <Text style={styles.photoOptionSub}>Pick an existing photo</Text>
              </View>
            </Pressable>
            <Pressable style={styles.photoCancel} onPress={() => setPhotoModalOpen(false)}>
              <Text style={styles.photoCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },

  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  navTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },

  scrollContent: { padding: 20 },

  centeredBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  guestAvatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 8,
  },
  guestTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text, textAlign: "center" },
  guestSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, textAlign: "center" },
  signInBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primary, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 16, marginTop: 8,
  },
  signInBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
  registerBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  registerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  heroCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16,
  },
  avatarWrapper: { position: "relative" },
  avatarLarge: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: Colors.dark.primary,
  },
  avatarLargeImg: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderColor: Colors.dark.primary,
  },
  avatarLargeText: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  avatarEditBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.dark.surface,
  },
  heroInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text, flexShrink: 1 },
  emailText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 6 },
  memberBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  memberText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.safe },
  editNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  nameInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text,
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.dark.primary,
  },
  saveNameBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexShrink: 0 },
  saveNameBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  cancelNameBtn: { padding: 6 },

  usernameHeroText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.primary, marginBottom: 2 },
  usernameInputContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.dark.primary,
    paddingHorizontal: 10, gap: 4,
  },
  usernameAtSign: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  usernameInput: {
    flex: 1, paddingVertical: 8, fontSize: 15,
    fontFamily: "Inter_400Regular", color: Colors.dark.text,
  },
  usernameError: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.danger, marginLeft: 48 },
  usernameHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginLeft: 48 },
  usernameLockNote: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.warning, marginLeft: 48 },
  usernameSaveBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, alignSelf: "flex-start" },
  usernameSaveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  usernameCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, alignSelf: "flex-start" },
  usernameCancelBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 14, alignItems: "center", gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, textAlign: "center" },

  likesCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.safeDim,
    padding: 16, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 20,
  },
  likesLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  likesIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.dark.safeDim, alignItems: "center", justifyContent: "center",
  },
  likesTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  likesSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  likesValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.dark.safe },

  sectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 2,
  },
  card: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 20, overflow: "hidden",
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuRowText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.dark.text },
  menuRowSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginHorizontal: 16 },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.dark.dangerDim, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.danger + "30",
  },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.danger },

  myQrHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  newQrBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  newQrBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  myQrLoading: { paddingVertical: 28, alignItems: "center" },
  myQrEmpty: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 16, marginBottom: 20,
  },
  myQrEmptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  myQrEmptySub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2, maxWidth: 220 },
  myQrCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 12, width: 280,
  },
  myQrImageWrap: { borderRadius: 10, padding: 6, overflow: "hidden" },
  myQrCardInfo: { flex: 1, minWidth: 0 },
  myQrCardUuidRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  myQrCardUuid: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe, letterSpacing: 0.3 },
  myQrCardContent: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 16, marginBottom: 6 },
  myQrCardStats: { flexDirection: "row", gap: 10 },
  myQrStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  myQrInactiveBadge: {
    backgroundColor: Colors.dark.dangerDim, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1, borderColor: Colors.dark.danger + "40",
  },
  myQrInactiveBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: Colors.dark.danger },
  myQrBusinessName: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 2 },
  myQrStatText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },

  myQrViewAllBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 16, marginBottom: 20,
  },
  myQrViewAllLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  myQrViewAllIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
  },
  myQrViewAllTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  myQrViewAllSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  photoSheet: {
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  photoSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.dark.surfaceLight, alignSelf: "center", marginBottom: 16,
  },
  photoSheetTitle: {
    fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.text,
    paddingHorizontal: 20, marginBottom: 12,
  },
  photoOption: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16 },
  photoOptionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  photoOptionText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  photoOptionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  photoCancel: {
    margin: 16, backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 14, padding: 16, alignItems: "center",
  },
  photoCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
});
