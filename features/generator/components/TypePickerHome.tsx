import React, { memo } from "react";
import {
  View, Text, Pressable, StyleSheet, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

type QrMode = "individual" | "private";

interface ModeCard {
  key: QrMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MODES: ModeCard[] = [
  {
    key:   "individual",
    label: "Standard",
    icon:  "shield-checkmark-outline",
    color: "#3B82F6",
  },
  {
    key:   "private",
    label: "Private",
    icon:  "eye-off-outline",
    color: "#64748B",
  },
];

interface Props {
  qrMode: QrMode;
  onSetMode: (mode: QrMode) => void;
  onOpenTemplates: () => void;
  onOpenCustom: () => void;
  /** When true only the mode cards render — the action rows are hidden */
  hideActions?: boolean;
  /** When true the mode card row is hidden (used in form view where mode is pre-selected) */
  hideModeCards?: boolean;
}

function TypePickerHome({
  qrMode,
  onSetMode,
  onOpenCustom,
  hideActions = false,
  hideModeCards = false,
}: Props) {
  const { colors } = useTheme();
  const { width }  = useWindowDimensions();
  const PAD = 20;

  function pressMode(mode: QrMode) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSetMode(mode);
  }

  return (
    <View style={[styles.root, { paddingHorizontal: PAD }]}>
      {/* ── Mode cards (hidden in form view since mode is pre-selected) ── */}
      {!hideModeCards && (
        <Reanimated.View entering={FadeIn.duration(300)} style={styles.modeRow}>
          {MODES.map((m) => {
            const active = qrMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => pressMode(m.key)}
                style={({ pressed }) => [
                  styles.modeCard,
                  {
                    backgroundColor: active ? m.color + "18" : colors.surface,
                    borderColor:     active ? m.color + "80" : colors.surfaceBorder,
                    borderWidth:     active ? 1.5 : 1,
                    opacity:         pressed ? 0.76 : 1,
                    transform:       [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <View style={[styles.modeIconWrap, { backgroundColor: m.color + (active ? "28" : "16") }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <Text style={[styles.modeLabel, { color: active ? m.color : colors.text }]} numberOfLines={1}>
                  {m.label}
                </Text>
                {active && (
                  <View style={[styles.activeBar, { backgroundColor: m.color }]} />
                )}
              </Pressable>
            );
          })}
        </Reanimated.View>
      )}

      {/* ── Actions: Choose Template card ── */}
      {!hideActions && (
        <Reanimated.View entering={FadeInUp.duration(300).delay(80)} style={{ marginTop: 12 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onOpenCustom();
            }}
            style={({ pressed }) => ({
              opacity:      pressed ? 0.82 : 1,
              transform:    [{ scale: pressed ? 0.98 : 1 }],
              borderRadius: 16,
              overflow:     "hidden" as const,
            })}
          >
            <LinearGradient
              colors={[colors.primary + "22", colors.primary + "08"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.customCard, { borderColor: colors.primary + "40" }]}
            >
              <View style={[styles.customCardIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="grid-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.customCardTitle, { color: colors.text }]}>Choose Template</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </LinearGradient>
          </Pressable>
        </Reanimated.View>
      )}
    </View>
  );
}

export default memo(TypePickerHome);

const styles = StyleSheet.create({
  root: { gap: 12, paddingTop: 8 },

  modeRow: { flexDirection: "row", gap: 8 },
  modeCard: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    position: "relative",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  modeIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  modeLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  activeBar: {
    position: "absolute", bottom: 0,
    left: "20%", right: "20%",
    height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },

  customCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  customCardIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  customCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
});
