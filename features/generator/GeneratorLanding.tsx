import React, { useState, useMemo } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput, useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useTopInset } from "@/lib/utils/platform";
import * as Haptics from "@/lib/haptics";
import { TEMPLATES } from "@/features/templates";

const CATEGORIES = ["All", "Payment", "Social", "Comm", "Work", "Media", "Business", "Misc"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  All:      "All",
  Payment:  "Payments",
  Social:   "Social",
  Comm:     "Messaging",
  Work:     "Meetings",
  Media:    "Media",
  Business: "Business",
  Misc:     "Other",
};

export default function GeneratorLanding() {
  const { colors, isDark } = useTheme();
  const insets    = useSafeAreaInsets();
  const topInset  = useTopInset();
  const { width: screenW } = useWindowDimensions();
  const s   = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf  = (n: number) => Math.round(n * s);
  const sp  = (n: number) => Math.round(n * s);
  const tabBarHeight = 62 + insets.bottom + 8;

  const [search, setSearch]               = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      const matchCat    = activeCategory === "All" || t.category === activeCategory;
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  function onPickTemplate(t: typeof TEMPLATES[0]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/qr-generator/standard?tid=${t.id}` as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topInset }}>

      {/* ── NavBar ─────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: sp(22), paddingVertical: sp(14), paddingBottom: sp(10), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
            QR Generator
          </Text>
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 2 }}>
            {TEMPLATES.length} templates — tap one to get started
          </Text>
        </View>
        <View style={{ width: sp(38), height: sp(38), borderRadius: sp(12), alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary + "40" }}>
          <MaterialCommunityIcons name="qrcode-edit" size={rf(16)} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: sp(16), paddingBottom: tabBarHeight + 24, gap: sp(10) }}
      >

        {/* ── AI Builder card ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(200)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/qr-generator/standard?ai=1" as any);
            }}
            style={({ pressed }) => ({
              borderRadius: sp(20), overflow: "hidden",
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#7C3AED", "#4F46E5"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: sp(18) }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12) }}>
                <View style={{ width: sp(48), height: sp(48), borderRadius: sp(16), backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="sparkles" size={rf(24)} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: "#fff" }}>
                    AI Builder
                  </Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: sp(2) }}>
                    Describe what you want — AI builds it
                  </Text>
                </View>
                <View style={{ backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: sp(10), paddingVertical: sp(4), borderRadius: sp(20) }}>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: "#fff" }}>AI</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── Private QR row ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(180)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/qr-generator/private" as any);
            }}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: sp(12),
              borderRadius: sp(16), borderWidth: 1,
              borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface,
              padding: sp(14),
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ width: sp(38), height: sp(38), borderRadius: sp(12), backgroundColor: colors.textMuted + "18", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="eye-off-outline" size={rf(18)} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.text }}>
                Private QR
              </Text>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
                Zero data · no account needed · fully offline
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(180)}>
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
              placeholder="Search 35 templates…"
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

        {/* ── Category pills ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(160)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: sp(6), paddingVertical: sp(2) }}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(cat);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: sp(14), paddingVertical: sp(7),
                    borderRadius: sp(20),
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? colors.primary + "80" : colors.surfaceBorder,
                    backgroundColor: active ? colors.primaryDim : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: rf(12),
                    fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
                    color: active ? colors.primary : colors.textSecondary,
                  }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── Count divider ────────────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginTop: sp(2) }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
          <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
            {filtered.length} TEMPLATE{filtered.length !== 1 ? "S" : ""}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
        </View>

        {/* ── Template grid ────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: sp(32), gap: sp(8) }}>
            <Ionicons name="search-outline" size={rf(32)} color={colors.textMuted} />
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
              No templates found
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(8) }}>
            {filtered.map((t, idx) => (
              <Animated.View
                key={t.id}
                entering={FadeInDown.duration(200).delay(idx * 12)}
                style={{ width: "47.5%" }}
              >
                <Pressable
                  onPress={() => onPickTemplate(t)}
                  style={({ pressed }) => ({
                    borderRadius: sp(16), borderWidth: 1,
                    borderColor: pressed ? t.color + "60" : colors.surfaceBorder,
                    backgroundColor: pressed ? t.color + "0D" : colors.surface,
                    padding: sp(12),
                    flexDirection: "row", alignItems: "center", gap: sp(10),
                    opacity: pressed ? 0.86 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    minHeight: sp(64),
                  })}
                >
                  <View style={{
                    width: sp(36), height: sp(36), borderRadius: sp(11),
                    backgroundColor: t.color + "18",
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Ionicons name={t.icon as any} size={rf(18)} color={t.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.text }} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>
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
