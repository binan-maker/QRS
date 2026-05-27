import React, { memo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { QR_PRESETS } from "@/features/generator/data/presets";

interface QuickType {
  presetIdx: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  badgeColor?: string;
  accent?: string;
}

const INDIA_QUICK_TYPES: QuickType[] = [
  {
    presetIdx: 7,
    label: "UPI Pay",
    icon: "card-outline",
    badge: "NPCI",
    badgeColor: "#8B5CF6",
    accent: "#8B5CF6",
  },
  {
    presetIdx: 24,
    label: "BharatQR",
    icon: "shield-checkmark-outline",
    badge: "Certified",
    badgeColor: "#10B981",
    accent: "#10B981",
  },
  {
    presetIdx: 25,
    label: "Reviews",
    icon: "star-outline",
    badge: "Google",
    badgeColor: "#F59E0B",
    accent: "#F59E0B",
  },
  {
    presetIdx: 26,
    label: "Menu",
    icon: "restaurant-outline",
    accent: "#EC4899",
  },
];

const UNIVERSAL_QUICK_TYPES: QuickType[] = [
  { presetIdx: 1,  label: "Link",     icon: "link-outline"    },
  { presetIdx: 5,  label: "WhatsApp", icon: "logo-whatsapp"   },
  { presetIdx: 6,  label: "WiFi",     icon: "wifi-outline"    },
  { presetIdx: 9,  label: "Contact",  icon: "person-outline"  },
  { presetIdx: 0,  label: "Text",     icon: "text-outline"    },
];

const ALL_QUICK_IDXS = new Set([
  ...INDIA_QUICK_TYPES.map((q) => q.presetIdx),
  ...UNIVERSAL_QUICK_TYPES.map((q) => q.presetIdx),
]);

interface Props {
  selectedPreset: number;
  qrMode: "individual" | "business" | "private";
  onSelectPreset: (idx: number) => void;
  onOpenTemplates: () => void;
}

function SmartTemplateBar({ selectedPreset, qrMode, onSelectPreset, onOpenTemplates }: Props) {
  const { colors } = useTheme();

  if (qrMode === "business") return null;

  const selectedFromFull = !ALL_QUICK_IDXS.has(selectedPreset);

  function handleSelect(idx: number) {
    onSelectPreset(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function renderChip(qt: QuickType, idx: number) {
    const active = selectedPreset === qt.presetIdx;
    const accent = qt.accent ?? colors.primary;
    return (
      <Pressable
        key={qt.presetIdx}
        onPress={() => handleSelect(qt.presetIdx)}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: active ? accent + "18" : colors.surface,
            borderColor: active ? accent + "80" : colors.surfaceBorder,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons
          name={qt.icon}
          size={14}
          color={active ? accent : colors.textMuted}
        />
        <Text style={[styles.chipText, { color: active ? accent : colors.textSecondary }]}>
          {qt.label}
        </Text>
        {qt.badge ? (
          <View style={[styles.badge, { backgroundColor: (qt.badgeColor ?? accent) + "22" }]}>
            <Text style={[styles.badgeText, { color: qt.badgeColor ?? accent }]}>
              {qt.badge}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* India Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.flagEmoji}>🇮🇳</Text>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>India Business</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { marginBottom: 10 }]}
      >
        {INDIA_QUICK_TYPES.map(renderChip)}
      </ScrollView>

      {/* Universal Section */}
      <View style={styles.sectionHeader}>
        <Ionicons name="globe-outline" size={11} color={colors.textMuted} />
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QR Type</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {UNIVERSAL_QUICK_TYPES.map(renderChip)}

        {selectedFromFull && (
          <Pressable
            style={[styles.chip, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "80" }]}
          >
            <Ionicons
              name={QR_PRESETS[selectedPreset]?.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={colors.primary}
            />
            <Text style={[styles.chipText, { color: colors.primary }]}>
              {QR_PRESETS[selectedPreset]?.label}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onOpenTemplates}
          style={({ pressed }) => [
            styles.chip,
            styles.moreChip,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="apps-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.chipText, { color: colors.textMuted }]}>More</Text>
          <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default memo(SmartTemplateBar);

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  flagEmoji: { fontSize: 11 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  badge: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  moreChip: {},
});
