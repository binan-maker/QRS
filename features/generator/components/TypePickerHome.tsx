import React, { memo } from "react";
import {
  View, Text, Pressable, StyleSheet, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

interface Tile {
  presetIdx: number;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const TILES: Tile[] = [
  { presetIdx: 1, label: "Link",     sub: "Website or URL",   icon: "link-outline",       color: "#3B82F6" },
  { presetIdx: 5, label: "Chat",     sub: "WhatsApp message", icon: "chatbubble-ellipses-outline", color: "#22C55E" },
  { presetIdx: 6, label: "WiFi",     sub: "Share password",   icon: "wifi-outline",        color: "#F59E0B" },
  { presetIdx: 9, label: "Contact",  sub: "Business card",    icon: "person-outline",      color: "#8B5CF6" },
];

interface Props {
  onSelectPreset: (idx: number) => void;
  onOpenTemplates: () => void;
  onOpenCustom: () => void;
}

function TypePickerHome({ onSelectPreset, onOpenTemplates, onOpenCustom }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const pad = 24;
  const gap = 12;
  const tileSize = (width - pad * 2 - gap) / 2;

  function pick(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectPreset(idx);
  }

  return (
    <View style={[styles.root, { paddingHorizontal: pad }]}>
      {/* 2×2 tile grid */}
      <Reanimated.View entering={FadeIn.duration(320)} style={styles.grid}>
        {TILES.map((t, i) => (
          <Pressable
            key={t.presetIdx}
            onPress={() => pick(t.presetIdx)}
            style={({ pressed }) => [
              styles.tile,
              {
                width: tileSize,
                height: tileSize,
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.78 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <View style={[styles.tileIconRing, { backgroundColor: t.color + "18" }]}>
              <Ionicons name={t.icon} size={26} color={t.color} />
            </View>
            <Text style={[styles.tileLabel, { color: colors.text }]}>{t.label}</Text>
            <Text style={[styles.tileSub, { color: colors.textMuted }]}>{t.sub}</Text>
          </Pressable>
        ))}
      </Reanimated.View>

      {/* Custom builder */}
      <Reanimated.View entering={FadeInUp.duration(300).delay(120)}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenCustom();
          }}
          style={({ pressed }) => [
            styles.customRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <View style={[styles.customIconBox, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customLabel, { color: colors.text }]}>Custom QR</Text>
            <Text style={[styles.customSub, { color: colors.textMuted }]}>Build with your own fields</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </Reanimated.View>

      {/* More link */}
      <Reanimated.View entering={FadeInUp.duration(280).delay(180)}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenTemplates();
          }}
          style={({ pressed }) => [styles.moreRow, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Ionicons name="apps-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.moreText, { color: colors.textMuted }]}>Browse all 28 types</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
        </Pressable>
      </Reanimated.View>
    </View>
  );
}

export default memo(TypePickerHome);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", gap: 14 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 4,
  },
  tileIconRing: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tileSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  customIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  customLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  customSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  moreText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
