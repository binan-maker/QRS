import React, { memo } from "react";
import {
  View, Text, Pressable, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

type QrMode = "individual" | "private";

interface ModeCard {
  key: QrMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MODES: ModeCard[] = [
  { key: "individual", label: "Standard", icon: "shield-checkmark-outline", color: "#3B82F6" },
  { key: "private",   label: "Private",   icon: "eye-off-outline",           color: "#64748B" },
];

interface Props {
  qrMode: QrMode;
  onSetMode: (mode: QrMode) => void;
  onOpenCustom: () => void;
  hideActions?: boolean;
  hideModeCards?: boolean;
}

function TypePickerHome({ qrMode, onSetMode, onOpenCustom, hideActions = false, hideModeCards = false }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { paddingHorizontal: 20 }]}>
      {!hideModeCards && (
        <Reanimated.View entering={FadeIn.delay(40).duration(220)} style={styles.modeRow}>
          {MODES.map((m) => {
            const active = qrMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSetMode(m.key); }}
                style={({ pressed }) => [
                  styles.modeCard,
                  {
                    backgroundColor: active ? m.color + "18" : colors.surface,
                    borderColor:     active ? m.color + "70" : colors.surfaceBorder,
                    borderWidth:     active ? 1.5 : 1,
                    opacity:         pressed ? 0.76 : 1,
                    transform:       [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <View style={[styles.modeIconWrap, { backgroundColor: m.color + (active ? "28" : "14") }]}>
                  <Ionicons name={m.icon} size={17} color={m.color} />
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

      {!hideActions && (
        <Reanimated.View entering={FadeInUp.delay(40).duration(260)} style={{ marginTop: hideModeCards ? 0 : 10 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onOpenCustom(); }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.82 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
              borderRadius: 14,
              overflow: "hidden" as const,
            })}
          >
            <LinearGradient
              colors={[colors.primary + "1A", colors.primary + "08"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.customCard, { borderColor: colors.primary + "35" }]}
            >
              <View style={[styles.customCardIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="grid-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customCardTitle, { color: colors.text }]}>Choose Template</Text>
                <Text style={[styles.customCardSub, { color: colors.textMuted }]}>UPI, Contact, WiFi, Email, URL</Text>
              </View>
              <View style={[styles.arrowWrap, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </View>
            </LinearGradient>
          </Pressable>
        </Reanimated.View>
      )}
    </View>
  );
}

export default memo(TypePickerHome);

const styles = StyleSheet.create({
  root: { gap: 10, paddingTop: 6 },

  modeRow: { flexDirection: "row", gap: 8 },
  modeCard: {
    flex: 1, height: 62, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    gap: 5, position: "relative", overflow: "hidden",
    paddingHorizontal: 8, paddingVertical: 8,
  },
  modeIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  modeLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
  activeBar: {
    position: "absolute", bottom: 0,
    left: "20%", right: "20%",
    height: 2.5, borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },

  customCard: {
    flexDirection: "row", alignItems: "center", gap: 11,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  customCardIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  customCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  customCardSub:   { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  arrowWrap: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
});
