import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  async function handleClearData() {
    Alert.alert(
      "Clear All Data",
      "This will remove all locally stored data including scan history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("local_scan_history");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          {user ? (
            <View style={styles.accountCard}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{user.displayName}</Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.dark.safe} />
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [
                styles.signInCard,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={styles.signInIcon}>
                <Ionicons name="person-outline" size={24} color={Colors.dark.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.signInTitle}>Sign in to your account</Text>
                <Text style={styles.signInSub}>
                  Access full features - comment, report, sync history
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APP</Text>

          <View style={styles.menuGroup}>
            <MenuItem
              icon="shield-checkmark-outline"
              label="About Trust Scores"
              sublabel="How QR code safety ratings work"
              onPress={() => {
                Alert.alert(
                  "Trust Scores",
                  "Trust scores are calculated based on community reports. When users scan a QR code, they can report it as Safe, Scam, Fake, or Spam. The trust score reflects the community consensus on the QR code's safety."
                );
              }}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="help-circle-outline"
              label="How It Works"
              sublabel="Learn about QR code scanning"
              onPress={() => {
                Alert.alert(
                  "How It Works",
                  "1. Scan any QR code using camera or gallery\n2. View the QR content and community trust score\n3. Read comments from other users\n4. Report suspicious QR codes to protect the community\n5. Sign in to comment, report, and sync your history"
                );
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="trash-outline"
              label="Clear Local Data"
              sublabel="Remove scan history from this device"
              onPress={handleClearData}
              danger
            />
          </View>
        </View>

        {user ? (
          <View style={styles.section}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutBtn,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.dark.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>QR Guard v1.0.0</Text>
          <Text style={styles.footerSubtext}>Scan smart. Stay safe.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.menuItem,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={22}
        color={danger ? Colors.dark.danger : Colors.dark.textSecondary}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.menuLabel, danger && { color: Colors.dark.danger }]}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.menuSublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.dark.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.dark.primaryDim,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  accountAvatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
  },
  accountName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  accountEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    padding: 4,
  },
  signInCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.dark.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  signInIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  signInTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  signInSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  menuGroup: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  menuSublabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.surfaceBorder,
    marginLeft: 52,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.dangerDim,
    paddingVertical: 16,
    borderRadius: 14,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.danger,
  },
  footer: {
    alignItems: "center",
    gap: 4,
    marginTop: 20,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
});
