import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
    sub: "Save & share secure, verifiable QR codes",
    icon: "shield-checkmark-outline" as const,
    fromC: "#1D4ED8",
    toC: "#3B82F6",
    accent: "#93C5FD",
    route: "./standard",
    requiresAuth: false,
  },
  {
    key: "business" as QrMode,
    label: "Business QR",
    sub: "Smart redirect QR codes for your business",
    icon: "storefront-outline" as const,
    fromC: "#92400E",
    toC: "#D97706",
    accent: "#FDE68A",
    route: "./business",
    requiresAuth: true,
  },
  {
    key: "private" as QrMode,
    label: "Private QR",
    sub: "No tracking, no data saved — fully offline",
    icon: "eye-off-outline" as const,
    fromC: "#1E293B",
    toC: "#475569",
    accent: "#CBD5E1",
    route: "./private",
    requiresAuth: false,
  },
] as const;

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
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>Create secure QR codes</Text>
        </View>
      </View>

      {/* ── Landing cards ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        <Reanimated.View entering={FadeIn.duration(280)} style={styles.cardList}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>What would you like to create?</Text>

          {LANDING_MODES.map((m, idx) => {
            const disabled = m.requiresAuth && !user;
            return (
              <Reanimated.View key={m.key} entering={FadeInDown.duration(320).delay(idx * 70)}>
                <Pressable
                  onPress={() => !disabled && router.push(m.route as any)}
                  style={({ pressed }) => ({
                    borderRadius: 22,
                    overflow: "hidden" as const,
                    opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
                    transform: [{ scale: pressed && !disabled ? 0.975 : 1 }],
                  })}
                >
                  <LinearGradient
                    colors={[m.fromC, m.toC]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                  >
                    <View style={styles.cardIconWrap}>
                      <Ionicons name={m.icon} size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.cardTitle}>{m.label}</Text>
                      <Text style={styles.cardSub} numberOfLines={2}>{m.sub}</Text>
                      {disabled && (
                        <Text style={[styles.cardLock, { color: m.accent }]}>
                          Sign in to use Business QR
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
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
    },
    navTitle: { fontSize: rf(20), fontFamily: "Inter_700Bold" },
    navSubtitle: {
      fontSize: rf(12),
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    scrollContent: { paddingHorizontal: 0, paddingTop: 4 },
    cardList: {
      paddingHorizontal: 20,
      paddingTop: 8,
      gap: 14,
    },
    sectionLabel: {
      fontSize: rf(13),
      fontFamily: "Inter_500Medium",
      letterSpacing: 0.2,
      marginBottom: 4,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingHorizontal: 20,
      paddingVertical: 22,
      borderRadius: 22,
    },
    cardIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    cardTitle: {
      fontSize: rf(16),
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    cardSub: {
      fontSize: rf(12),
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.72)",
      lineHeight: 17,
    },
    cardLock: {
      fontSize: rf(11),
      fontFamily: "Inter_600SemiBold",
      marginTop: 2,
    },
  });
}
