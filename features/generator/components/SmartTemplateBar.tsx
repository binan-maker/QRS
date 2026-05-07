import React, { memo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { QR_PRESETS } from "@/features/generator/data/presets";

const QUICK_TYPES: { presetIdx: number; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { presetIdx: 1, label: "Link",     icon: "link-outline"    },
  { presetIdx: 7, label: "UPI Pay",  icon: "card-outline"    },
  { presetIdx: 6, label: "WiFi",     icon: "wifi-outline"    },
  { presetIdx: 5, label: "WhatsApp", icon: "logo-whatsapp"   },
  { presetIdx: 9, label: "Contact",  icon: "person-outline"  },
  { presetIdx: 0, label: "Text",     icon: "text-outline"    },
];

const QUICK_IDXS = new Set(QUICK_TYPES.map((q) => q.presetIdx));

interface Props {
  selectedPreset: number;
  qrMode: "individual" | "business" | "private";
  onSelectPreset: (idx: number) => void;
  onOpenTemplates: () => void;
}

function SmartTemplateBar({ selectedPreset, qrMode, onSelectPreset, onOpenTemplates }: Props) {
  const { colors } = useTheme();

  if (qrMode === "business") return null;

  const selectedFromFull = selectedPreset > 0 && !QUICK_IDXS.has(selectedPreset);

  function handleSelect(idx: number) {
    onSelectPreset(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>QR Type</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {QUICK_TYPES.map((qt) => {
          const active = selectedPreset === qt.presetIdx;
          return (
            <Pressable
              key={qt.presetIdx}
              onPress={() => handleSelect(qt.presetIdx)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryDim : colors.surface,
                  borderColor: active ? colors.primary + "80" : colors.surfaceBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons
                name={qt.icon}
                size={14}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
                {qt.label}
              </Text>
            </Pressable>
          );
        })}

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
  container: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
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
  moreChip: {},
});
