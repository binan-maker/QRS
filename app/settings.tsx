import { View, Text, Pressable, ScrollView, Platform, Alert, Switch, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { safePush } from "@/lib/utils/navigation";
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
import { useState, useEffect } from "react";
import { getPrivacySettings, updatePrivacySettings, PrivacySettings } from "@/lib/services/user-service";

const SECTION_TITLES: Record<string, string> = {
  account: "Account",
  guide: "How It Works",
  feedback: "Feedback",
  following: "Following",
  comments: "My Comments",
};

export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = makeSettingsStyles(colors);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const {
    user, section, setSection,
    feedbackText, setFeedbackText,
    feedbackEmail, setFeedbackEmail,
    feedbackSubmitting, feedbackDone,
    followingList, followingLoading,
    myComments, commentsLoading,
    deleteConfirmText, setDeleteConfirmText,
    hapticsEnabled, toggleHaptics,
    handleSignOut, handleClearData,
    handleSubmitFeedback, handleDeleteComment, handleDeleteAccount,
  } = useSettings();

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    isPrivate: false,
    showQrCodes: true,
    showStats: true,
    showActivity: true,
  });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPrivacySettings(user.id).then(setPrivacy).catch(() => {});
  }, [user?.id]);

  async function handlePrivacyToggle(key: keyof PrivacySettings, val: boolean) {
    if (!user) return;
    const updated = { ...privacy, [key]: val };
    setPrivacy(updated);
    try {
      await updatePrivacySettings(user.id, updated);
    } catch {
      setPrivacy(privacy);
    }
  }

  if (section !== "main") {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => setSection("main")} style={styles.navBackBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>{SECTION_TITLES[section] ?? "Settings"}</Text>
          <View style={{ width: 40 }} />
        </View>

        {section === "account" && (
          <AccountSection
            user={user}
            deleteConfirmText={deleteConfirmText}
            setDeleteConfirmText={setDeleteConfirmText}
            handleDeleteAccount={handleDeleteAccount}
            goToComments={() => setSection("comments")}
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
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as any)}
          style={styles.navBackBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* User Profile Card */}
        {user ? (
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              style={styles.profileAvatarRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.profileAvatarInner, { backgroundColor: colors.surface }]}>
                <Text style={[styles.profileAvatarText, { color: colors.primary }]}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{user.displayName}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user.email}</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.safe} />
              <Text style={[styles.verifiedText, { color: colors.safe }]}>Active</Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => safePush("/(auth)/login")}
            style={({ pressed }) => [styles.signInCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              style={styles.signInIconWrap}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-outline" size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.signInTitle, { color: colors.text }]}>Sign in to your account</Text>
              <Text style={[styles.signInSub, { color: colors.textSecondary }]}>Access full features — report, sync, comment</Text>
            </View>
            <View style={[styles.signInChevron, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </Pressable>
        )}

        {/* Privacy & Profile Section */}
        {user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PROFILE PRIVACY</Text>

            {/* Link to dedicated privacy page */}
            <Pressable
              onPress={() => safePush("/privacy-settings")}
              style={({ pressed }) => [
                {
                  flexDirection: "row" as const,
                  alignItems: "center" as const,
                  gap: 14,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  marginBottom: 10,
                  backgroundColor: colors.primaryDim,
                  borderColor: colors.primary + "40",
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary + "25", alignItems: "center" as const, justifyContent: "center" as const }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.primary }}>Manage Privacy & Settings</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 1 }}>
                  Control who sees your profile, stats & ranking
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </Pressable>

            <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>

              {/* Private account toggle */}
              <View style={[styles.menuItem, { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                  <View style={[styles.menuIconWrap, { backgroundColor: privacy.isPrivate ? colors.accentDim : colors.surfaceLight }]}>
                    <Ionicons
                      name={privacy.isPrivate ? "lock-closed-outline" : "globe-outline"}
                      size={18}
                      color={privacy.isPrivate ? colors.accent : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuLabel, { color: colors.text }]}>Private Account</Text>
                    <Text style={[styles.menuSublabel, { color: colors.textMuted }]}>
                      {privacy.isPrivate ? "Only you can see your full profile" : "Anyone can view your public profile"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={privacy.isPrivate}
                  onValueChange={(v) => handlePrivacyToggle("isPrivate", v)}
                  trackColor={{ false: colors.surfaceBorder, true: colors.accent + "90" }}
                  thumbColor={privacy.isPrivate ? colors.accent : colors.textMuted}
                />
              </View>

              {!privacy.isPrivate && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

                  {/* Show Stats */}
                  <View style={[styles.menuItem, { justifyContent: "space-between" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                      <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceLight }]}>
                        <Ionicons name="bar-chart-outline" size={18} color={colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuLabel, { color: colors.text }]}>Show Stats</Text>
                        <Text style={[styles.menuSublabel, { color: colors.textMuted }]}>Scans, likes, and report counts</Text>
                      </View>
                    </View>
                    <Switch
                      value={privacy.showStats}
                      onValueChange={(v) => handlePrivacyToggle("showStats", v)}
                      trackColor={{ false: colors.surfaceBorder, true: colors.primary + "90" }}
                      thumbColor={privacy.showStats ? colors.primary : colors.textMuted}
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

                  {/* Show Activity */}
                  <View style={[styles.menuItem, { justifyContent: "space-between" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                      <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceLight }]}>
                        <Ionicons name="pulse-outline" size={18} color={colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuLabel, { color: colors.text }]}>Show Activity</Text>
                        <Text style={[styles.menuSublabel, { color: colors.textMuted }]}>Comments and recent interactions</Text>
                      </View>
                    </View>
                    <Switch
                      value={privacy.showActivity}
                      onValueChange={(v) => handlePrivacyToggle("showActivity", v)}
                      trackColor={{ false: colors.surfaceBorder, true: colors.primary + "90" }}
                      thumbColor={privacy.showActivity ? colors.primary : colors.textMuted}
                    />
                  </View>
                </>
              )}

            </View>

            {/* Social Links */}
            <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, marginTop: 10 }]}>
              <SettingsMenuItem
                icon="people-outline"
                label="My Friends"
                sublabel="View and manage your friend list"
                onPress={() => safePush("/friends")}
              />
              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
              <SettingsMenuItem
                icon="person-add-outline"
                label="Find People"
                sublabel="Search for friends by username"
                onPress={() => safePush("/search")}
              />
            </View>
          </View>
        )}

        {/* Account Section */}
        {user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <SettingsMenuItem
                icon="person-outline"
                label="Account Management"
                sublabel="Delete account, manage data"
                onPress={() => setSection("account")}
              />
              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
              <SettingsMenuItem
                icon="heart-outline"
                label="Following"
                sublabel="QR codes you're tracking"
                onPress={() => setSection("following")}
              />
            </View>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>HELP & SUPPORT</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <SettingsMenuItem
              icon="book-outline"
              label="User Guide"
              sublabel="Step-by-step usage guide"
              onPress={() => setSection("guide")}
            />
            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
            <SettingsMenuItem
              icon="shield-checkmark-outline"
              label="Trust Scores Explained"
              sublabel="How safety ratings are calculated"
              onPress={() =>
                Alert.alert(
                  "Trust Scores",
                  "Trust scores are calculated using community reports weighted by account confidence. More reporters = more accurate score. Single-reporter codes show 'Likely Safe' or 'Uncertain'."
                )
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
            <SettingsMenuItem
              icon="chatbubble-outline"
              label="Send Feedback"
              sublabel="Report bugs or suggest features"
              onPress={() => setSection("feedback")}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PREFERENCES</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={[styles.menuItem, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>Haptic Feedback</Text>
                  <Text style={[styles.menuSublabel, { color: colors.textMuted }]}>Vibration on interactions</Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary + "90" }}
                thumbColor={hapticsEnabled ? colors.primary : colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DATA</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <SettingsMenuItem
              icon="trash-outline"
              label="Clear Local Data"
              sublabel="Remove scan history from this device"
              onPress={handleClearData}
              danger
            />
          </View>
        </View>

        {/* Sign Out */}
        {user && (
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOutBtn, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "25", opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
          </Pressable>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryShade]}
            style={styles.footerBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.footerBadgeText}>QR Guard</Text>
          </LinearGradient>
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>v1.0.0 · Scan smart. Stay safe.</Text>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}
