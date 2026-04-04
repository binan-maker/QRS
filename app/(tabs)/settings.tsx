import { View, Text, Pressable, ScrollView, Platform, Switch, useWindowDimensions, StyleSheet } from "react-native";
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/hooks/useSettings";
import { makeSettingsStyles } from "@/features/settings/styles";
import SettingsMenuItem from "@/features/settings/components/SettingsMenuItem";
import AccountSection from "@/features/settings/components/AccountSection";
import GuideSection from "@/features/settings/components/GuideSection";
import FeedbackSection from "@/features/settings/components/FeedbackSection";
import FollowingSection from "@/features/settings/components/FollowingSection";
import CommentsSection from "@/features/settings/components/CommentsSection";
import HistorySection from "@/features/settings/components/HistorySection";
import ProfileSettingsSection from "@/features/settings/components/ProfileSettingsSection";

const SECTION_TITLES: Record<string, string> = {
  profile: "Profile Settings",
  account: "Account Management",
  guide: "Manual Guide",
  feedback: "Send Feedback",
  following: "Following",
  comments: "My Comments",
  history: "My History",
};

type ThemeMode = "system" | "dark" | "light";

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { colors, mode, setMode } = useTheme();
  const { width } = useWindowDimensions();
  const styles = makeSettingsStyles(colors, width);
  const localStyles = makeLocalStyles(colors, width);
  const params = useLocalSearchParams<{ initialSection?: string; fromProfile?: string; from?: string }>();

  const {
    user, section, setSection,
    feedbackText, setFeedbackText,
    feedbackEmail, setFeedbackEmail,
    feedbackSubmitting, feedbackDone,
    followingList, followingLoading,
    myComments, commentsLoading,
    myHistory, historyLoading,
    deleteConfirmText, setDeleteConfirmText,
    hapticsEnabled, toggleHaptics,
    handleSignOut, handleClearData,
    handleSubmitFeedback,
    handleDeleteComment, handleDeleteAllComments,
    handleDeleteHistoryItem, handleDeleteAllHistory,
    handleDeleteAccount,
  } = useSettings();

  useEffect(() => {
    if (params.initialSection && params.initialSection !== "main") {
      setSection(params.initialSection as any);
    }
  }, [params.initialSection]);

  if (section !== "main") {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => {
              if (section === "profile" && params.fromProfile === "1") {
                router.navigate("/(tabs)/profile" as any);
              } else {
                setSection("main");
              }
            }}
            style={styles.navBackBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>{SECTION_TITLES[section] ?? "Settings"}</Text>
          <View style={{ width: 40 }} />
        </View>

        {section === "profile" && <ProfileSettingsSection />}
        {section === "account" && (
          <AccountSection
            user={user}
            deleteConfirmText={deleteConfirmText}
            setDeleteConfirmText={setDeleteConfirmText}
            handleDeleteAccount={handleDeleteAccount}
            goToComments={() => setSection("comments")}
            goToHistory={() => setSection("history")}
          />
        )}
        {section === "guide" && <GuideSection />}
        {section === "feedback" && (
          <FeedbackSection
            feedbackText={feedbackText}
            setFeedbackText={setFeedbackText}
            feedbackEmail={feedbackEmail}
            setFeedbackEmail={setFeedbackEmail}
            feedbackSubmitting={feedbackSubmitting}
            feedbackDone={feedbackDone}
            handleSubmitFeedback={handleSubmitFeedback}
          />
        )}
        {section === "following" && (
          <FollowingSection loading={followingLoading} list={followingList} />
        )}
        {section === "comments" && (
          <CommentsSection
            loading={commentsLoading}
            comments={myComments}
            onDelete={handleDeleteComment}
            onDeleteAll={handleDeleteAllComments}
          />
        )}
        {section === "history" && (
          <HistorySection
            loading={historyLoading}
            history={myHistory}
            onDelete={handleDeleteHistoryItem}
            onDeleteAll={handleDeleteAllHistory}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() => {
            if (params.from === "history") {
              router.navigate("/(tabs)/history" as any);
            } else {
              router.navigate("/(tabs)/profile" as any);
            }
          }}
          style={styles.navBackBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── ACCOUNT SECTION ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          {user ? (
            <View style={styles.menuGroup}>
              <View style={styles.accountCard}>
                <LinearGradient
                  colors={[colors.primary + "30", colors.accent + "20"]}
                  style={styles.accountAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.accountAvatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.accountName} numberOfLines={1} ellipsizeMode="tail">
                    {user.displayName}
                  </Text>
                  <View style={[localStyles.verifiedPill, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40", alignSelf: "flex-start", marginTop: 3, marginBottom: 3 }]}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.safe} />
                    <Text style={[localStyles.verifiedPillText, { color: colors.safe }]}>Verified</Text>
                  </View>
                  <Text style={styles.accountEmail} numberOfLines={1} ellipsizeMode="tail">{user.email}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <SettingsMenuItem
                icon="person-outline"
                label="Account Management"
                sublabel="History, comments, delete account"
                onPress={() => setSection("account")}
              />
              <View style={styles.divider} />
              <SettingsMenuItem
                icon="heart-outline"
                label="Following"
                sublabel="QR codes you're tracking"
                onPress={() => setSection("following")}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [styles.signInCard, { opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={[styles.signInIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="person-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.signInTitle}>Sign in to your account</Text>
                <Text style={styles.signInSub}>Comment, report, and sync history</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* ── PROFILE ── */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PROFILE</Text>
            <View style={styles.menuGroup}>
              <SettingsMenuItem
                icon="person-circle-outline"
                label="Profile Settings"
                sublabel="Name, username, bio, and privacy"
                onPress={() => setSection("profile")}
              />
            </View>
          </View>
        )}

        {/* ── APPEARANCE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APPEARANCE</Text>
          <View style={[styles.menuGroup, { padding: 16 }]}>
            <Text style={[localStyles.appearanceLabel, { color: colors.textSecondary }]}>Theme</Text>
            <View style={localStyles.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const isActive = mode === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setMode(opt.key)}
                    style={({ pressed }) => [
                      localStyles.themeBtn,
                      {
                        backgroundColor: isActive ? colors.primaryDim : colors.surfaceLight,
                        borderColor: isActive ? colors.primary : colors.surfaceBorder,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={opt.icon} size={18} color={isActive ? colors.primary : colors.textMuted} />
                    <Text style={[localStyles.themeBtnText, { color: isActive ? colors.primary : colors.textMuted }]}>
                      {opt.label}
                    </Text>
                    {isActive && <View style={[localStyles.activeIndicator, { backgroundColor: colors.primary }]} />}
                  </Pressable>
                );
              })}
            </View>
            <View style={localStyles.hapticsDivider} />
            <View style={localStyles.hapticsRow}>
              <View style={localStyles.hapticsLeft}>
                <View style={[localStyles.hapticsIcon, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.textSecondary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[localStyles.hapticsLabel, { color: colors.text }]}>Haptic Feedback</Text>
                  <Text style={[localStyles.hapticsSub, { color: colors.textMuted }]}>Vibration on button presses</Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: colors.surfaceBorder, true: colors.primaryDim }}
                thumbColor={hapticsEnabled ? colors.primary : colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* ── HELP & INFORMATION ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HELP & INFORMATION</Text>
          <View style={styles.menuGroup}>
            <SettingsMenuItem
              icon="book-outline"
              label="Manual Guide"
              sublabel="Step-by-step usage guide"
              onPress={() => setSection("guide")}
            />
            <View style={styles.divider} />
            <SettingsMenuItem
              icon="shield-checkmark-outline"
              label="About Trust Scores"
              sublabel="How safety ratings are calculated"
              onPress={() => router.push("/trust-scores")}
            />
            <View style={styles.divider} />
            <SettingsMenuItem
              icon="chatbubble-outline"
              label="Send Feedback"
              sublabel="Report bugs or suggest features"
              onPress={() => setSection("feedback")}
            />
          </View>
        </View>

        {/* ── LEGAL ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LEGAL</Text>
          <View style={styles.menuGroup}>
            <SettingsMenuItem
              icon="document-text-outline"
              label="Terms of Service"
              sublabel="Usage rules, disclaimers and liability"
              onPress={() => router.push("/terms")}
            />
            <View style={styles.divider} />
            <SettingsMenuItem
              icon="lock-closed-outline"
              label="Privacy Policy"
              sublabel="How we collect and protect your data"
              onPress={() => router.push("/privacy-policy")}
            />
          </View>
        </View>

        {/* ── DATA ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <View style={styles.menuGroup}>
            <SettingsMenuItem
              icon="trash-outline"
              label="Clear Local Data"
              sublabel="Remove scan history from this device"
              onPress={handleClearData}
              danger
            />
          </View>
        </View>

        {/* ── SIGN OUT ── */}
        {user && (
          <View style={styles.section}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={localStyles.footer}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={localStyles.footerBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={localStyles.footerBadgeText}>QR Guard v1.0.0</Text>
          </LinearGradient>
          <Text style={[localStyles.footerTagline, { color: colors.textMuted }]}>Scan smart. Stay safe.</Text>
          <Text style={[localStyles.footerDisclaimer, { color: colors.textMuted }]}>
            Trust scores reflect community opinion, not verified fact. You are solely responsible for all decisions made after scanning a QR code.
          </Text>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

function makeLocalStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"], width = 390) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  const sp = (v: number) => Math.round(v * s);
  return StyleSheet.create({
    nameRow: {
      flexDirection: "row", alignItems: "center", gap: sp(6), flexWrap: "nowrap",
    },
    verifiedPill: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: sp(7), paddingVertical: sp(3), borderRadius: sp(10), borderWidth: 1,
    },
    verifiedPillText: { fontSize: rf(10), fontFamily: "Inter_600SemiBold" },
    appearanceLabel: { fontSize: rf(12), fontFamily: "Inter_600SemiBold", marginBottom: sp(12) },
    themeRow: { flexDirection: "row", gap: sp(10) },
    themeBtn: {
      flex: 1, alignItems: "center", justifyContent: "center",
      gap: sp(6), paddingVertical: sp(14), borderRadius: sp(14), borderWidth: 1.5,
      position: "relative",
    },
    themeBtnText: { fontSize: rf(11), fontFamily: "Inter_600SemiBold" },
    activeIndicator: { position: "absolute", bottom: 6, width: sp(18), height: 3, borderRadius: 2 },
    hapticsDivider: { height: 1, backgroundColor: c.surfaceBorder, marginTop: sp(16), marginBottom: sp(16) },
    hapticsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    hapticsLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    hapticsIcon: { width: sp(38), height: sp(38), borderRadius: sp(12), alignItems: "center", justifyContent: "center" },
    hapticsLabel: { fontSize: rf(13), fontFamily: "Inter_600SemiBold" },
    hapticsSub: { fontSize: rf(11), fontFamily: "Inter_400Regular", marginTop: 1 },
    footer: { alignItems: "center", gap: sp(8), paddingTop: sp(8), paddingBottom: sp(12), paddingHorizontal: sp(24) },
    footerBadge: { borderRadius: sp(12), paddingHorizontal: sp(14), paddingVertical: sp(6) },
    footerBadgeText: { fontSize: rf(11), fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
    footerTagline: { fontSize: rf(11), fontFamily: "Inter_500Medium" },
    footerDisclaimer: { fontSize: rf(11), fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: Math.round(15 * s) },
  });
}
