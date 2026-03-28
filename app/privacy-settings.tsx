import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView, Switch, Platform,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPrivacySettings,
  updatePrivacySettings,
  PrivacySettings,
} from "@/lib/services/user-service";

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon, iconColor, iconBg, label, sublabel, value, onValueChange, disabled }: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.toggleRow, { opacity: disabled ? 0.45 : 1 }]}>
      <View style={[styles.toggleIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.toggleSub, { color: colors.textMuted }]}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceBorder, true: colors.primary + "99" }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    isPrivate: false,
    showQrCodes: true,
    showStats: true,
    showActivity: true,
    showRanking: true,
    showScanActivity: true,
    showFriendsCount: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPrivacySettings(user.id)
      .then(setPrivacy)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const VISIBILITY_KEYS: Array<keyof PrivacySettings> = [
    "showStats", "showFriendsCount", "showScanActivity", "showRanking", "showActivity",
  ];

  const handleToggle = useCallback(
    async (key: keyof PrivacySettings, val: boolean) => {
      if (!user) return;
      if (!val && VISIBILITY_KEYS.includes(key)) {
        const remainingEnabled = VISIBILITY_KEYS.filter((k) => k !== key && privacy[k]);
        if (remainingEnabled.length === 0) {
          Alert.alert("At least one visible", "You must keep at least one profile section visible.");
          return;
        }
      }
      const updated = { ...privacy, [key]: val };
      setPrivacy(updated);
      setSaving(true);
      try {
        await updatePrivacySettings(user.id, updated);
      } catch {
        setPrivacy(privacy);
        Alert.alert("Error", "Could not save privacy settings.");
      } finally {
        setSaving(false);
      }
    },
    [user, privacy]
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as any)}
            style={[styles.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Privacy & Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in required</Text>
          <Pressable onPress={() => router.push("/(auth)/login")}
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.signInBtnText, { color: colors.primaryText }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      {/* Nav */}
      <View style={styles.navBar}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as any)}
          style={[styles.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Privacy & Settings</Text>
        <View style={[styles.navRight]}>
          {saving && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* Profile Status Banner */}
        <LinearGradient
          colors={privacy.isPrivate
            ? (isDark ? ["#1A0A2E", "#0D0519"] : ["#F0EAFF", "#E8DFFF"])
            : (isDark ? ["#061929", "#04111F"] : ["#E4F3FF", "#EBF5FF"])}
          style={[styles.statusBanner, { borderColor: privacy.isPrivate ? colors.accent + "40" : colors.primary + "40" }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[styles.statusIconWrap, {
            backgroundColor: privacy.isPrivate ? colors.accentDim : colors.primaryDim,
          }]}>
            <Ionicons
              name={privacy.isPrivate ? "lock-closed" : "globe"}
              size={24}
              color={privacy.isPrivate ? colors.accent : colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: privacy.isPrivate ? colors.accent : colors.primary }]}>
              {privacy.isPrivate ? "Private Account" : "Public Account"}
            </Text>
            <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
              {privacy.isPrivate
                ? "Only friends can see your full profile"
                : "Anyone can view your public profile and stats"}
            </Text>
          </View>
        </LinearGradient>

        {/* ── PROFILE VISIBILITY ── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PROFILE VISIBILITY</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 24 }} />
          ) : (
            <>
              <ToggleRow
                icon={privacy.isPrivate ? "lock-closed-outline" : "globe-outline"}
                iconColor={privacy.isPrivate ? colors.accent : colors.primary}
                iconBg={privacy.isPrivate ? colors.accentDim : colors.primaryDim}
                label={privacy.isPrivate ? "Private Account" : "Public Account"}
                sublabel={privacy.isPrivate
                  ? "Only friends can see your full profile — everyone else sees your name and avatar only"
                  : "Your profile is visible to everyone worldwide (default)"}
                value={privacy.isPrivate}
                onValueChange={(v) => handleToggle("isPrivate", v)}
              />

              {!privacy.isPrivate && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <ToggleRow
                    icon="bar-chart-outline"
                    iconColor={colors.primary}
                    iconBg={colors.primaryDim}
                    label="Show Stats"
                    sublabel="QR codes, scans, and likes on your profile"
                    value={privacy.showStats}
                    onValueChange={(v) => handleToggle("showStats", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <ToggleRow
                    icon="people-outline"
                    iconColor={colors.safe}
                    iconBg={colors.safeDim}
                    label="Show Friends Count"
                    sublabel="Display how many friends you have"
                    value={privacy.showFriendsCount}
                    onValueChange={(v) => handleToggle("showFriendsCount", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <ToggleRow
                    icon="scan-outline"
                    iconColor={colors.accent}
                    iconBg={colors.accentDim}
                    label="Show Scan Activity"
                    sublabel="Display your personal scan count publicly"
                    value={privacy.showScanActivity}
                    onValueChange={(v) => handleToggle("showScanActivity", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <ToggleRow
                    icon="trophy-outline"
                    iconColor={colors.warning}
                    iconBg={colors.warningDim ?? colors.accentDim}
                    label="Show Ranking"
                    sublabel="Display your rank among friends publicly"
                    value={privacy.showRanking}
                    onValueChange={(v) => handleToggle("showRanking", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <ToggleRow
                    icon="pulse-outline"
                    iconColor={colors.textSecondary}
                    iconBg={colors.surfaceLight}
                    label="Show Activity"
                    sublabel="Comments and recent interactions"
                    value={privacy.showActivity}
                    onValueChange={(v) => handleToggle("showActivity", v)}
                  />
                </>
              )}
            </>
          )}
        </View>

        {/* ── ACCOUNT SETTINGS ── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Pressable
            onPress={() => router.push("/account-management" as any)}
            style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Account Management</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>Delete account, manage data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          <Pressable
            onPress={() => router.push("/settings" as any)}
            style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>App Settings</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>Theme, haptics, feedback, legal</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8,
  },
  navBackBtn: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  navTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  navRight: { width: 40, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  signInBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 22,
  },
  statusIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statusSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", letterSpacing: 1.4,
    marginBottom: 10, marginLeft: 4,
  },
  card: { borderRadius: 20, borderWidth: 1, marginBottom: 22, overflow: "hidden" },

  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  toggleIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginHorizontal: 16 },

  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  menuIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  leaderboardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  leaderboardHeaderIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  leaderboardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  leaderboardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  refreshBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  leaderboardEmpty: { alignItems: "center", gap: 8, paddingVertical: 24, paddingHorizontal: 20 },
  leaderboardEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  leaderboardRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 9, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  rankNum: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lbAvatar: { width: 44, height: 44, borderRadius: 14, overflow: "hidden", borderWidth: 1.5 },
  lbAvatarImg: { width: 44, height: 44 },
  lbAvatarGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  lbAvatarInitials: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  lbName: { fontSize: 14, fontFamily: "Inter_700Bold", flexShrink: 1 },
  lbUsername: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 1 },
  youBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  youBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lbScanWrap: { alignItems: "center", gap: 2 },
  lbScanCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  lbScanLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
