import React, { useState, useMemo, memo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import type { QrTemplate } from "@/features/generator/types/template-types";

interface Props {
  templates: QrTemplate[];
  onPickTemplate: (t: QrTemplate) => void;
}

function HomeView({ templates, onPickTemplate }: Props) {
  const { colors, isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const s = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q)
    );
  }, [templates, search]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: sp(16), paddingBottom: sp(24), gap: sp(10) }}
    >
      {/* Search bar */}
      <Animated.View entering={FadeInDown.duration(200)}>
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
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Divider */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginVertical: sp(2) }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
        <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
          {filtered.length} TEMPLATE{filtered.length !== 1 ? "S" : ""}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
      </View>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: sp(32), gap: sp(8) }}>
          <Ionicons name="search-outline" size={rf(32)} color={colors.textMuted} />
          <Text style={{ fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.textMuted }}>No templates found</Text>
          <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Try a different search term</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(8) }}>
          {filtered.map((t, idx) => (
            <Animated.View key={t.id} entering={FadeInDown.duration(200).delay(idx * 15)} style={{ width: "47.5%" }}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPickTemplate(t); }}
                style={({ pressed }) => ({
                  borderRadius: sp(16), borderWidth: 1,
                  borderColor: pressed ? t.color + "60" : colors.surfaceBorder,
                  backgroundColor: pressed ? t.color + "0D" : colors.surface,
                  padding: sp(12), flexDirection: "row", alignItems: "center", gap: sp(10),
                  opacity: pressed ? 0.86 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View style={{ width: sp(36), height: sp(36), borderRadius: sp(11), backgroundColor: t.color + "18", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={t.icon as any} size={rf(18)} color={t.color} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.text }} numberOfLines={1}>{t.name}</Text>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>{t.tagline}</Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default memo(HomeView);
