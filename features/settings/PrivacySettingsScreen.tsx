import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { router } from "expo-router";
import { safePush } from "@/shared/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getPrivacySettings,
  updatePrivacySettings,
  PrivacySettings,
} from "@/services/user-service";
import {
  getCachedPrivacySettings,
  setCachedPrivacySettings,
  invalidatePrivacyCache,
} from "@/services/cache/qr-cache";
import PrivacyToggleRow from "@/features/settings/components/PrivacyToggleRow";
import { privacySettingsStyles as styles } from "@/features/settings/privacySettingsStyles";

const VISIBILITY_KEYS: Array<keyof PrivacySettings> = [
  "showStats", "showFriendsCount", "showScanActivity", "showRanking", "showActivity",
];

const DEFAULT_PRIVACY: PrivacySettings = {
  isPrivate: false,
  showQrCodes: true,
  showStats: true,
  showActivity: true,
  showRanking: true,
  showScanActivity: true,
  showFriendsCount: true,
};

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const topInset = useTopInset();

  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  // `loading` is only true on the very first load when there is no cached data.
  // Subsequent background refreshes use `refreshing` so the UI never blanks.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Always-current ref so the toggle callback never reads stale closure state.
  const privacyRef      = useRef(privacy);
  privacyRef.current    = privacy;
  // Gate: only one save in flight at a time.
  const saveInFlightRef = useRef(false);
  // Track whether the screen is mounted to prevent async state after unmount.
  const mountedRef      = useRef(true);
  // Timestamp of the last Firestore fetch — used for staleness check on focus.
  const lastFetchRef    = useRef<number>(0);
  const STALE_MS        = 5 * 60 * 1000; // matches TTL_PRIVACY in qr-cache

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Cache-first load ────────────────────────────────────────────────────────
  // On first mount for a user:
  //   1. Read cache — if hit, show immediately (no spinner).
  //   2. Always do a background Firestore fetch to keep the cache fresh.
  //      If there was no cache the user sees the spinner only for that first fetch.
  const fetchSettings = useCallback(async (force = false) => {
    if (!user) return;
    const uid = user.id;

    // Step 1: populate from cache if available
    if (!force) {
      const cached = await getCachedPrivacySettings<PrivacySettings>(uid);
      if (cached && mountedRef.current) {
        setPrivacy(cached);
        setLoading(false);
        // Still continue to a background Firestore refresh if stale
        if (Date.now() - lastFetchRef.current < STALE_MS) return;
      }
    }

    // Step 2: fetch from Firestore (background if we already have cache)
    try {
      const fresh = await getPrivacySettings(uid);
      if (!mountedRef.current) return;
      setPrivacy(fresh);
      lastFetchRef.current = Date.now();
      setCachedPrivacySettings<PrivacySettings>(uid, fresh).catch(() => {});
    } catch {
      // Network/offline: silently keep whatever we showed from cache
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    lastFetchRef.current = 0;
    fetchSettings();
  }, [user?.id, fetchSettings]);

  // Background refresh on re-focus (only when stale)
  useFocusEffect(
    useCallback(() => {
      if (!user || Date.now() - lastFetchRef.current < STALE_MS) return;
      fetchSettings();
    }, [user?.id, fetchSettings])
  );

  // Clear local state when user changes so no previous account's settings flash
  useEffect(() => {
    setPrivacy(DEFAULT_PRIVACY);
    setLoading(true);
  }, [user?.id]);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (!user || refreshing) return;
    setRefreshing(true);
    fetchSettings(true);
  }, [user, refreshing, fetchSettings]);

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(
    async (key: keyof PrivacySettings, val: boolean) => {
      if (!user || saveInFlightRef.current) return;
      const current = privacyRef.current;
      if (!val && VISIBILITY_KEYS.includes(key)) {
        const remaining = VISIBILITY_KEYS.filter((k) => k !== key && current[k]);
        if (remaining.length === 0) {
          Alert.alert("At least one visible", "You must keep at least one profile section visible.");
          return;
        }
      }
      const snapshot = current;
      const updated  = { ...current, [key]: val };
      setPrivacy(updated);
      saveInFlightRef.current = true;
      setSaving(true);
      try {
        await updatePrivacySettings(user.id, updated);
        // Keep cache in sync after a successful save
        setCachedPrivacySettings<PrivacySettings>(user.id, updated).catch(() => {});
      } catch {
        // Roll back both local state and cache
        if (mountedRef.current) setPrivacy(snapshot);
        invalidatePrivacyCache(user.id);
        Alert.alert("Error", "Could not save privacy settings.");
      } finally {
        if (mountedRef.current) {
          saveInFlightRef.current = false;
          setSaving(false);
        }
      }
    },
    [user]
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile" as any);
  }, []);

  // ── Guest view ──────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable
            onPress={handleBack}
            style={[styles.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Privacy & Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in required</Text>
          <Pressable
            onPress={() => safePush("/(auth)/login")}
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.signInBtnText, { color: colors.primaryText }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Authenticated view ──────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      {/* Nav */}
      <View style={styles.navBar}>
        <Pressable
          onPress={handleBack}
          style={[styles.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Privacy & Settings</Text>
        <View style={styles.navRight}>
          {saving && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
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
              <PrivacyToggleRow
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
                  <PrivacyToggleRow
                    icon="bar-chart-outline"
                    iconColor={colors.primary}
                    iconBg={colors.primaryDim}
                    label="Show Stats"
                    sublabel="QR codes, scans, and likes on your profile"
                    value={privacy.showStats}
                    onValueChange={(v) => handleToggle("showStats", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <PrivacyToggleRow
                    icon="people-outline"
                    iconColor={colors.safe}
                    iconBg={colors.safeDim}
                    label="Show Friends Count"
                    sublabel="Display how many friends you have"
                    value={privacy.showFriendsCount}
                    onValueChange={(v) => handleToggle("showFriendsCount", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <PrivacyToggleRow
                    icon="scan-outline"
                    iconColor={colors.accent}
                    iconBg={colors.accentDim}
                    label="Show Scan Activity"
                    sublabel="Display your personal scan count publicly"
                    value={privacy.showScanActivity}
                    onValueChange={(v) => handleToggle("showScanActivity", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <PrivacyToggleRow
                    icon="trophy-outline"
                    iconColor={colors.warning}
                    iconBg={colors.warningDim ?? colors.accentDim}
                    label="Show Ranking"
                    sublabel="Display your rank among friends publicly"
                    value={privacy.showRanking}
                    onValueChange={(v) => handleToggle("showRanking", v)}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                  <PrivacyToggleRow
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
            onPress={() => safePush("/account-management")}
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
            onPress={() => safePush("/(tabs)/settings" as any)}
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
