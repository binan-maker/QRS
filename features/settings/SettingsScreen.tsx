import { View, Text, Pressable, ScrollView, Platform, useWindowDimensions } from "react-native";
import { useCallback, useMemo } from "react";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { safePush } from "@/shared/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { makeSettingsStyles } from "@/features/settings/styles";
import { SECTION_TITLES, THEME_OPTIONS, type ThemeMode } from "@/features/settings/constants";
import SettingsMenuItem from "@/features/settings/components/SettingsMenuItem";
import AccountSection from "@/features/settings/components/AccountSection";
import GuideSection from "@/features/settings/components/GuideSection";
import FeedbackSection from "@/features/settings/components/FeedbackSection";
import FollowingSection from "@/features/settings/components/FollowingSection";
import CommentsSection from "@/features/settings/components/CommentsSection";
import HistorySection from "@/features/settings/components/HistorySection";
import ProfileSettingsSection from "@/features/settings/components/ProfileSettingsSection";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors, mode, setMode } = useTheme();
  const { width } = useWindowDimensions();

  const styles = useMemo(() => makeSettingsStyles(colors, width), [colors, width]);

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
    startupScreen, setStartupScreen,
    handleSignOut, handleClearData,
    handleSubmitFeedback,
    handleDeleteComment, handleDeleteAllComments,
    handleDeleteHistoryItem, handleDeleteAllHistory,
    handleDeleteAccount,
  } = useSettings();

  // Pin the Android system nav bar to the app background whenever this screen
  // is in focus. The tab navigator doesn't set navigationBarColor, so without
  // this the bar appears transparent (black) in dark theme.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "android") {
        NavigationBar.setBackgroundColorAsync(colors.background).catch(() => {});
        NavigationBar.setButtonStyleAsync(colors.isDark ? "light" : "dark").catch(() => {});
      }
    }, [colors.background, colors.isDark])
  );

  useFocusEffect(
    useCallback(() => {
      if (params.initialSection && params.initialSection !== "main") {
        setSection(params.initialSection as any);
      } else {
        setSection("main");
      }
    }, [params.initialSection])
  );

  const goToAccount   = useCallback(() => setSection("account"),   [setSection]);
  const goToFollowing = useCallback(() => setSection("following"), [setSection]);
  const goToProfile   = useCallback(() => setSection("profile"),   [setSection]);
  const goToGuide     = useCallback(() => setSection("guide"),     [setSection]);
  const goToFeedback  = useCallback(() => setSection("feedback"),  [setSection]);
  const goToComments  = useCallback(() => setSection("comments"),  [setSection]);
  const goToHistory   = useCallback(() => setSection("history"),   [setSection]);
  const goToTrustScores = useCallback(() => safePush("/trust-scores"), []);
  const goToTerms     = useCallback(() => safePush("/terms"),      []);
  const goToPrivacy   = useCallback(() => safePush("/privacy-policy"), []);
  const goToLogin     = useCallback(() => safePush("/(auth)/login"), []);

  const handleSubSectionBack = useCallback(() => {
    if (section === "profile" && params.fromProfile === "1") {
      safePush("/(tabs)/profile");
    } else {
      setSection("main");
    }
  }, [section, params.fromProfile, setSection]);

  const handleMainBack = useCallback(() => {
    if (params.from === "history") {
      safePush("/(tabs)/history");
    } else {
      safePush("/(tabs)/profile");
    }
  }, [params.from]);

  const handleSetSystemMode = useCallback(() => setMode("system"), [setMode]);
  const handleSetLightMode  = useCallback(() => setMode("light"),  [setMode]);
  const handleSetDarkMode   = useCallback(() => setMode("dark"),   [setMode]);
  const themeModeHandlers: Record<ThemeMode, () => void> = useMemo(() => ({
    system: handleSetSystemMode,
    light:  handleSetLightMode,
    dark:   handleSetDarkMode,
  }), [handleSetSystemMode, handleSetLightMode, handleSetDarkMode]);

  // ── Sub-section view ────────────────────────────────────────────────────────

  if (section !== "main") {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={handleSubSectionBack} style={styles.navBackBtn}>
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
            goToComments={goToComments}
            goToHistory={goToHistory}
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

  // ── Main settings view ──────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Pressable onPress={handleMainBack} style={styles.navBackBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── ACCOUNT ── */}
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
                  <View style={[
                    styles.verifiedPill,
                    { backgroundColor: colors.safeDim, borderColor: colors.safe + "40", alignSelf: "flex-start", marginTop: 3, marginBottom: 3 },
                  ]}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.safe} />
                    <Text style={[styles.verifiedPillText, { color: colors.safe }]}>Verified</Text>
                  </View>
                  <Text style={styles.accountEmail} numberOfLines={1} ellipsizeMode="tail">{user.email}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <SettingsMenuItem
                icon="person-outline"
                label="Account Management"
                sublabel="History, comments, delete account"
                onPress={goToAccount}
              />
              <View style={styles.divider} />
              <SettingsMenuItem
                icon="heart-outline"
                label="Following"
                sublabel="QR codes you're tracking"
                onPress={goToFollowing}
              />
            </View>
          ) : (
            <Pressable
              onPress={goToLogin}
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
                sublabel="Name and username"
                onPress={goToProfile}
              />
            </View>
          </View>
        )}

        {/* ── APPEARANCE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APPEARANCE</Text>
          <View style={[styles.menuGroup, { padding: 16 }]}>
            <Text style={[styles.appearanceLabel, { color: colors.textSecondary }]}>Theme</Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const isActive = mode === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={themeModeHandlers[opt.key]}
                    style={({ pressed }) => [
                      styles.themeBtn,
                      {
                        backgroundColor: isActive ? colors.primaryDim : colors.surfaceLight,
                        borderColor: isActive ? colors.primary : colors.surfaceBorder,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={opt.icon} size={18} color={isActive ? colors.primary : colors.textMuted} />
                    <Text style={[styles.themeBtnText, { color: isActive ? colors.primary : colors.textMuted }]}>
                      {opt.label}
                    </Text>
                    {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── PREFERENCES ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={[styles.menuGroup, { padding: 16 }]}>
            <Text style={[styles.appearanceLabel, { color: colors.textSecondary }]}>App opens on</Text>
            <View style={styles.themeRow}>
              {([
                { key: "home",    label: "Home",    icon: "home-outline"    },
                { key: "scanner", label: "Scanner", icon: "scan-outline"    },
              ] as const).map((opt) => {
                const isActive = startupScreen === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setStartupScreen(opt.key)}
                    style={({ pressed }) => [
                      styles.themeBtn,
                      {
                        backgroundColor: isActive ? colors.primaryDim : colors.surfaceLight,
                        borderColor: isActive ? colors.primary : colors.surfaceBorder,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={opt.icon} size={18} color={isActive ? colors.primary : colors.textMuted} />
                    <Text style={[styles.themeBtnText, { color: isActive ? colors.primary : colors.textMuted }]}>
                      {opt.label}
                    </Text>
                    {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
                  </Pressable>
                );
              })}
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
              onPress={goToGuide}
            />
            <View style={styles.divider} />
            <SettingsMenuItem
              icon="shield-checkmark-outline"
              label="About Trust Scores"
              sublabel="How safety ratings are calculated"
              onPress={goToTrustScores}
            />
            <View style={styles.divider} />
            <SettingsMenuItem
              icon="chatbubble-outline"
              label="Send Feedback"
              sublabel="Report bugs or suggest features"
              onPress={goToFeedback}
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
              onPress={goToTerms}
            />
            <View style={styles.divider} />
            <SettingsMenuItem
              icon="lock-closed-outline"
              label="Privacy Policy"
              sublabel="How we collect and protect your data"
              onPress={goToPrivacy}
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
        <View style={styles.footer}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={styles.footerBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.footerBadgeText}>QR Guard v1.0.0</Text>
          </LinearGradient>
          <Text style={[styles.footerTagline, { color: colors.textMuted }]}>Scan smart. Stay safe.</Text>
          <Text style={[styles.footerDisclaimer, { color: colors.textMuted }]}>
            Trust scores reflect community opinion, not verified fact. You are solely responsible for all decisions made after scanning a QR code.
          </Text>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}
