import { View, Text, Pressable, ScrollView, Platform, Alert, Switch, ActivityIndicator } from "react-native";
import { router } from "expo-router";
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
import ProfileSettingsSection from "@/features/settings/components/ProfileSettingsSection";

const SECTION_TITLES: Record<string, string> = {
  profile: "Profile Settings",
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

        {section === "profile" && <ProfileSettingsSection />}
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
            onPress={() => router.push("/(auth)/login")}
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

        {/* Profile Settings Section */}
        {user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PROFILE</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <SettingsMenuItem
                icon="person-circle-outline"
                label="Profile Settings"
                sublabel="Name, username, bio, and privacy"
                onPress={() => setSection("profile")}
              />
            </View>
          </View>
        )}

        {/* Library Section */}
        {user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LIBRARY</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <SettingsMenuItem
                icon="heart-outline"
                label="Favorites"
                sublabel="QR codes you've saved"
                onPress={() => router.push("/favorites" as any)}
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
                icon="notifications-outline"
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
