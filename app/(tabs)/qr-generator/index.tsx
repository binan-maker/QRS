import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

type QrMode = "individual" | "business" | "private";

const LANDING_MODES = [
  {
    key: "individual" as QrMode,
    label: "Standard QR",
    tagline: "Personal & shareable",
    badge: "",
    badgeColor: "#22C55E",
    icon: "shield-checkmark" as const,
    mcIcon: null,
    fromC: "#1D4ED8",
    toC: "#3B82F6",
    midC: "#2563EB",
    features: ["Saved to your account", "Trust score & analytics", "Community safety check"],
    route: "/qr-standard",
    requiresAuth: false,
  },
  {
    key: "business" as QrMode,
    label: "Business QR",
    tagline: "Smart redirect codes",
    badge: "PRO",
    badgeColor: "#F59E0B",
    icon: "storefront" as const,
    mcIcon: null,
    fromC: "#92400E",
    toC: "#F59E0B",
    midC: "#D97706",
    features: ["Update destination anytime", "Scan analytics dashboard", "Branded with your logo"],
    route: "/qr-business",
    requiresAuth: true,
  },
  {
    key: "private" as QrMode,
    label: "Private QR",
    tagline: "Zero data, fully offline",
    badge: "OFFLINE",
    badgeColor: "#94A3B8",
    icon: "eye-off" as const,
    mcIcon: null,
    fromC: "#1E293B",
    toC: "#475569",
    midC: "#334155",
    features: ["No account needed", "Nothing stored anywhere", "Instant & anonymous"],
    route: "/qr-private",
    requiresAuth: false,
  },
] as const;

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={featureRowStyles.row}>
      <View style={featureRowStyles.dot} />
      <Text style={featureRowStyles.text} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const featureRowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)", flexShrink: 0 },
  text: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", flex: 1 },
});

export default function QrGeneratorLanding() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  const styles = useMemo(() => makeStyles(colors, width), [colors, width]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      {/* ── Header ── */}
      <View style={styles.navBar}>
        <View>
          <Text style={[styles.navTitle, { color: colors.text }]}>QR Generator</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>Create secure, verifiable codes</Text>
        </View>
        <View style={[styles.navBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
          <MaterialCommunityIcons name="qrcode-edit" size={16} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        <Reanimated.View entering={FadeIn.duration(280)} style={styles.cardList}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Choose a type to get started</Text>

          {LANDING_MODES.map((m, idx) => {
            const disabled = m.requiresAuth && !user;
            return (
              <Reanimated.View key={m.key} entering={FadeInDown.duration(340).delay(idx * 90)}>
                <Pressable
                  onPress={() => !disabled && router.push(m.route as any)}
                  style={({ pressed }) => ({
                    borderRadius: 24,
                    overflow: "hidden" as const,
                    opacity: disabled ? 0.5 : pressed ? 0.91 : 1,
                    transform: [{ scale: pressed && !disabled ? 0.972 : 1 }],
                    shadowColor: m.toC,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: pressed ? 0.15 : 0.28,
                    shadowRadius: 18,
                    elevation: pressed ? 4 : 8,
                  })}
                >
                  <LinearGradient
                    colors={[m.fromC, m.midC, m.toC]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                  >
                    {/* Decorative glow circle top-right */}
                    <View style={styles.cardGlow} />

                    {/* Top row: icon + badge + arrow */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardIconWrap}>
                        <Ionicons name={m.icon} size={30} color="#fff" />
                      </View>
                      {m.badge ? (
                        <View style={[styles.badgeWrap, { backgroundColor: m.badgeColor + "30", borderColor: m.badgeColor + "60" }]}>
                          <Text style={[styles.badgeText, { color: m.badgeColor }]}>{m.badge}</Text>
                        </View>
                      ) : null}
                      <View style={{ flex: 1 }} />
                      <View style={styles.arrowCircle}>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </View>
                    </View>

                    {/* Title + tagline */}
                    <View style={styles.cardTitleBlock}>
                      <Text style={styles.cardTitle}>{m.label}</Text>
                      <Text style={styles.cardTagline}>{m.tagline}</Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Feature list */}
                    <View style={styles.featureList}>
                      {m.features.map((f) => <FeatureRow key={f} text={f} />)}
                    </View>

                    {/* Auth lock notice */}
                    {disabled && (
                      <View style={styles.lockRow}>
                        <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.lockText}>Sign in to unlock Business QR</Text>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </Reanimated.View>
            );
          })}
        </Reanimated.View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any, width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1 },
    navBar: {
      paddingHorizontal: 22,
      paddingVertical: 14,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navTitle: { fontSize: rf(21), fontFamily: "Inter_700Bold" },
    navSubtitle: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginTop: 2 },
    navBadge: {
      width: 38, height: 38, borderRadius: 12,
      alignItems: "center", justifyContent: "center", borderWidth: 1,
    },
    scrollContent: { paddingTop: 4 },
    cardList: { paddingHorizontal: 18, paddingTop: 4, gap: 16 },
    sectionLabel: {
      fontSize: rf(12), fontFamily: "Inter_500Medium",
      letterSpacing: 0.4, marginBottom: 2, textTransform: "uppercase",
    },
    card: {
      borderRadius: 24, padding: 20,
      overflow: "hidden", position: "relative",
    },
    cardGlow: {
      position: "absolute", top: -40, right: -40,
      width: 130, height: 130, borderRadius: 65,
      backgroundColor: "rgba(255,255,255,0.07)",
    },
    cardTopRow: {
      flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16,
    },
    cardIconWrap: {
      width: 56, height: 56, borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    badgeWrap: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 100, borderWidth: 1,
    },
    badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
    arrowCircle: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center", justifyContent: "center",
    },
    cardTitleBlock: { gap: 4, marginBottom: 14 },
    cardTitle: { fontSize: rf(20), fontFamily: "Inter_700Bold", color: "#fff" },
    cardTagline: { fontSize: rf(13), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)" },
    cardDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255,255,255,0.2)",
      marginBottom: 14,
    },
    featureList: { gap: 7 },
    lockRow: {
      flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12,
    },
    lockText: {
      fontSize: rf(11), fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.6)",
    },
  });
}
