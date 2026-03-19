import { View, Text, Pressable, ScrollView, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useSettings } from "@/hooks/useSettings";
import { settingsStyles as styles } from "@/features/settings/styles";
import SettingsMenuItem from "@/features/settings/components/SettingsMenuItem";
import AccountSection from "@/features/settings/components/AccountSection";
import GuideSection from "@/features/settings/components/GuideSection";
import FeedbackSection from "@/features/settings/components/FeedbackSection";
import FollowingSection from "@/features/settings/components/FollowingSection";
import CommentsSection from "@/features/settings/components/CommentsSection";
import HistorySection from "@/features/settings/components/HistorySection";

const SECTION_TITLES: Record<string, string> = {
  account: "Account Management",
  guide: "How It Works",
  feedback: "Send Feedback",
  following: "Following",
  comments: "My Comments",
  history: "My History",
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const {
    user, section, setSection,
    feedbackText, setFeedbackText,
    feedbackEmail, setFeedbackEmail,
    feedbackSubmitting, feedbackDone,
    followingList, followingLoading,
    myComments, commentsLoading,
    myHistory, historyLoading,
    deleteConfirmText, setDeleteConfirmText,
    handleSignOut, handleClearData,
    handleSubmitFeedback,
    handleDeleteComment, handleDeleteAllComments,
    handleDeleteHistoryItem, handleDeleteAllHistory,
    handleDeleteAccount,
  } = useSettings();

  if (section !== "main") {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => setSection("main")} style={styles.navBackBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
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
        <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          {user ? (
            <View style={styles.menuGroup}>
              <View style={styles.accountCard}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{user.displayName}</Text>
                  <Text style={styles.accountEmail}>{user.email}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={Colors.dark.safe} />
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
              <View style={styles.signInIcon}>
                <Ionicons name="person-outline" size={24} color={Colors.dark.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.signInTitle}>Sign in to your account</Text>
                <Text style={styles.signInSub}>Access full features — comment, report, sync history</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
            </Pressable>
          )}
        </View>

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
              onPress={() =>
                Alert.alert(
                  "Trust Scores",
                  "Trust scores are calculated using community reports weighted by confidence. A QR code with more reporters gets a more accurate score. Single-reporter codes show 'Likely Safe' or 'Uncertain' rather than 100% scores."
                )
              }
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

        {user && (
          <View style={styles.section}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.dark.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>QR Guard v1.0.0</Text>
          <Text style={styles.footerSubtext}>Scan smart. Stay safe.</Text>
          <Text style={[styles.footerSubtext, { textAlign: "center", marginTop: 8, paddingHorizontal: 16, lineHeight: 18 }]}>
            QR Guard provides informational analysis only. Trust scores reflect community opinion, not verified fact. You are solely responsible for all decisions made after scanning a QR code. By using this app you agree to our Terms of Service.
          </Text>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}
