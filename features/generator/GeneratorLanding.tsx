import React, { useState, useMemo } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput, useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useTopInset } from "@/lib/utils/platform";
import * as Haptics from "@/lib/haptics";
import { TEMPLATES } from "@/features/templates";
import { LANDING_MODES } from "@/features/generator/data/landing-modes";
import { useAuth } from "@/contexts/AuthContext";
import FeatureRow from "@/features/generator/components/FeatureRow";

export default function GeneratorLanding() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();
  const topInset = useTopInset();
  const { width: screenW } = useWindowDimensions();
  const s  = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const tabBarHeight = 62 + insets.bottom + 8;

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter((t) =>
      t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q)
    );
  }, [search]);

  function onPickTemplate(t: typeof TEMPLATES[0]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/qr-generator/standard?tid=${t.id}` as any);
  }

  function onPressMode(route: string, requiresAuth: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (requiresAuth && !user) {
      router.push("/(auth)/login" as any);
      return;
    }
    router.push(route as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topInset }}>

      {/* ── NavBar ──────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(260)}
        style={{
          paddingHorizontal: sp(22), paddingVertical: sp(14), paddingBottom: sp(10),
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Animated.View entering={FadeInDown.delay(40).duration(260)}>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
            QR Generator
          </Text>
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 2 }}>
            Choose a mode or pick a template below
          </Text>
        </Animated.View>
        <Animated.View
          entering={FadeIn.delay(50).duration(240)}
          style={{
            width: sp(38), height: sp(38), borderRadius: sp(12),
            alignItems: "center", justifyContent: "center",
            backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary + "40",
          }}
        >
          <MaterialCommunityIcons name="qrcode-edit" size={rf(16)} color={colors.primary} />
        </Animated.View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: sp(16), paddingBottom: tabBarHeight + 24, gap: sp(12) }}
      >

        {/* ── Mode cards (Standard QR + Private QR) ───────────────────── */}
        {LANDING_MODES.map((m, idx) => (
          <Animated.View key={m.key} entering={FadeInDown.delay(40 + Math.min(idx, 3) * 25).duration(260)}>
            <Pressable
              onPress={() => onPressMode(m.route, m.key === "individual")}
              style={({ pressed }) => ({
                borderRadius: sp(22),
                overflow: "hidden",
                opacity: pressed ? 0.91 : 1,
                transform: [{ scale: pressed ? 0.972 : 1 }],
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
                style={{ borderRadius: sp(22), padding: sp(20), overflow: "hidden", position: "relative" }}
              >
                {/* Glow blob */}
                <View style={{
                  position: "absolute", top: -40, right: -40,
                  width: 130, height: 130, borderRadius: 65,
                  backgroundColor: "rgba(255,255,255,0.07)",
                }} />

                {/* Top row: icon + badge + arrow */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12), marginBottom: sp(16) }}>
                  <View style={{
                    width: sp(56), height: sp(56), borderRadius: sp(18),
                    backgroundColor: "rgba(255,255,255,0.18)",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Ionicons name={m.icon} size={rf(28)} color="#fff" />
                  </View>
                  {m.badge ? (
                    <View style={{
                      paddingHorizontal: sp(10), paddingVertical: sp(4), borderRadius: 100,
                      borderWidth: 1,
                      backgroundColor: m.badgeColor + "30",
                      borderColor: m.badgeColor + "60",
                    }}>
                      <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: m.badgeColor, letterSpacing: 0.8 }}>
                        {m.badge}
                      </Text>
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }} />
                  <View style={{
                    width: sp(34), height: sp(34), borderRadius: sp(17),
                    backgroundColor: "rgba(255,255,255,0.18)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="arrow-forward" size={rf(16)} color="#fff" />
                  </View>
                </View>

                {/* Title + tagline */}
                <View style={{ gap: sp(4), marginBottom: sp(14) }}>
                  <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: "#fff" }}>
                    {m.label}
                  </Text>
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)" }}>
                    {m.tagline}
                  </Text>
                </View>

                {/* Divider */}
                <View style={{ height: 0.5, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: sp(14) }} />

                {/* Feature list */}
                <View style={{ gap: sp(7) }}>
                  {m.features.map((f) => <FeatureRow key={f} text={f} />)}
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ))}

        {/* ── Divider: "or pick a template" ───────────────────────────── */}
        <Animated.View entering={FadeIn.delay(80).duration(260)} style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
          <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
            OR CHOOSE A TEMPLATE
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
        </Animated.View>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(90).duration(260)}>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: sp(10),
            backgroundColor: isDark ? colors.surface : colors.surfaceLight,
            borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
            paddingHorizontal: sp(14), paddingVertical: sp(10),
          }}>
            <Ionicons name="search-outline" size={rf(16)} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search templates…"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.text }}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* ── Template grid ───────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <Animated.View entering={FadeIn.delay(100).duration(260)} style={{ alignItems: "center", paddingVertical: sp(32), gap: sp(8) }}>
            <Ionicons name="search-outline" size={rf(32)} color={colors.textMuted} />
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
              No templates found
            </Text>
          </Animated.View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(8) }}>
            {filtered.map((t, idx) => (
              <Animated.View
                key={t.id}
                entering={FadeInDown.delay(80 + Math.min(idx, 4) * 18).duration(260)}
                style={{ width: "47.5%" }}
              >
                <Pressable
                  onPress={() => onPickTemplate(t)}
                  style={({ pressed }) => ({
                    borderRadius: sp(16), borderWidth: 1,
                    borderColor: pressed ? t.color + "60" : colors.surfaceBorder,
                    backgroundColor: pressed ? t.color + "0D" : colors.surface,
                    padding: sp(14),
                    flexDirection: "row", alignItems: "center", gap: sp(10),
                    opacity: pressed ? 0.86 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    minHeight: sp(64),
                  })}
                >
                  <View style={{
                    width: sp(40), height: sp(40), borderRadius: sp(12),
                    backgroundColor: t.color + "18",
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Ionicons name={t.icon as any} size={rf(20)} color={t.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.text }} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                      {t.tagline}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
